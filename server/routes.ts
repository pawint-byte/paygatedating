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
  insertFeedbackSchema,
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

  // Helper to estimate base64 data URL size in bytes
  const estimateBase64Size = (dataUrl: string): number => {
    // Extract base64 portion after the comma
    const base64 = dataUrl.split(",")[1];
    if (!base64) return 0;
    // Base64 encodes 3 bytes as 4 characters, so size ≈ length * 3/4
    return Math.ceil(base64.length * 0.75);
  };

  // Verification request schema
  const verificationSchema = z.object({
    verificationPhoto: z.string()
      .min(1, "Verification photo is required")
      .refine((val) => val.startsWith("data:image/") || val.startsWith("http"), 
        "Invalid image format - must be a data URL or HTTP URL")
      .refine((val) => {
        if (val.startsWith("data:image/")) {
          // For data URLs, estimate actual byte size
          return estimateBase64Size(val) < 5 * 1024 * 1024; // 5MB max
        }
        return true; // HTTP URLs don't need size check here
      }, "Image too large - maximum 5MB")
      .refine((val) => {
        if (val.startsWith("data:image/")) {
          // Check for valid image MIME types
          const mimeMatch = val.match(/^data:(image\/(jpeg|jpg|png|gif|webp));base64,/);
          return !!mimeMatch;
        }
        return true;
      }, "Invalid image type - must be JPEG, PNG, GIF, or WebP"),
  });

  // ID Verification endpoint - compares selfie to profile photos
  app.post("/api/profile/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate input with Zod
      const validationResult = verificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid verification data" 
        });
      }
      const { verificationPhoto } = validationResult.data;

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Check if already verified
      if (profile.verificationStatus === "verified") {
        return res.status(400).json({ message: "Profile is already verified" });
      }

      // Check attempt limit (max 5 attempts)
      if (profile.verificationAttempts >= 5) {
        return res.status(400).json({ 
          message: "Maximum verification attempts reached. Please contact support." 
        });
      }

      // Must have at least one profile photo to verify against
      if (!profile.photos || profile.photos.length === 0) {
        return res.status(400).json({ 
          message: "Please upload at least one profile photo before verification" 
        });
      }

      // Check if AI is configured
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        return res.status(503).json({ message: "Verification service not available" });
      }

      // Set pending status (don't increment attempts yet)
      await storage.updateProfile(userId, {
        verificationPhoto,
        verificationStatus: "pending",
      } as any);

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Use OpenAI Vision to compare the verification selfie with profile photos
      const profilePhotoUrl = profile.photos[0]; // Compare against first profile photo

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an identity verification assistant for a dating app. Your job is to compare a verification selfie with a profile photo and determine if they show the same person.

Analyze:
1. Facial structure (face shape, nose, eyes, mouth proportions)
2. Distinctive features (moles, dimples, ear shape)
3. Overall resemblance

Respond with a JSON object only:
{
  "match": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "brief explanation"
}

