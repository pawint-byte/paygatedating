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

      const newBalance = (parseFloat(wallet.balance) + amount).toFixed(2);
      const updatedWallet = await storage.updateWalletBalance(userId, newBalance);

      await storage.createTransaction({
        walletId: wallet.id,
        amount: amount.toFixed(2),
        type: "deposit",
        description: "Wallet deposit",
      });

      res.json(updatedWallet);
    } catch (error) {
      console.error("Error depositing funds:", error);
      res.status(500).json({ message: "Failed to deposit funds" });
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

  function addAmazonAffiliateTag(url: string): string {
    const amazonTag = process.env.AMAZON_ASSOCIATE_TAG;
    if (!amazonTag) return url;
    
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('amazon.com') || urlObj.hostname.includes('amzn.to') || urlObj.hostname.includes('amzn.com')) {
        urlObj.searchParams.set('tag', amazonTag);
        return urlObj.toString();
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
        affiliateUrl = addAmazonAffiliateTag(affiliateUrl);
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

  return httpServer;
}
