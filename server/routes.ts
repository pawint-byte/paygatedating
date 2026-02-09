import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
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
import { emailService } from "./lib/email";

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
      console.log("POST /api/profile - userId:", userId, "photos count:", req.body.photos?.length || 0);
      
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
            
            // Increment referral count and check for tier rewards
            const tierResult = await storage.incrementReferralCount(referrerWallet.userId);
            if (tierResult.tierReached) {
              console.log(`Referrer ${referrerWallet.userId} reached ${tierResult.tierReached} tier!`);
            }
          }
        }
      }

      // Send welcome email (non-blocking)
      const userEmail = req.user.claims.email;
      if (userEmail) {
        emailService.sendWelcome(userEmail, profile.displayName || 'there').catch(err => 
          console.error('Failed to send welcome email:', err)
        );
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
      
      console.log("Profile update received - photos count:", req.body.photos?.length || 0);
      
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

        // Send verification approved email (non-blocking)
        const userEmail = req.user.claims.email;
        const userName = profile.displayName || req.user.claims.first_name || 'there';
        if (userEmail) {
          emailService.sendVerificationApproved(userEmail, userName).catch(err => 
            console.error('Failed to send verification email:', err)
          );
        }

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
      console.log("[Discover API] User ID:", userId);
      
      const prefs = await storage.getSearchPreferences(userId);
      console.log("[Discover API] Has prefs:", !!prefs);
      
      let profiles;
      if (prefs) {
        profiles = await storage.getFilteredProfiles(userId, prefs);
        console.log("[Discover API] Filtered profiles count:", profiles.length);
      } else {
        profiles = await storage.getDiscoverProfiles(userId);
        console.log("[Discover API] Discover profiles count:", profiles.length);
      }
      
      const enrichedProfiles = await Promise.all(
        profiles.map(async (profile) => {
          const items = await storage.getRegistryItems(profile.userId);
          const publicItems = items
            .filter(item => item.visibility === "public" && !item.isPurchased)
            .slice(0, 3)
            .map(item => ({
              id: item.id,
              title: item.title,
              price: item.price,
              imageUrl: item.imageUrl,
              platform: item.affiliateUrl?.includes('amazon') ? 'Amazon' 
                : item.affiliateUrl?.includes('net-a-porter') ? 'Net-a-Porter'
                : item.affiliateUrl?.includes('viator') ? 'Viator'
                : item.affiliateUrl?.includes('klook') ? 'Klook'
                : 'Gift',
              priceTier: item.priceTier,
            }));
          return {
            ...profile,
            wishlistPreview: publicItems,
            wishlistCount: items.filter(i => i.visibility === "public" && !i.isPurchased).length,
          };
        })
      );
      
      res.json(enrichedProfiles);
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

  // Note: Crypto payments are now handled through Stripe's native crypto support
  // When enabled in Stripe Dashboard, crypto (stablecoins/Crypto.com) appears automatically in checkout

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

      // Check for first match free eligibility (don't consume yet)
      const rewards = await storage.getUserRewards(userId);
      const eligibleForFirstMatchFree = rewards && !rewards.firstMatchFreeUsed;
      
      const wallet = await storage.getWallet(userId);
      if (!eligibleForFirstMatchFree) {
        // Only check balance if not eligible for first match free
        if (!wallet || parseFloat(wallet.balance) < GATE_COSTS.gate1) {
          return res.status(400).json({ message: "Insufficient wallet balance" });
        }
      }

      // Create the match first
      const match = await storage.createMatch({
        initiatorId: userId,
        recipientId,
        message,
        lastActionBy: userId,
      });

      // Now process payment or use first match free (after successful match creation)
      if (eligibleForFirstMatchFree) {
        // Use the first match free reward
        await storage.useFirstMatchFree(userId);
        if (wallet) {
          await storage.createTransaction({
            walletId: wallet.id,
            amount: "0.00",
            type: "gate_payment",
            description: "Gate 1: Interest request sent (First Match Free!)",
          });
        }
      } else if (wallet) {
        // Charge the user
        const newBalance = (parseFloat(wallet.balance) - GATE_COSTS.gate1).toFixed(2);
        await storage.updateWalletBalance(userId, newBalance);
        await storage.createTransaction({
          walletId: wallet.id,
          amount: (-GATE_COSTS.gate1).toFixed(2),
          type: "gate_payment",
          description: "Gate 1: Interest request sent",
        });
      }

      // Send email notification to recipient about interest
      try {
        const recipientProfile = await storage.getProfile(recipientId);
        const senderProfile = await storage.getProfile(userId);
        const recipientUser = await authStorage.getUser(recipientId);
        
        if (recipientProfile && senderProfile && recipientUser?.email) {
          const recipientName = recipientProfile.displayName?.split(' ')[0] || 'there';
          const senderName = senderProfile.displayName || 'Someone';
          
          emailService.sendInterestReceived(
            recipientUser.email,
            recipientName,
            senderName,
            message
          ).catch(err => console.error("Failed to send interest email:", err));
        }
      } catch (emailError) {
        console.error("Error sending interest notification email:", emailError);
      }

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
        userId: wallet.userId,
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

  // Public profile page - for QR code sharing (shows profile + wishlist)
  app.get("/api/public-profile/:userId", async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const profile = await storage.getProfile(userId);
      if (!profile || !profile.isVisible) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Get wallet for referral code
      const wallet = await storage.getWallet(userId);
      
      // Get public wishlist items (only visible ones)
      const allItems = await storage.getRegistryItems(userId);
      const publicWishlist = profile.showRegistryPublicly 
        ? allItems.filter(item => item.visibility === 'public' && !item.isPurchased)
        : [];

      // Return public-safe information with wishlist
      // Bio and tagline are part of the profile intro so they're shown if profile is visible
      // Social links are shown if photo is public (user wants to be discovered)
      // lookingFor is relationship intent, shown if interests are public
      const publicProfile = {
        userId: profile.userId,
        displayName: profile.showFirstNamePublicly ? profile.displayName : "PayGate User",
        age: profile.showAgePublicly ? profile.age : undefined,
        location: profile.showLocationPublicly ? profile.location : undefined,
        city: profile.showLocationPublicly ? profile.city : undefined,
        bio: profile.bio ? profile.bio.substring(0, 300) : undefined, // Limit bio preview
        tagline: profile.tagline,
        photos: profile.showPhotoPublicly && profile.photos ? profile.photos.slice(0, 3) : [],
        verificationStatus: profile.verificationStatus,
        interests: profile.showInterestsPublicly ? profile.interests : [],
        lookingFor: profile.showInterestsPublicly ? profile.lookingFor : undefined,
        socialLinks: profile.showPhotoPublicly ? profile.socialLinks : undefined,
        referralCode: wallet?.referralCode,
        wishlist: publicWishlist.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          imageUrl: item.imageUrl,
          description: item.description,
          platform: item.affiliateUrl?.includes('amazon') ? 'Amazon' :
                    item.affiliateUrl?.includes('viator') ? 'Viator' :
                    item.affiliateUrl?.includes('klook') ? 'Klook' :
                    item.affiliateUrl?.includes('net-a-porter') ? 'Net-a-Porter' : 'Other',
        })),
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // =================
  // REWARDS SYSTEM
  // =================

  // Get user rewards status
  app.get("/api/rewards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let rewards = await storage.getUserRewards(userId);
      
      if (!rewards) {
        rewards = await storage.createUserRewards(userId);
      }

      // Check and update premium status
      await storage.checkAndUpdatePremiumStatus(userId);

      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  // Record login streak (called on each page load)
  app.post("/api/rewards/login-streak", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.recordLoginStreak(userId);
      
      if (result.rewardEarned) {
        // Send reward notification email
        const profile = await storage.getProfile(userId);
        const user = await authStorage.getUser(userId);
        if (profile && user?.email) {
          await emailService.sendLoginStreakReward(
            user.email,
            profile.displayName?.split(' ')[0] || 'there',
            result.newStreak
          );
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error recording login streak:", error);
      res.status(500).json({ message: "Failed to record login streak" });
    }
  });

  // Get reward history
  app.get("/api/rewards/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getRewardHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching reward history:", error);
      res.status(500).json({ message: "Failed to fetch reward history" });
    }
  });

  // Claim profile completion reward
  app.post("/api/rewards/claim-profile-completion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Check profile completion (basic check for required fields)
      const requiredFields = [
        profile.displayName,
        profile.age,
        profile.bio,
        profile.photos?.length,
        profile.interests?.length,
        profile.location || profile.city,
      ];
      
      const completedFields = requiredFields.filter(Boolean).length;
      const completionPercent = Math.round((completedFields / requiredFields.length) * 100);
      
      if (completionPercent < 100) {
        return res.status(400).json({ 
          message: "Profile not 100% complete",
          completionPercent,
        });
      }

      const claimed = await storage.claimProfileCompletionReward(userId);
      
      if (!claimed) {
        return res.status(400).json({ message: "Reward already claimed" });
      }

      res.json({ success: true, message: "Profile completion reward claimed!" });
    } catch (error) {
      console.error("Error claiming profile completion reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  // Check first match free eligibility
  app.get("/api/rewards/first-match-free", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let rewards = await storage.getUserRewards(userId);
      
      if (!rewards) {
        rewards = await storage.createUserRewards(userId);
      }

      res.json({ 
        eligible: !rewards.firstMatchFreeUsed,
        used: rewards.firstMatchFreeUsed,
      });
    } catch (error) {
      console.error("Error checking first match free:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  // Get seasonal discount info
  app.get("/api/rewards/seasonal-offers", async (req: any, res) => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      
      const offers = [];
      
      // Valentine's Day (February)
      if (month === 2) {
        offers.push({
          type: "valentine",
          title: "Valentine's Day Special",
          description: "50% off annual subscription!",
          discountPercent: 50,
          expiresAt: new Date(now.getFullYear(), 2, 1).toISOString(),
        });
      }
      
      // Cuffing Season (Sept-Nov)
      if (month >= 9 && month <= 11) {
        offers.push({
          type: "cuffing_season",
          title: "Cuffing Season Extended Trial",
          description: "14 days free Premium trial (normally 7 days)",
          trialDays: 14,
          expiresAt: new Date(now.getFullYear(), 11, 1).toISOString(),
        });
      }

      res.json(offers);
    } catch (error) {
      console.error("Error fetching seasonal offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
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
      
      // If user just went live, check for nearby users to notify
      if (isLive && latitude && longitude) {
        try {
          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);
          
          // Get live profiles within 10km radius (already filtered by distance)
          const nearbyProfiles = await storage.getLiveProfiles(userId, lat, lng, 10);
          
          // Send nearby alert email to each nearby user (limit to 5 to avoid spam)
          const toNotify = nearbyProfiles.slice(0, 5);
          for (const profile of toNotify) {
            try {
              const profileUser = await authStorage.getUser(profile.userId);
              if (profileUser?.email) {
                const firstName = profile.displayName?.split(' ')[0] || 'there';
                emailService.sendNearbyAlert(
                  profileUser.email,
                  firstName,
                  1 // Just notifying about this one user going live
                ).catch(err => console.error("Failed to send nearby alert:", err));
              }
            } catch (emailError) {
              console.error("Error sending nearby notification:", emailError);
            }
          }
        } catch (nearbyError) {
          console.error("Error notifying nearby users:", nearbyError);
        }
      }
      
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
      const isTravel = hostname.includes('viator.com') || hostname.includes('klook.com') || hostname.includes('tp.st') || hostname.includes('travelpayouts.com');
      const isLuxury = hostname.includes('net-a-porter.com');
      
      if (!isAmazon && !isTravel && !isLuxury) {
        return { valid: false, error: "Only Amazon, Viator, Klook, and Net-a-Porter links are supported for wishlist items" };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  // Travelpayouts API for converting Viator URLs to affiliate links
  async function convertViatorToAffiliate(url: string): Promise<string> {
    const token = process.env.TRAVELPAYOUTS_API_TOKEN;
    const projectId = process.env.TRAVELPAYOUTS_PROJECT_ID;
    const markerId = process.env.TRAVELPAYOUTS_MARKER_ID;
    
    if (!token || !projectId || !markerId) {
      console.log('Travelpayouts credentials not configured, returning original URL');
      return url;
    }
    
    try {
      const response = await fetch('https://api.travelpayouts.com/links/v1/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': token,
        },
        body: JSON.stringify({
          trs: parseInt(projectId),
          marker: parseInt(markerId),
          shorten: true,
          links: [{ url }]
        })
      });
      
      if (!response.ok) {
        console.error('Travelpayouts API error:', response.status);
        return url;
      }
      
      const data = await response.json();
      if (data.result?.links?.[0]?.code === 'success' && data.result.links[0].partner_url) {
        console.log('Viator URL converted to affiliate link:', data.result.links[0].partner_url);
        return data.result.links[0].partner_url;
      }
      
      console.log('Travelpayouts conversion failed:', data.result?.links?.[0]?.message || 'Unknown error');
      return url;
    } catch (error) {
      console.error('Error calling Travelpayouts API:', error);
      return url;
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
      
      // Viator via Travelpayouts affiliate network  
      // Travelpayouts uses their white label domain (tp.st) for tracked links
      // If user pastes a tp.st or travelpayouts.com link, it's already an affiliate link
      if (urlObj.hostname.includes('tp.st') || urlObj.hostname.includes('travelpayouts.com')) {
        // Already a Travelpayouts affiliate link - return as-is
        return url;
      }
      
      // Direct Viator URLs - return as-is for now
      // The async API conversion happens in the POST handler
      if (urlObj.hostname.includes('viator.com')) {
        return url;
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
      
      // Add affiliate tags (sync for Amazon)
      affiliateUrl = addAffiliateTag(affiliateUrl);
      
      // Convert Viator/Klook URLs via Travelpayouts API (async)
      try {
        const urlObj = new URL(affiliateUrl);
        if (urlObj.hostname.includes('viator.com') || urlObj.hostname.includes('klook.com')) {
          affiliateUrl = await convertViatorToAffiliate(affiliateUrl);
        }
      } catch (e) {
        // Invalid URL, continue with original
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
      
      const enrichedPurchases = await Promise.all(
        purchases.map(async (purchase) => {
          const senderProfile = await storage.getProfile(purchase.buyerUserId);
          const registryItem = await storage.getRegistryItem(purchase.registryItemId);
          return {
            ...purchase,
            senderName: senderProfile?.displayName?.split(' ')[0] || "Your Match",
            item: registryItem,
          };
        })
      );
      
      res.json(enrichedPurchases);
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

3. **Wishlist/Registry**: Help users add items from Amazon or Net-a-Porter to their wishlist, or travel experiences from Viator and Klook. Gifts from matches can unlock gates.

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

      // Send support confirmation email (non-blocking)
      const userEmail = req.user.claims.email;
      const userName = req.user.claims.first_name || 'there';
      if (userEmail) {
        emailService.sendSupportConfirmation(userEmail, userName, newFeedback.subject).catch(err => 
          console.error('Failed to send support confirmation email:', err)
        );
      }

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

  // ===== DATE PLAN ROUTES =====
  const datePlanCreateSchema = z.object({
    activity: z.string().min(3, "Activity must be at least 3 characters").max(100),
    activityType: z.string().max(50).optional(),
    placeName: z.string().max(200).optional(),
    placeAddress: z.string().optional(),
    proposedDate: z.string().min(1, "Date is required"),
    paymentPreference: z.enum(["ill_pay", "you_pay", "split"]),
    notes: z.string().optional(),
    preferences: z.array(z.string()).optional(),
    blacklist: z.array(z.string()).optional(),
    budgetFloor: z.number().min(0).optional(),
    budgetCeiling: z.number().min(0).optional(),
  });

  // Get a user's date preferences (for showing match's preferences when proposing)
  app.get("/api/users/:userId/date-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json({
        datePreferences: profile.datePreferences || [],
        dateBlacklist: profile.dateBlacklist || [],
        dateBudgetFloor: profile.dateBudgetFloor,
        dateBudgetCeiling: profile.dateBudgetCeiling,
      });
    } catch (error) {
      console.error("Error fetching date preferences:", error);
      res.status(500).json({ message: "Failed to fetch date preferences" });
    }
  });

  // Update own date preferences
  const datePreferencesUpdateSchema = z.object({
    datePreferences: z.array(z.string()).optional(),
    dateBlacklist: z.array(z.string()).optional(),
    dateBudgetFloor: z.number().min(0).nullable().optional(),
    dateBudgetCeiling: z.number().min(0).nullable().optional(),
  });

  app.patch("/api/profile/date-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = datePreferencesUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid data" });
      }
      
      const existingProfile = await storage.getProfile(userId);
      if (!existingProfile) {
        return res.status(404).json({ message: "Profile not found. Please complete your profile setup first." });
      }
      
      const updated = await storage.updateProfile(userId, validation.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating date preferences:", error);
      res.status(500).json({ message: "Failed to update date preferences" });
    }
  });

  app.post("/api/matches/:matchId/date-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { matchId } = req.params;
      
      const validation = datePlanCreateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid date plan data" });
      }

      const { activity, activityType, placeName, placeAddress, proposedDate, paymentPreference, notes, preferences, blacklist, budgetFloor, budgetCeiling } = validation.data;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.initiatorId !== userId && match.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized for this match" });
      }

      const recipientId = match.initiatorId === userId ? match.recipientId : match.initiatorId;

      const datePlan = await storage.createDatePlan({
        matchId,
        proposerId: userId,
        recipientId,
        activity,
        activityType,
        placeName,
        placeAddress,
        proposedDate: new Date(proposedDate),
        paymentPreference,
        notes,
        preferences,
        blacklist,
        budgetFloor,
        budgetCeiling,
      });

      res.status(201).json(datePlan);
    } catch (error) {
      console.error("Error creating date plan:", error);
      res.status(500).json({ message: "Failed to create date plan" });
    }
  });

  app.get("/api/matches/:matchId/date-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { matchId } = req.params;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.initiatorId !== userId && match.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized for this match" });
      }

      const datePlans = await storage.getDatePlansByMatch(matchId);
      res.json(datePlans);
    } catch (error) {
      console.error("Error fetching date plans:", error);
      res.status(500).json({ message: "Failed to fetch date plans" });
    }
  });

  const datePlanStatusSchema = z.object({
    status: z.enum(["accepted", "declined", "completed", "cancelled"]),
  });

  app.patch("/api/date-plans/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const validation = datePlanStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid status" });
      }
      const { status } = validation.data;

      const datePlan = await storage.getDatePlanById(id);
      if (!datePlan) {
        return res.status(404).json({ message: "Date plan not found" });
      }

      if (datePlan.proposerId !== userId && datePlan.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this date plan" });
      }

      if (status === "accepted" && datePlan.proposerId === userId) {
        return res.status(400).json({ message: "You cannot accept your own date proposal" });
      }

      const updated = await storage.updateDatePlanStatus(id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating date plan:", error);
      res.status(500).json({ message: "Failed to update date plan" });
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

  // Note: Stripe webhook endpoint is now registered in index.ts BEFORE express.json()
  // to ensure raw body buffer is available. Uses stripe-replit-sync for auto-management.

  // One-time setup endpoint to seed demo profiles (works once per database)
  app.post("/api/setup/seed-demo-profiles", isAuthenticated, async (req: any, res) => {
    try {
      // Check if demo profiles already exist
      const existingDemos = await storage.getDiscoverProfiles("check_demo");
      const hasDemos = existingDemos.some(p => p.userId.startsWith("demo_"));
      
      if (hasDemos) {
        return res.status(400).json({ message: "Demo profiles already exist" });
      }
    } catch (error) {
      console.error("Check error:", error);
    }

    // Proceed with seeding
    try {
      const demoProfiles = getDemoProfiles();
      const wishlistItems = getWishlistItems();

      const createdProfiles = [];
      for (const profileData of demoProfiles) {
        await authStorage.upsertUser({
          id: profileData.userId,
          email: `${profileData.displayName.toLowerCase()}@demo.paygate.dating`,
          firstName: profileData.displayName,
          lastName: "Demo",
        });

        await storage.createWallet({ userId: profileData.userId });

        await storage.createProfile({
          userId: profileData.userId,
          displayName: profileData.displayName,
          age: profileData.age,
          gender: profileData.gender,
          location: profileData.location,
          bio: profileData.bio,
          tagline: profileData.tagline,
          lookingFor: profileData.lookingFor,
          interests: profileData.interests,
          photos: profileData.photos,
          height: profileData.height,
          bodyType: profileData.bodyType,
          occupation: profileData.occupation,
          education: profileData.education,
          zodiacSign: profileData.zodiacSign,
          verificationStatus: profileData.verificationStatus as "none" | "pending" | "verified" | "rejected",
          socialLinks: profileData.socialLinks,
          isVisible: true,
        });

        const numItems = Math.floor(Math.random() * 2) + 2;
        const shuffled = [...wishlistItems].sort(() => 0.5 - Math.random());
        for (let i = 0; i < numItems; i++) {
          const item = shuffled[i];
          await storage.createRegistryItem({
            userId: profileData.userId,
            title: item.title,
            price: item.price,
            priceTier: item.priceTier as "starter" | "impressive" | "vip",
            affiliateUrl: item.affiliateUrl,
            visibility: "public",
          });
        }
        createdProfiles.push(profileData.displayName);
      }

      res.json({ 
        message: "Demo profiles created successfully", 
        profiles: createdProfiles,
        count: createdProfiles.length 
      });
    } catch (error) {
      console.error("Error seeding demo profiles:", error);
      res.status(500).json({ message: "Failed to seed demo profiles" });
    }
  });

  // Helper functions for demo data
  function getDemoProfiles() {
    const timestamp = Date.now();
    return [
      {
        userId: "demo_emma_" + timestamp,
        displayName: "Emma",
        age: 28,
        gender: "woman",
        location: "New York, NY",
        bio: "Coffee enthusiast, book lover, and aspiring chef. I believe in genuine connections and meaningful conversations. Looking for someone who appreciates the simple things in life.",
        tagline: "Life is too short for boring dates",
        lookingFor: "Someone genuine who values deep talks and cozy nights in.",
        interests: ["hiking", "cooking", "reading", "travel", "yoga", "wine tasting"],
        photos: ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400"],
        height: "5'7\"",
        bodyType: "athletic",
        occupation: "Marketing Manager",
        education: "Masters Degree",
        zodiacSign: "libra",
        verificationStatus: "verified",
        socialLinks: { instagram: "emma_adventures", tiktok: "emmacooks" },
      },
      {
        userId: "demo_michael_" + timestamp,
        displayName: "Michael",
        age: 32,
        gender: "man",
        location: "San Francisco, CA",
        bio: "Tech entrepreneur by day, amateur photographer by weekend. Love exploring new restaurants and hidden gems in the city. Dog dad to a golden retriever named Max.",
        tagline: "Building the future, one adventure at a time",
        lookingFor: "Intellectually curious, loves restaurants and adventures.",
        interests: ["photography", "tech", "dogs", "food", "hiking", "startups"],
        photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"],
        height: "6'0\"",
        bodyType: "fit",
        occupation: "Software Engineer",
        education: "Bachelors Degree",
        zodiacSign: "scorpio",
        verificationStatus: "verified",
        socialLinks: { instagram: "mike_explores", twitter: "michaeltech" },
      },
      {
        userId: "demo_sophia_" + timestamp,
        displayName: "Sophia",
        age: 26,
        gender: "woman",
        location: "Los Angeles, CA",
        bio: "Artist and dreamer. I paint, I dance, I create. Looking for someone who appreciates creativity and isn't afraid to be themselves.",
        tagline: "Creating art in everyday moments",
        lookingFor: "A creative soul who appreciates art and spontaneity.",
        interests: ["art", "dancing", "music", "museums", "beach", "painting", "yoga"],
        photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400"],
        height: "5'5\"",
        bodyType: "slim",
        occupation: "Graphic Designer",
        education: "Bachelors Degree",
        zodiacSign: "pisces",
        verificationStatus: "verified",
        socialLinks: { instagram: "sophiaarts", tiktok: "sophiadances" },
      },
      {
        userId: "demo_james_" + timestamp,
        displayName: "James",
        age: 35,
        gender: "man",
        location: "Chicago, IL",
        bio: "Finance professional who knows how to work hard and play harder. Weekend warrior on the basketball court.",
        tagline: "Work hard, love harder",
        lookingFor: "Ambitious woman with a kind heart who enjoys fine dining.",
        interests: ["basketball", "finance", "travel", "wine", "cooking", "golf"],
        photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400"],
        height: "6'2\"",
        bodyType: "athletic",
        occupation: "Investment Banker",
        education: "MBA",
        zodiacSign: "aries",
        verificationStatus: "verified",
        socialLinks: { instagram: "james_lifestyle" },
      },
      {
        userId: "demo_olivia_" + timestamp,
        displayName: "Olivia",
        age: 29,
        gender: "woman",
        location: "Austin, TX",
        bio: "Music lover and concert-goer. I work in healthcare and love helping others. My ideal weekend involves brunch and live music.",
        tagline: "Finding rhythm in chaos",
        lookingFor: "Genuine, down-to-earth, values family and good humor.",
        interests: ["music", "concerts", "brunch", "healthcare", "volunteering", "dancing"],
        photos: ["https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400", "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400"],
        height: "5'6\"",
        bodyType: "average",
        occupation: "Nurse Practitioner",
        education: "Masters Degree",
        zodiacSign: "cancer",
        verificationStatus: "none",
        socialLinks: { instagram: "olivia_vibes", snapchat: "livmusic" },
      },
      {
        userId: "demo_david_" + timestamp,
        displayName: "David",
        age: 31,
        gender: "man",
        location: "Seattle, WA",
        bio: "Coffee snob and outdoor enthusiast. Product manager at a startup. I believe life is about experiences, not things.",
        tagline: "Chasing sunsets and good coffee",
        lookingFor: "Adventure buddy who loves outdoors and cozy movie nights.",
        interests: ["coffee", "hiking", "startups", "movies", "camping", "photography"],
        photos: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400", "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400"],
        height: "5'10\"",
        bodyType: "fit",
        occupation: "Product Manager",
        education: "Bachelors Degree",
        zodiacSign: "virgo",
        verificationStatus: "verified",
        socialLinks: { instagram: "david_outdoors", twitter: "davidpm" },
      },
    ];
  }

  function getWishlistItems() {
    return [
      { title: "Kindle Paperwhite", price: "139.99", priceTier: "impressive", affiliateUrl: "https://www.amazon.com/dp/B09TMN58KL" },
      { title: "Wine Tasting Experience", price: "89.00", priceTier: "impressive", affiliateUrl: "https://www.viator.com/tours/Napa-Valley" },
      { title: "Artisan Jewelry Set", price: "45.00", priceTier: "starter", affiliateUrl: "https://www.amazon.com/dp/jewelry" },
      { title: "Cooking Class for Two", price: "150.00", priceTier: "vip", affiliateUrl: "https://www.klook.com/activity/cooking-class" },
      { title: "Designer Sunglasses", price: "195.00", priceTier: "vip", affiliateUrl: "https://www.net-a-porter.com/sunglasses" },
      { title: "Scented Candle Set", price: "35.00", priceTier: "starter", affiliateUrl: "https://www.amazon.com/dp/candles" },
    ];
  }

  // Admin endpoint to seed demo profiles for showcasing the platform
  app.post("/api/admin/seed-demo-profiles", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const demoProfiles = [
        {
          userId: "demo_emma_" + Date.now(),
          displayName: "Emma",
          age: 28,
          gender: "woman",
          location: "New York, NY",
          bio: "Coffee enthusiast, book lover, and aspiring chef. I believe in genuine connections and meaningful conversations. Looking for someone who appreciates the simple things in life.",
          tagline: "Life is too short for boring dates",
          lookingFor: "Someone genuine who values deep talks and cozy nights in.",
          interests: ["hiking", "cooking", "reading", "travel", "yoga", "wine tasting"],
          photos: ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400"],
          height: "5'7\"",
          bodyType: "athletic",
          occupation: "Marketing Manager",
          education: "Masters Degree",
          zodiacSign: "libra",
          verificationStatus: "verified",
          socialLinks: { instagram: "emma_adventures", tiktok: "emmacooks" },
        },
        {
          userId: "demo_michael_" + Date.now(),
          displayName: "Michael",
          age: 32,
          gender: "man",
          location: "San Francisco, CA",
          bio: "Tech entrepreneur by day, amateur photographer by weekend. Love exploring new restaurants and hidden gems in the city. Dog dad to a golden retriever named Max.",
          tagline: "Building the future, one adventure at a time",
          lookingFor: "Intellectually curious, loves restaurants and adventures.",
          interests: ["photography", "tech", "dogs", "food", "hiking", "startups"],
          photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"],
          height: "6'0\"",
          bodyType: "fit",
          occupation: "Software Engineer",
          education: "Bachelors Degree",
          zodiacSign: "scorpio",
          verificationStatus: "verified",
          socialLinks: { instagram: "mike_explores", twitter: "michaeltech" },
        },
        {
          userId: "demo_sophia_" + Date.now(),
          displayName: "Sophia",
          age: 26,
          gender: "woman",
          location: "Los Angeles, CA",
          bio: "Artist and dreamer. I paint, I dance, I create. Looking for someone who appreciates creativity and isn't afraid to be themselves. Let's make beautiful memories together.",
          tagline: "Creating art in everyday moments",
          lookingFor: "A creative soul who appreciates art and spontaneity.",
          interests: ["art", "dancing", "music", "museums", "beach", "painting", "yoga"],
          photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400"],
          height: "5'5\"",
          bodyType: "slim",
          occupation: "Graphic Designer",
          education: "Bachelors Degree",
          zodiacSign: "pisces",
          verificationStatus: "verified",
          socialLinks: { instagram: "sophiaarts", tiktok: "sophiadances" },
        },
        {
          userId: "demo_james_" + Date.now(),
          displayName: "James",
          age: 35,
          gender: "man",
          location: "Chicago, IL",
          bio: "Finance professional who knows how to work hard and play harder. Weekend warrior on the basketball court. Looking for someone to share deep conversations and spontaneous adventures.",
          tagline: "Work hard, love harder",
          lookingFor: "Ambitious woman with a kind heart who enjoys fine dining.",
          interests: ["basketball", "finance", "travel", "wine", "cooking", "golf"],
          photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400"],
          height: "6'2\"",
          bodyType: "athletic",
          occupation: "Investment Banker",
          education: "MBA",
          zodiacSign: "aries",
          verificationStatus: "verified",
          socialLinks: { instagram: "james_lifestyle" },
        },
        {
          userId: "demo_olivia_" + Date.now(),
          displayName: "Olivia",
          age: 29,
          gender: "woman",
          location: "Austin, TX",
          bio: "Music lover and concert-goer. I work in healthcare and love helping others. My ideal weekend involves brunch, live music, and quality time with loved ones.",
          tagline: "Finding rhythm in chaos",
          lookingFor: "Genuine, down-to-earth, values family and good humor.",
          interests: ["music", "concerts", "brunch", "healthcare", "volunteering", "dancing"],
          photos: ["https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400", "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400"],
          height: "5'6\"",
          bodyType: "average",
          occupation: "Nurse Practitioner",
          education: "Masters Degree",
          zodiacSign: "cancer",
          verificationStatus: "none",
          socialLinks: { instagram: "olivia_vibes", snapchat: "livmusic" },
        },
        {
          userId: "demo_david_" + Date.now(),
          displayName: "David",
          age: 31,
          gender: "man",
          location: "Seattle, WA",
          bio: "Coffee snob and outdoor enthusiast. Product manager at a startup. I believe life is about experiences, not things. Looking for a partner to share hikes, coffee, and Netflix binges.",
          tagline: "Chasing sunsets and good coffee",
          lookingFor: "Adventure buddy who loves outdoors and cozy movie nights.",
          interests: ["coffee", "hiking", "startups", "movies", "camping", "photography"],
          photos: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400", "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400"],
          height: "5'10\"",
          bodyType: "fit",
          occupation: "Product Manager",
          education: "Bachelors Degree",
          zodiacSign: "virgo",
          verificationStatus: "verified",
          socialLinks: { instagram: "david_outdoors", twitter: "davidpm" },
        },
      ];

      const createdProfiles = [];
      const wishlistItems = [
        { title: "Kindle Paperwhite", price: "139.99", priceTier: "impressive", affiliateUrl: "https://www.amazon.com/dp/B09TMN58KL" },
        { title: "Wine Tasting Experience", price: "89.00", priceTier: "impressive", affiliateUrl: "https://www.viator.com/tours/Napa-Valley" },
        { title: "Artisan Jewelry Set", price: "45.00", priceTier: "starter", affiliateUrl: "https://www.amazon.com/dp/jewelry" },
        { title: "Cooking Class for Two", price: "150.00", priceTier: "vip", affiliateUrl: "https://www.klook.com/activity/cooking-class" },
        { title: "Designer Sunglasses", price: "195.00", priceTier: "vip", affiliateUrl: "https://www.net-a-porter.com/sunglasses" },
        { title: "Scented Candle Set", price: "35.00", priceTier: "starter", affiliateUrl: "https://www.amazon.com/dp/candles" },
      ];

      for (const profileData of demoProfiles) {
        // Create user first
        await authStorage.upsertUser({
          id: profileData.userId,
          email: `${profileData.displayName.toLowerCase()}@demo.paygate.dating`,
          firstName: profileData.displayName,
          lastName: "Demo",
        });

        // Create wallet
        await storage.createWallet({
          userId: profileData.userId,
        });

        // Create profile
        await storage.createProfile({
          userId: profileData.userId,
          displayName: profileData.displayName,
          age: profileData.age,
          gender: profileData.gender,
          location: profileData.location,
          bio: profileData.bio,
          tagline: profileData.tagline,
          lookingFor: profileData.lookingFor,
          interests: profileData.interests,
          photos: profileData.photos,
          height: profileData.height,
          bodyType: profileData.bodyType,
          occupation: profileData.occupation,
          education: profileData.education,
          zodiacSign: profileData.zodiacSign,
          verificationStatus: profileData.verificationStatus as "none" | "pending" | "verified" | "rejected",
          socialLinks: profileData.socialLinks,
          isVisible: true,
        });

        // Add 2-3 random wishlist items
        const numItems = Math.floor(Math.random() * 2) + 2;
        const shuffled = [...wishlistItems].sort(() => 0.5 - Math.random());
        for (let i = 0; i < numItems; i++) {
          const item = shuffled[i];
          await storage.createRegistryItem({
            userId: profileData.userId,
            title: item.title,
            price: item.price,
            priceTier: item.priceTier as "starter" | "impressive" | "vip",
            affiliateUrl: item.affiliateUrl,
            visibility: "public",
          });
        }

        createdProfiles.push(profileData.displayName);
      }

      res.json({ 
        message: "Demo profiles created successfully", 
        profiles: createdProfiles,
        count: createdProfiles.length 
      });
    } catch (error) {
      console.error("Error seeding demo profiles:", error);
      res.status(500).json({ message: "Failed to seed demo profiles" });
    }
  });

  // =================
  // ACTIVITY TRACKING
  // =================

  // Update last active timestamp (called on app activity)
  app.post("/api/activity/heartbeat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateLastActive(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // Check and notify inactive users (admin/cron endpoint)
  app.post("/api/admin/notify-inactive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isAdmin = await storage.isUserAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { days = 7 } = req.body;
      
      // Get inactive profiles
      const inactiveProfiles = await storage.getInactiveProfiles(days);
      
      // Seasonal message based on current date
      const now = new Date();
      const month = now.getMonth() + 1;
      let seasonalMessage = "New connections are waiting for you!";
      
      if (month === 2) {
        seasonalMessage = "Valentine's Day is coming up! Find your perfect match before Feb 14th.";
      } else if (month === 12) {
        seasonalMessage = "Make this holiday season magical - find someone special to share it with!";
      } else if (month >= 3 && month <= 5) {
        seasonalMessage = "Spring is in the air! Perfect time for new beginnings and fresh connections.";
      } else if (month >= 6 && month <= 8) {
        seasonalMessage = "Summer adventures await! Find your adventure partner today.";
      } else if (month >= 9 && month <= 11) {
        seasonalMessage = "Cuffing season is here! Don't miss out on finding your cozy companion.";
      }

      let notified = 0;
      for (const profile of inactiveProfiles) {
        try {
          const profileUser = await authStorage.getUser(profile.userId);
          if (profileUser?.email) {
            const firstName = profile.displayName?.split(' ')[0] || 'there';
            
            // Calculate days since last active
            const lastActive = profile.lastActiveAt || profile.createdAt;
            const daysSince = Math.floor((now.getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
            
            await emailService.sendInactivityReminder(
              profileUser.email,
              firstName,
              daysSince,
              seasonalMessage
            );
            notified++;
          }
        } catch (emailError) {
          console.error("Failed to send inactivity email:", emailError);
        }
      }

      res.json({ 
        message: "Inactive users notified", 
        totalInactive: inactiveProfiles.length,
        notified 
      });
    } catch (error) {
      console.error("Error notifying inactive users:", error);
      res.status(500).json({ message: "Failed to notify inactive users" });
    }
  });

  return httpServer;
}
