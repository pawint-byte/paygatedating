import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { 
  GATE_COSTS, 
  SKIP_AHEAD_COST, 
  insertProfileSchema, 
  insertMatchSchema,
  insertMessageSchema,
  insertRegistryItemSchema,
  MINIMUM_WALLET_BALANCE,
  TRIAL_CREDITS_AMOUNT,
  REFERRAL_BONUS_AMOUNT,
  GIFT_MINIMUM_VALUE,
  GIFT_PLATFORM_FEE_PERCENT,
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const depositSchema = z.object({
  amount: z.number().min(MINIMUM_WALLET_BALANCE, `Minimum deposit is $${MINIMUM_WALLET_BALANCE}`),
});

const createMatchSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  message: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const existingProfile = await storage.getProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const validationResult = insertProfileSchema.safeParse({
        ...req.body,
        userId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const profile = await storage.createProfile(validationResult.data);
      
      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        const referredBy = req.body.referralCode || null;
        wallet = await storage.createWallet({ userId, referredBy });
      }

      if (!wallet.trialCreditsReceived) {
        const newBalance = (parseFloat(wallet.balance) + TRIAL_CREDITS_AMOUNT).toFixed(2);
        await storage.updateWalletBalance(userId, newBalance);
        await storage.markTrialCreditsReceived(userId);
        
        await storage.createTransaction({
          walletId: wallet.id,
          amount: TRIAL_CREDITS_AMOUNT.toFixed(2),
          type: "trial_bonus",
          description: `Welcome bonus: $${TRIAL_CREDITS_AMOUNT} free credits!`,
        });

        if (wallet.referredBy) {
          const referrerWallet = await storage.getWalletByReferralCode(wallet.referredBy);
          if (referrerWallet && referrerWallet.userId !== userId) {
            const referral = await storage.createReferral({
              referrerUserId: referrerWallet.userId,
              referredUserId: userId,
            });
            
            const referrerNewBalance = (parseFloat(referrerWallet.balance) + REFERRAL_BONUS_AMOUNT).toFixed(2);
            await storage.updateWalletBalance(referrerWallet.userId, referrerNewBalance);
            
            await storage.createTransaction({
              walletId: referrerWallet.id,
              amount: REFERRAL_BONUS_AMOUNT.toFixed(2),
              type: "referral_bonus",
              description: `Referral bonus for inviting a friend`,
            });

            await storage.markReferralBonusPaid(referral.id);
          }
        }
      }

      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const partialSchema = insertProfileSchema.partial().omit({ userId: true });
      const validationResult = partialSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const profile = await storage.updateProfile(userId, validationResult.data);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/profiles/discover", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profiles = await storage.getDiscoverProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching discover profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get("/api/wallet", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        wallet = await storage.createWallet({ userId });
      }
      
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  app.get("/api/wallet/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        return res.json([]);
      }
      
      const transactions = await storage.getTransactions(wallet.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/wallet/deposit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const validationResult = depositSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid deposit amount",
        });
      }

      const { amount } = validationResult.data;

      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        wallet = await storage.createWallet({ userId });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Add $${amount} to PayGate Wallet`,
                description: 'Wallet credits for PayGate Dating',
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/wallet?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/wallet?canceled=true`,
        metadata: {
          type: 'wallet_funding',
          userId: userId,
          amount: amount.toString(),
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create payment session" });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Error getting Stripe key:", error);
      res.status(500).json({ message: "Failed to get payment configuration" });
    }
  });

  app.post("/api/wallet/verify-payment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      if (session.metadata?.type !== 'wallet_funding') {
        return res.status(400).json({ message: "Invalid session type" });
      }

      if (session.metadata?.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const amount = parseInt(session.metadata.amount, 10);
      let wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        wallet = await storage.createWallet({ userId });
      }

      const newBalance = (parseFloat(wallet.balance) + amount).toFixed(2);
      const updatedWallet = await storage.updateWalletBalance(userId, newBalance);

      await storage.createTransaction({
        walletId: wallet.id,
        amount: amount.toFixed(2),
        type: "deposit",
        description: `Added $${amount} via Stripe`,
      });

      res.json({ success: true, wallet: updatedWallet });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.get("/api/matches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matches = await storage.getMatchesByUser(userId);

      const matchesWithProfiles = await Promise.all(
        matches.map(async (match) => {
          const otherUserId = match.initiatorId === userId ? match.recipientId : match.initiatorId;
          const otherProfile = await storage.getProfile(otherUserId);
          return {
            ...match,
            otherProfile,
          };
        })
      );

      res.json(matchesWithProfiles.filter((m) => m.otherProfile));
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const validationResult = createMatchSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid match data",
        });
      }

      const { recipientId, message } = validationResult.data;

      const profile = await storage.getProfile(userId);
      if (!profile || profile.subscriptionTier !== "premium") {
        return res.status(403).json({ message: "Premium subscription required to send interest" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet || parseFloat(wallet.balance) < GATE_COSTS.gate1) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const newBalance = (parseFloat(wallet.balance) - GATE_COSTS.gate1).toFixed(2);
      await storage.updateWalletBalance(userId, newBalance);

      await storage.createTransaction({
        walletId: wallet.id,
        amount: (-GATE_COSTS.gate1).toFixed(2),
        type: "gate_payment",
        description: "Gate 1: Interest request sent",
      });

      const match = await storage.createMatch({
        initiatorId: userId,
        recipientId,
        message,
        lastActionBy: userId,
      });

      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.post("/api/matches/:id/advance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.initiatorId !== userId && match.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (match.currentGate === "completed") {
        return res.status(400).json({ message: "Match already completed" });
      }

      const gateNum = parseInt(match.currentGate.replace("gate", ""));
      const isInitiator = match.initiatorId === userId;
      
      const isMyTurn = isInitiator ? gateNum % 2 === 1 : gateNum % 2 === 0;

      if (!isMyTurn) {
        return res.status(400).json({ message: "Not your turn to advance the gate" });
      }

      const cost = GATE_COSTS[match.currentGate as keyof typeof GATE_COSTS];
      const wallet = await storage.getWallet(userId);
      
      if (!wallet || parseFloat(wallet.balance) < cost) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const newBalance = (parseFloat(wallet.balance) - cost).toFixed(2);
      await storage.updateWalletBalance(userId, newBalance);

      await storage.createTransaction({
        walletId: wallet.id,
        amount: (-cost).toFixed(2),
        type: "gate_payment",
        description: `Gate ${gateNum}: Payment`,
        relatedMatchId: matchId,
      });

      const nextGate = gateNum >= 5 ? "completed" : `gate${gateNum + 1}`;
      const updatedMatch = await storage.updateMatch(matchId, {
        currentGate: nextGate as any,
        status: gateNum === 1 ? "active" : match.status,
        lastActionBy: userId,
      });

      res.json(updatedMatch);
    } catch (error) {
      console.error("Error advancing gate:", error);
      res.status(500).json({ message: "Failed to advance gate" });
    }
  });

  app.post("/api/matches/:id/skip", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.initiatorId !== userId && match.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (match.currentGate === "completed") {
        return res.status(400).json({ message: "Match already completed" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet || parseFloat(wallet.balance) < SKIP_AHEAD_COST) {
        return res.status(400).json({ message: "Insufficient wallet balance for skip" });
      }

      const newBalance = (parseFloat(wallet.balance) - SKIP_AHEAD_COST).toFixed(2);
      await storage.updateWalletBalance(userId, newBalance);

      await storage.createTransaction({
        walletId: wallet.id,
        amount: (-SKIP_AHEAD_COST).toFixed(2),
        type: "gate_payment",
        description: "Skip ahead: All gates unlocked",
        relatedMatchId: matchId,
      });

      const updatedMatch = await storage.updateMatch(matchId, {
        currentGate: "completed",
        status: "completed",
        skipPaid: true,
        lastActionBy: userId,
      });

      res.json(updatedMatch);
    } catch (error) {
      console.error("Error skipping ahead:", error);
      res.status(500).json({ message: "Failed to skip ahead" });
    }
  });

  app.get("/api/matches/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.initiatorId !== userId && match.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const validGates = ["gate3", "gate4", "gate5", "completed"];
      if (!validGates.includes(match.currentGate)) {
        return res.status(403).json({ message: "Chat unlocked at Gate 3 or higher" });
      }

      const messages = await storage.getMessages(matchId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/matches/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.initiatorId !== userId && match.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const validGates = ["gate3", "gate4", "gate5", "completed"];
      if (!validGates.includes(match.currentGate)) {
        return res.status(403).json({ message: "Chat unlocked at Gate 3 or higher" });
      }

      const messageSchema = z.object({
        content: z.string().min(1, "Message content is required").max(2000),
        mediaUrl: z.string().url().optional(),
      });

      const validationResult = messageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid message data",
        });
      }

      const message = await storage.createMessage({
        matchId,
        senderId: userId,
        content: validationResult.data.content,
        mediaUrl: validationResult.data.mediaUrl,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/referral", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const referrals = await storage.getReferralsByReferrer(userId);
      
      res.json({
        referralCode: wallet.referralCode,
        totalReferrals: referrals.length,
        bonusEarned: referrals.filter(r => r.bonusPaid).length * REFERRAL_BONUS_AMOUNT,
        referrals: referrals.map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          bonusPaid: r.bonusPaid,
        })),
      });
    } catch (error) {
      console.error("Error fetching referral info:", error);
      res.status(500).json({ message: "Failed to fetch referral info" });
    }
  });

  app.get("/api/referral/validate/:code", async (req: any, res) => {
    try {
      const code = req.params.code;
      const wallet = await storage.getWalletByReferralCode(code);
      
      res.json({ valid: !!wallet });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  app.get("/api/registry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getRegistryItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching registry:", error);
      res.status(500).json({ message: "Failed to fetch registry" });
    }
  });

  app.get("/api/registry/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const viewerId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      
      const items = await storage.getRegistryItems(targetUserId);
      
      const existingMatch = (await storage.getMatchesByUser(viewerId))
        .find(m => m.initiatorId === targetUserId || m.recipientId === targetUserId);
      
      const filteredItems = items.filter(item => {
        if (item.visibility === "public") return true;
        if (item.visibility === "matches_only" && existingMatch) return true;
        if (item.visibility === "after_gate1" && existingMatch && existingMatch.currentGate !== "gate1") return true;
        return false;
      });
      
      res.json(filteredItems.filter(item => !item.isPurchased));
    } catch (error) {
      console.error("Error fetching user registry:", error);
      res.status(500).json({ message: "Failed to fetch registry" });
    }
  });

  function addAffiliateTag(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Amazon affiliate tagging
      const amazonTag = process.env.AMAZON_ASSOCIATE_TAG;
      if (amazonTag && (urlObj.hostname.includes('amazon.com') || urlObj.hostname.includes('amzn.to') || urlObj.hostname.includes('amzn.com'))) {
        urlObj.searchParams.set('tag', amazonTag);
        return urlObj.toString();
      }
      
      // Etsy via Awin affiliate network
      const awinPublisherId = process.env.AWIN_PUBLISHER_ID;
      if (awinPublisherId && urlObj.hostname.includes('etsy.com')) {
        const etsyMerchantId = '6220'; // Etsy's Awin merchant ID
        const encodedUrl = encodeURIComponent(url);
        return `https://www.awin1.com/cread.php?awinmid=${etsyMerchantId}&awinaffid=${awinPublisherId}&ued=${encodedUrl}`;
      }
      
    } catch (e) {
      // Invalid URL, return as-is
    }
    return url;
  }

  app.post("/api/registry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      let affiliateUrl = req.body.affiliateUrl;
      if (affiliateUrl) {
        affiliateUrl = addAffiliateTag(affiliateUrl);
      }
      
      const validationResult = insertRegistryItemSchema.safeParse({
        ...req.body,
        affiliateUrl,
        userId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid registry item data",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const item = await storage.createRegistryItem(validationResult.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating registry item:", error);
      res.status(500).json({ message: "Failed to create registry item" });
    }
  });

  app.delete("/api/registry/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.id;
      
      const item = await storage.getRegistryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (item.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.deleteRegistryItem(itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting registry item:", error);
      res.status(500).json({ message: "Failed to delete registry item" });
    }
  });

  app.post("/api/gifts/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const buyerUserId = req.user.claims.sub;
      const { registryItemId, recipientUserId, matchId } = req.body;

      if (!registryItemId || !recipientUserId) {
        return res.status(400).json({ message: "Registry item and recipient are required" });
      }

      if (buyerUserId === recipientUserId) {
        return res.status(400).json({ message: "Cannot purchase gifts for yourself" });
      }

      const item = await storage.getRegistryItem(registryItemId);
      if (!item) {
        return res.status(404).json({ message: "Registry item not found" });
      }

      if (item.userId !== recipientUserId) {
        return res.status(400).json({ message: "This item does not belong to the recipient" });
      }

      if (item.isPurchased) {
        return res.status(400).json({ message: "This item has already been purchased" });
      }

      const giftValue = parseFloat(item.price);
      if (giftValue < GIFT_MINIMUM_VALUE) {
        return res.status(400).json({ message: `Minimum gift value is $${GIFT_MINIMUM_VALUE}` });
      }

      if (matchId) {
        const match = await storage.getMatch(matchId);
        if (!match) {
          return res.status(404).json({ message: "Match not found" });
        }
        if (match.initiatorId !== buyerUserId && match.recipientId !== buyerUserId) {
          return res.status(403).json({ message: "Not authorized for this match" });
        }
        if ((match.initiatorId !== recipientUserId && match.recipientId !== recipientUserId)) {
          return res.status(400).json({ message: "Recipient is not part of this match" });
        }
      }

      const platformFee = (giftValue * GIFT_PLATFORM_FEE_PERCENT / 100).toFixed(2);
      
      let gatesUnlocked = 0;
      if (giftValue >= 100) gatesUnlocked = 3;
      else if (giftValue >= 50) gatesUnlocked = 2;
      else if (giftValue >= 25) gatesUnlocked = 1;

      const claimDeadline = new Date();
      claimDeadline.setDate(claimDeadline.getDate() + 14);

      const purchase = await storage.createGiftPurchase({
        buyerUserId,
        recipientUserId,
        registryItemId,
        matchId: matchId || null,
        giftValue: giftValue.toFixed(2),
        platformFee,
        claimDeadline,
      });

      await storage.updateRegistryItem(registryItemId, { isPurchased: true });

      if (matchId) {
        const match = await storage.getMatch(matchId);
        if (match && gatesUnlocked > 0 && match.currentGate !== "completed") {
          const gateOrder = ["gate1", "gate2", "gate3", "gate4", "gate5", "completed"];
          const currentIndex = gateOrder.indexOf(match.currentGate);
          
          if (currentIndex >= 0) {
            const newIndex = Math.min(currentIndex + gatesUnlocked, gateOrder.length - 1);
            const newGate = gateOrder[newIndex];
            
            await storage.updateMatch(matchId, {
              currentGate: newGate as any,
              status: "active",
            });

            await storage.updateGiftPurchase(purchase.id, { gatesUnlocked });
          }
        }
      }

      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error purchasing gift:", error);
      res.status(500).json({ message: "Failed to purchase gift" });
    }
  });

  app.get("/api/gifts/sent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getGiftPurchasesByBuyer(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching sent gifts:", error);
      res.status(500).json({ message: "Failed to fetch sent gifts" });
    }
  });

  app.get("/api/gifts/received", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getGiftPurchasesByRecipient(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching received gifts:", error);
      res.status(500).json({ message: "Failed to fetch received gifts" });
    }
  });

  app.post("/api/gifts/:id/claim", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const giftId = req.params.id;

      const purchase = await storage.getGiftPurchase(giftId);
      if (!purchase) {
        return res.status(404).json({ message: "Gift not found" });
      }

      if (purchase.recipientUserId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (purchase.status !== "delivered" && purchase.status !== "shipped") {
        return res.status(400).json({ message: "Gift cannot be claimed yet" });
      }

      const updatedPurchase = await storage.updateGiftPurchase(giftId, { status: "claimed" });
      res.json(updatedPurchase);
    } catch (error) {
      console.error("Error claiming gift:", error);
      res.status(500).json({ message: "Failed to claim gift" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.json({ 
          reply: "Thank you for your interest in PayGate Dating! Our AI assistant is currently being set up. In the meantime, you can sign up now and get $15 in free credits to start making meaningful connections!" 
        });
      }

      const openai = new OpenAI({ apiKey: openaiApiKey });

      const systemPrompt = `You are a friendly and helpful assistant for PayGate Dating, a premium dating platform that uses a unique 5-gate progression system.

Key information about PayGate Dating:
- Users pay incremental fees ($5-$20) at each interaction stage, filtering out low-effort interactions
- New users get $15 in FREE credits when they sign up
- The referral program gives $5 for each friend who joins
- Users can create Items of Interest wishlists for gifts from matches
- Premium subscription is $9.99/month or $99/year for enhanced features
- The platform is designed for serious relationship seekers aged 25-45

Your goals:
1. Answer questions about the platform helpfully and accurately
2. Promote sign-up by highlighting the $15 free credits and referral bonuses
3. Explain the 5-gate system (Gate 1: Initial Interest, Gate 2: Getting to Know, Gate 3: Deeper Connection, Gate 4: Exclusive Chat, Gate 5: Real World)
4. Be warm, encouraging, and professional
5. Keep responses concise (2-3 sentences max unless explaining something complex)

Always encourage visitors to sign up and try the platform!`;

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 200,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again!";

      res.json({ reply });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.json({ 
        reply: "I'm having a moment! While I get back on track, why not sign up and claim your $15 in free credits? It's the perfect way to start your PayGate Dating journey!" 
      });
    }
  });

  let stripeAvailable = false;
  try {
    await getUncachableStripeClient();
    stripeAvailable = true;
  } catch (e) {
    console.log('Stripe not configured, subscription features disabled');
  }

  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);
      res.json(subscription || null);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/subscription/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripeAvailable) {
        return res.status(503).json({ message: "Payment system not configured" });
      }

      const stripe = await getUncachableStripeClient();
      const userId = req.user.claims.sub;
      const { priceType } = req.body;
      
      if (!priceType || !["monthly", "yearly"].includes(priceType)) {
        return res.status(400).json({ message: "Invalid price type" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      let subscription = await storage.getSubscription(userId);
      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId },
        });
        customerId = customer.id;

        if (!subscription) {
          subscription = await storage.createSubscription({
            userId,
            stripeCustomerId: customerId,
          });
        } else {
          await storage.updateSubscription(userId, { stripeCustomerId: customerId });
        }
      }

      const prices = await stripe.prices.list({
        lookup_keys: [priceType === "monthly" ? "premium_monthly" : "premium_yearly"],
        expand: ["data.product"],
      });

      let priceId = prices.data[0]?.id;

      if (!priceId) {
        const product = await stripe.products.create({
          name: "PayGate Premium",
          description: "Premium subscription with enhanced features",
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceType === "monthly" ? 999 : 9900,
          currency: "usd",
          recurring: { interval: priceType === "monthly" ? "month" : "year" },
          lookup_key: priceType === "monthly" ? "premium_monthly" : "premium_yearly",
        });
        priceId = price.id;
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
          : "http://localhost:5000";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/settings?subscription=success`,
        cancel_url: `${baseUrl}/settings?subscription=canceled`,
        metadata: { userId },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripeAvailable) {
        return res.status(503).json({ message: "Payment system not configured" });
      }

      const stripe = await getUncachableStripeClient();
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);

      if (!subscription?.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription" });
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await storage.updateSubscription(userId, { cancelAtPeriodEnd: true });

      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  return httpServer;
}