Be strict but fair - the photos may have different lighting, angles, or ages. Focus on core facial features that don't change easily.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Compare these two images. The first is the verification selfie, the second is the profile photo. Are they the same person?" },
              { type: "image_url", image_url: { url: verificationPhoto } },
              { type: "image_url", image_url: { url: profilePhotoUrl } },
            ],
          },
        ],
        max_tokens: 500,
      });

      const resultText = response.choices[0]?.message?.content || "";
      
      // Parse the JSON response
      let verificationResult;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          verificationResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse verification result:", resultText);
        // Revert status to none and increment attempts on parse failure
        const newAttemptCount = profile.verificationAttempts + 1;
        await storage.updateProfile(userId, {
          verificationStatus: "none",
          verificationRejectionReason: "Verification processing failed - please try again",
          verificationAttempts: newAttemptCount,
        } as any);
        return res.status(500).json({ 
          message: "Verification processing failed, please try again",
          attemptsRemaining: 5 - newAttemptCount,
        });
      }

      const isVerified = verificationResult.match === true && 
        (verificationResult.confidence === "high" || verificationResult.confidence === "medium");

      // Increment attempt count only after successful AI processing
      const newAttemptCount = profile.verificationAttempts + 1;

      if (isVerified) {
        await storage.updateProfile(userId, {
          verificationStatus: "verified",
          verifiedAt: new Date(),
          verificationRejectionReason: null,
          verificationAttempts: newAttemptCount,
        } as any);

        res.json({ 
          verified: true, 
          message: "Verification successful! Your profile now has a verified badge.",
          confidence: verificationResult.confidence,
        });
      } else {
        await storage.updateProfile(userId, {
          verificationStatus: "rejected",
          verificationRejectionReason: verificationResult.reason || "Photos do not appear to match",
          verificationAttempts: newAttemptCount,
        } as any);

        res.json({ 
          verified: false, 
          message: verificationResult.reason || "Verification failed. The photos don't appear to match.",
          attemptsRemaining: 5 - newAttemptCount,
        });
      }
    } catch (error) {
      console.error("Error during verification:", error);
      // Revert status on any error - don't leave in pending state
      try {
        const profile = await storage.getProfile(req.user.claims.sub);
        if (profile && profile.verificationStatus === "pending") {
          await storage.updateProfile(req.user.claims.sub, {
            verificationStatus: "none",
            verificationRejectionReason: "Verification service error - please try again",
          } as any);
        }
      } catch (revertError) {
        console.error("Failed to revert verification status:", revertError);
      }
      res.status(500).json({ message: "Verification failed, please try again" });
    }
  });

  // Get verification status
  app.get("/api/profile/verification-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json({
        status: profile.verificationStatus,
        verifiedAt: profile.verifiedAt,
        attemptsRemaining: 5 - profile.verificationAttempts,
        rejectionReason: profile.verificationRejectionReason,
      });
    } catch (error) {
      console.error("Error fetching verification status:", error);
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  app.get("/api/profiles/discover", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prefs = await storage.getSearchPreferences(userId);
      
      let profiles;
      if (prefs) {
        profiles = await storage.getFilteredProfiles(userId, prefs);
      } else {
        profiles = await storage.getDiscoverProfiles(userId);
      }
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching discover profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get("/api/search-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prefs = await storage.getSearchPreferences(userId);
      res.json(prefs || {
        minAge: 18,
        maxAge: 99,
        maxDistance: 100,
        genderPreference: [],
        interestsFilter: [],
      });
    } catch (error) {
      console.error("Error fetching search preferences:", error);
      res.status(500).json({ message: "Failed to fetch search preferences" });
    }
  });

  app.post("/api/search-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { minAge, maxAge, maxDistance, genderPreference, interestsFilter } = req.body;
      
      const prefs = await storage.upsertSearchPreferences({
        userId,
        minAge: minAge ?? 18,
        maxAge: maxAge ?? 99,
        maxDistance: maxDistance ?? 100,
        genderPreference: genderPreference ?? [],
        interestsFilter: interestsFilter ?? [],
      });
      
      res.json(prefs);
    } catch (error) {
      console.error("Error updating search preferences:", error);
      res.status(500).json({ message: "Failed to update search preferences" });
    }
  });

  app.patch("/api/profile/location", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude, city } = req.body;
      
      const profile = await storage.updateProfile(userId, {
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        city,
      });
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
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

      const existingTransaction = await storage.getTransactionByStripeSessionId(sessionId);
      if (existingTransaction) {
        return res.json({ success: true, message: "Payment already processed" });
      }

      const amount = parseFloat(session.metadata.amount);
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
        stripeSessionId: sessionId,
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
      
      const gatePaidByField = `gate${gateNum}PaidBy` as keyof typeof match;
      const updatedMatch = await storage.updateMatch(matchId, {
        currentGate: nextGate as any,
        status: gateNum === 1 ? "active" : match.status,
        lastActionBy: userId,
        [gatePaidByField]: userId,
      });

      // Create bidirectional connections when match becomes active (gate 1 paid)
      if (gateNum === 1) {
        try {
          await storage.createConnectionIfNotExists(match.initiatorId, match.recipientId, matchId);
          await storage.createConnectionIfNotExists(match.recipientId, match.initiatorId, matchId);
        } catch (connError) {
          // Log but don't fail gate advancement for connection creation issues
          console.error("Error creating connections:", connError);
        }
      }

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

      // Create bidirectional connections when skipping ahead
      try {
        await storage.createConnectionIfNotExists(match.initiatorId, match.recipientId, matchId);
        await storage.createConnectionIfNotExists(match.recipientId, match.initiatorId, matchId);
      } catch (connError) {
        // Log but don't fail skip for connection creation issues
        console.error("Error creating connections:", connError);
      }

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

  // Public invite page - shows limited profile info for sharing
  app.get("/api/invite/:referralCode", async (req: any, res) => {
    try {
      const code = req.params.referralCode;
      const wallet = await storage.getWalletByReferralCode(code);
      
      if (!wallet) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const profile = await storage.getProfile(wallet.userId);
      
      if (!profile || !profile.isVisible) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Return only public-safe information
      const publicProfile = {
        displayName: profile.showFirstNamePublicly ? profile.displayName : "PayGate User",
        age: profile.showAgePublicly ? profile.age : undefined,
        location: profile.showLocationPublicly ? profile.location : undefined,
        city: profile.showLocationPublicly ? profile.city : undefined,
        bio: profile.bio ? profile.bio.substring(0, 200) : undefined,
        tagline: profile.tagline,
        photos: profile.showPhotoPublicly && profile.photos ? [profile.photos[0]] : undefined,
        verificationStatus: profile.verificationStatus,
        interests: profile.showInterestsPublicly ? profile.interests?.slice(0, 5) : undefined,
        referralCode: code,
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Error fetching invite profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // =================
  // NEARBY LIVE FEATURE
  // =================
  
  // Get live profiles near user
  app.get("/api/nearby", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseFloat(req.query.radius as string) || 10; // Default 10km
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Valid latitude and longitude required" });
      }
      
      const nearbyProfiles = await storage.getLiveProfiles(userId, lat, lng, radius);
      
      // Fuzz locations for privacy (round to ~500m)
      const fuzzedProfiles = nearbyProfiles.map(profile => ({
        ...profile,
        latitude: profile.latitude ? (Math.round(parseFloat(profile.latitude) * 200) / 200).toString() : null,
        longitude: profile.longitude ? (Math.round(parseFloat(profile.longitude) * 200) / 200).toString() : null,
      }));
      
      res.json(fuzzedProfiles);
    } catch (error) {
      console.error("Error fetching nearby profiles:", error);
      res.status(500).json({ message: "Failed to fetch nearby profiles" });
    }
  });
  
  // Update live status
  app.post("/api/nearby/live", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isLive, latitude, longitude } = req.body;
      
      const updated = await storage.updateLiveStatus(
        userId, 
        isLive, 
        latitude ? parseFloat(latitude) : undefined, 
        longitude ? parseFloat(longitude) : undefined
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating live status:", error);
      res.status(500).json({ message: "Failed to update live status" });
    }
  });

  // =================
  // CONNECTIONS (FRIENDS-OF-FRIENDS)
  // =================
  
  // Get user's connections
  app.get("/api/connections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await storage.getConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });
  
  // Get mutual connections with another user
  app.get("/api/connections/mutual/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const otherUserId = req.params.userId;
      const mutualConnections = await storage.getMutualConnections(userId, otherUserId);
      res.json(mutualConnections);
    } catch (error) {
      console.error("Error fetching mutual connections:", error);
      res.status(500).json({ message: "Failed to fetch mutual connections" });
    }
  });
  
  // Batch get mutual connection counts for multiple users (GET with query params)
  app.get("/api/connections/mutual-counts/:userIds", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userIdsParam = req.params.userIds;
      
      // Validate and parse comma-separated user IDs (max 50 for performance)
      if (!userIdsParam || typeof userIdsParam !== "string") {
        return res.status(400).json({ message: "userIds parameter is required" });
      }
      
      const userIds = userIdsParam.split(",").filter(id => id.length > 0).slice(0, 50);
      
      if (userIds.length === 0) {
        return res.json({});
      }
      
      const counts: Record<string, number> = {};
      for (const otherUserId of userIds) {
        const mutualConnections = await storage.getMutualConnections(userId, otherUserId);
        counts[otherUserId] = mutualConnections.length;
      }
      
      res.json(counts);
    } catch (error) {
      console.error("Error fetching mutual connection counts:", error);
      res.status(500).json({ message: "Failed to fetch mutual connection counts" });
    }
  });
  
  // Get friends-of-friends (2nd degree connections)
  app.get("/api/connections/friends-of-friends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fof = await storage.getFriendsOfFriends(userId);
      res.json(fof);
    } catch (error) {
      console.error("Error fetching friends of friends:", error);
      res.status(500).json({ message: "Failed to fetch friends of friends" });
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

  function isValidAffiliateUrl(url: string | undefined | null): { valid: boolean; error?: string } {
    if (!url || url.trim() === '') {
      return { valid: false, error: "Product URL is required" };
    }
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const isAmazon = hostname.includes('amazon.com') || hostname.includes('amzn.to') || hostname.includes('amzn.com');
      const isEtsy = hostname.includes('etsy.com');
      
      if (!isAmazon && !isEtsy) {
        return { valid: false, error: "Only Amazon and Etsy links are supported for wishlist items" };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

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
      
      // Validate URL is from supported affiliate partner
      const urlValidation = isValidAffiliateUrl(affiliateUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ 
          message: urlValidation.error,
        });
      }
      
      // Add affiliate tags
      affiliateUrl = addAffiliateTag(affiliateUrl);
      
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

  app.post("/api/gifts/checkout", isAuthenticated, async (req: any, res) => {
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

      if (item.isPurchased || item.isReserved) {
        return res.status(400).json({ message: "This item is no longer available" });
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

      const platformFee = giftValue * GIFT_PLATFORM_FEE_PERCENT / 100;
      const totalCharge = giftValue + platformFee;
      
      await storage.updateRegistryItem(registryItemId, { isReserved: true });

      const stripe = await getUncachableStripeClient();
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Gift: ${item.title}`,
                description: `Gift for your match (includes ${GIFT_PLATFORM_FEE_PERCENT}% service fee)`,
              },
              unit_amount: Math.round(totalCharge * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: 'gift_purchase',
          registryItemId,
          recipientUserId,
          buyerUserId,
          matchId: matchId || '',
          giftValue: giftValue.toFixed(2),
          platformFee: platformFee.toFixed(2),
        },
        success_url: `${baseUrl}/gift-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/gift-cancel?item_id=${registryItemId}`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating gift checkout:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get("/api/gifts/checkout/success", isAuthenticated, async (req: any, res) => {
    try {
      const { session_id } = req.query;
      const buyerUserId = req.user.claims.sub;

      if (!session_id) {
        return res.status(400).json({ message: "Session ID required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id as string);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      if (session.metadata?.buyerUserId !== buyerUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (session.metadata?.type !== 'gift_purchase') {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const existingPurchase = await storage.getGiftPurchaseBySessionId(session_id as string);
      if (existingPurchase) {
        const item = await storage.getRegistryItem(existingPurchase.registryItemId);
        return res.json({ 
          purchase: existingPurchase,
          affiliateUrl: item?.affiliateUrl,
          itemTitle: item?.title,
        });
      }

      const { registryItemId, recipientUserId, matchId, giftValue, platformFee } = session.metadata;

      let gatesUnlocked = 0;
      const giftValueNum = parseFloat(giftValue);
      if (giftValueNum >= 100) gatesUnlocked = 3;
      else if (giftValueNum >= 50) gatesUnlocked = 2;
      else if (giftValueNum >= 25) gatesUnlocked = 1;

      const claimDeadline = new Date();
      claimDeadline.setDate(claimDeadline.getDate() + 14);

      const purchase = await storage.createGiftPurchase({
        buyerUserId,
        recipientUserId,
        registryItemId,
        matchId: matchId || null,
        giftValue,
        platformFee,
        claimDeadline,
        stripeSessionId: session_id as string,
      });

      await storage.updateRegistryItem(registryItemId, { isPurchased: true, isReserved: false });
      await storage.updateGiftPurchase(purchase.id, { status: 'purchased', gatesUnlocked });

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
          }
        }
      }

      const item = await storage.getRegistryItem(registryItemId);
      res.json({ 
        purchase,
        affiliateUrl: item?.affiliateUrl,
        itemTitle: item?.title,
        gatesUnlocked,
      });
    } catch (error) {
      console.error("Error processing gift checkout success:", error);
      res.status(500).json({ message: "Failed to process gift purchase" });
    }
  });

  app.post("/api/gifts/checkout/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ message: "Item ID required" });
      }

      const item = await storage.getRegistryItem(itemId);
      if (item && item.isReserved && !item.isPurchased) {
        await storage.updateRegistryItem(itemId, { isReserved: false });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling gift checkout:", error);
      res.status(500).json({ message: "Failed to cancel checkout" });
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
        success_url: `${baseUrl}/subscription/success`,
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

  const aiClient = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.get("/api/profile/completeness", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      const registryItems = await storage.getRegistryItems(userId);

      const completeness = {
        hasProfile: !!profile,
        hasDisplayName: !!profile?.displayName,
        hasBio: !!(profile?.bio && profile.bio.length > 20),
        hasPhotos: !!(profile?.photos && profile.photos.length >= 1),
        hasInterests: !!(profile?.interests && profile.interests.length >= 3),
        hasLocation: !!profile?.location,
        hasAge: !!profile?.age,
        hasLookingFor: !!profile?.lookingFor,
        hasWishlistItems: registryItems.length >= 1,
        score: 0,
        suggestions: [] as string[],
      };

      let score = 0;
      if (completeness.hasProfile) score += 10;
      if (completeness.hasDisplayName) score += 10;
      if (completeness.hasBio) score += 15;
      if (completeness.hasPhotos) score += 20;
      if (completeness.hasInterests) score += 15;
      if (completeness.hasLocation) score += 10;
      if (completeness.hasAge) score += 5;
      if (completeness.hasLookingFor) score += 10;
      if (completeness.hasWishlistItems) score += 5;
      completeness.score = score;

      if (!completeness.hasPhotos) completeness.suggestions.push("Add at least one photo to your profile");
      if (!completeness.hasBio) completeness.suggestions.push("Write a bio that tells people about yourself");
      if (!completeness.hasInterests) completeness.suggestions.push("Add at least 3 interests to help find compatible matches");
      if (!completeness.hasLookingFor) completeness.suggestions.push("Specify what you're looking for in a partner");
      if (!completeness.hasWishlistItems) completeness.suggestions.push("Add gift ideas to your wishlist");

      res.json(completeness);
    } catch (error) {
      console.error("Error checking profile completeness:", error);
      res.status(500).json({ message: "Failed to check profile completeness" });
    }
  });

  const aiConfigured = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);

  app.post("/api/assistant/chat", isAuthenticated, async (req: any, res) => {
    try {
      if (!aiConfigured) {
        return res.status(503).json({ message: "AI assistant not configured" });
      }

      const userId = req.user.claims.sub;
      const { message, conversationHistory = [] } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const profile = await storage.getProfile(userId);
      const wallet = await storage.getWallet(userId);
      const registryItems = await storage.getRegistryItems(userId);
      const matches = await storage.getActiveMatches(userId);

      const profileContext = profile ? `
User Profile:
- Display Name: ${profile.displayName || 'Not set'}
- Age: ${profile.age || 'Not set'}
- Location: ${profile.location || 'Not set'}
- Bio: ${profile.bio || 'Not written'}
- Interests: ${profile.interests?.join(', ') || 'None added'}
- Looking For: ${profile.lookingFor || 'Not specified'}
- Photos: ${profile.photos?.length || 0} uploaded
- Wishlist Items: ${registryItems.length} items
` : 'User has no profile yet.';

      const walletContext = wallet ? `Wallet balance: $${wallet.balance}` : 'No wallet set up.';
      const matchContext = `Active matches: ${matches.length}`;

      const systemPrompt = `You are a friendly, supportive dating coach assistant for PayGate Dating, a premium dating app. Your role is to help users:

1. **Profile Setup**: Guide users to complete their profile with compelling photos, an engaging bio, and meaningful interests. Be specific about what makes profiles attractive.

2. **Gate System**: Explain PayGate's unique 5-gate progression system where users pay incrementally ($5-$20) to advance through interaction stages. This filters out low-effort matches and creates more meaningful connections.

3. **Wishlist/Registry**: Help users add items from Amazon or Etsy to their wishlist. Gifts from matches can unlock gates. Explain that only Amazon and Etsy links are allowed.

4. **Match Tips**: Provide conversation starters, dating advice, and tips for advancing through gates successfully.

5. **Wallet & Payments**: Explain how the wallet works, trial credits ($15 for new users), and referral bonuses ($5 per referral).

Current user context:
${profileContext}
${walletContext}
${matchContext}

Be encouraging but honest. Keep responses concise (2-4 sentences unless they ask for detailed help). Use their name if known. Never share explicit content or help with anything inappropriate.`;

      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        stream: true,
        max_tokens: 500,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in assistant chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Failed to process chat" });
      }
    }
  });

  // ===== FEEDBACK / SUPPORT ROUTES =====
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate with schema
      const feedbackValidation = insertFeedbackSchema.extend({
        subject: z.string().min(5, "Subject must be at least 5 characters").max(200, "Subject must be 200 characters or less"),
        message: z.string().min(20, "Please provide more details (at least 20 characters)"),
      }).safeParse({ ...req.body, userId });
      
      if (!feedbackValidation.success) {
        return res.status(400).json({ message: feedbackValidation.error.errors[0]?.message || "Invalid feedback data" });
      }

      const newFeedback = await storage.createFeedback(feedbackValidation.data);

      res.status(201).json(newFeedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedbackList = await storage.getFeedbackByUser(userId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // ===== ADMIN ROUTES =====
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const adminStatus = await storage.isUserAdmin(userId);
      if (!adminStatus) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  app.get("/api/admin/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isAdmin = await storage.isUserAdmin(userId);
      res.json({ isAdmin });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  app.get("/api/admin/feedback", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allFeedback = await storage.getAllFeedback();
      res.json(allFeedback);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/admin/feedback/:id/status", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const feedbackId = req.params.id;
      const { status } = req.body;
      
      const validStatuses = ["pending", "reviewed", "resolved", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateFeedbackStatus(feedbackId, status);
      if (!updated) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback status:", error);
      res.status(500).json({ message: "Failed to update feedback status" });
    }
  });

  return httpServer;
}
