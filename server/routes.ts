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
  MINIMUM_WALLET_BALANCE,
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
        wallet = await storage.createWallet({ userId });
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

  return httpServer;
}
