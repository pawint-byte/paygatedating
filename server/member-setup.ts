import type { Express } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { profiles, profileSetupDrafts, users, wallets, transactions, referrals, TRIAL_CREDITS_AMOUNT, REFERRAL_BONUS_AMOUNT } from "@shared/schema";
import { storage } from "./storage";
import { makeSetupBio, setupDestination, setupDraftSchema } from "@shared/member-setup";
import { isAuthenticated } from "./replit_integrations/auth";

export function registerMemberSetupRoutes(app: Express) {
  // Responses include private words and an optional photo. Do not cache them.
  app.use("/api/setup", (_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  });

  app.get("/api/setup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      const [draft] = profile ? [] : await db.select().from(profileSetupDrafts)
        .where(eq(profileSetupDrafts.userId, userId));
      res.json({ accepted: !!profile, gate: profile?.setupGate ?? null, draft: draft ?? null });
    } catch {
      res.status(503).json({ message: "Your setup could not be loaded. Please try again." });
    }
  });

  app.put("/api/setup/draft", isAuthenticated, async (req: any, res) => {
    const parsed = setupDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid draft" });
    }
    try {
      const userId = req.user.claims.sub;
      const result = await db.transaction(async tx => {
        // Serialize save, reset and accept for this member, including multiple tabs.
        await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
        const [existing] = await tx.select().from(profiles).where(eq(profiles.userId, userId));
        if (existing) return null;
        const values = {
          userId, ...parsed.data, photo: parsed.data.photo ?? null,
          bio: makeSetupBio(parsed.data.wants, parsed.data.willNot),
        };
        const [draft] = await tx.insert(profileSetupDrafts).values(values)
          .onConflictDoUpdate({
            target: profileSetupDrafts.userId,
            set: { ...values, revision: sql`excluded.revision` },
          }).returning();
        return draft;
      });
      if (!result) return res.status(409).json({ message: "Your profile has already been accepted." });
      res.json(result);
    } catch {
      res.status(503).json({ message: "Your draft could not be saved. Please try again." });
    }
  });

  app.delete("/api/setup/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await db.transaction(async tx => {
        await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
        await tx.delete(profileSetupDrafts).where(eq(profileSetupDrafts.userId, userId));
      });
      // Never delete or hide an already accepted profile.
      res.json({ success: true });
    } catch {
      res.status(503).json({ message: "Your draft could not be cleared. Please try again." });
    }
  });

  app.post("/api/setup/accept", isAuthenticated, async (req: any, res) => {
    const parsed = z.object({
      revision: z.number().int().positive(),
      // Preserve attribution from an existing invite link, not another question.
      referralCode: z.string().max(10).optional(),
    }).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Choose the saved draft to accept." });
    try {
      const userId = req.user.claims.sub;
      const result = await db.transaction(async tx => {
        await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
        const [existing] = await tx.select().from(profiles).where(eq(profiles.userId, userId));
        if (existing) return { profile: existing, gate: existing.setupGate };
        const [draft] = await tx.select().from(profileSetupDrafts)
          .where(and(eq(profileSetupDrafts.userId, userId), eq(profileSetupDrafts.revision, parsed.data.revision)));
        if (!draft) return null;
        const [profile] = await tx.insert(profiles).values({
          userId,
          displayName: draft.firstName,
          setupGate: draft.gate,
          bio: draft.bio,
          lookingFor: draft.gate,
          dealBreakers: [draft.willNot],
          photos: draft.photo ? [draft.photo] : [],
          isVisible: true,
          // Age was not asked; do not invent an age.
          age: null,
        }).returning();
        // Preserve existing welcome credits, once, only after explicit acceptance.
        await tx.insert(wallets).values({
          userId, referralCode: randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase(),
          referredBy: parsed.data.referralCode || null,
        }).onConflictDoNothing({ target: wallets.userId });
        const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
        let referrerUserId: string | undefined;
        if (!wallet.trialCreditsReceived) {
          await tx.update(wallets).set({
            balance: sql`${wallets.balance} + ${TRIAL_CREDITS_AMOUNT}`,
            trialCreditsReceived: true,
          }).where(eq(wallets.userId, userId));
          await tx.insert(transactions).values({
            walletId: wallet.id, amount: TRIAL_CREDITS_AMOUNT.toFixed(2),
            type: "trial_bonus", description: `Welcome bonus: $${TRIAL_CREDITS_AMOUNT} free credits!`,
          });
          const referralCode = wallet.referredBy || parsed.data.referralCode;
          if (referralCode) {
            const [referrer] = await tx.select().from(wallets).where(eq(wallets.referralCode, referralCode));
            if (referrer && referrer.userId !== userId) {
              const [referral] = await tx.insert(referrals).values({
                referrerUserId: referrer.userId, referredUserId: userId, bonusPaid: true,
              }).onConflictDoNothing({ target: referrals.referredUserId }).returning();
              if (referral) {
                await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${REFERRAL_BONUS_AMOUNT}` })
                  .where(eq(wallets.userId, referrer.userId));
                await tx.insert(transactions).values({
                  walletId: referrer.id, amount: REFERRAL_BONUS_AMOUNT.toFixed(2),
                  type: "referral_bonus", description: "Referral bonus for inviting a friend",
                });
                referrerUserId = referrer.userId;
              }
            }
          }
        }
        await tx.delete(profileSetupDrafts).where(eq(profileSetupDrafts.userId, userId));
        return { profile, gate: draft.gate, referrerUserId };
      });
      if (!result) return res.status(409).json({ message: "Your draft changed. Reload it before accepting." });
      if ("referrerUserId" in result && result.referrerUserId) {
        await storage.incrementReferralCount(result.referrerUserId).catch(() => {
          console.error("Could not update referral tier after profile acceptance");
        });
      }
      res.json({ profile: result.profile, gate: result.gate, destination: result.gate ? setupDestination(result.gate) : "/discover" });
    } catch {
      res.status(503).json({ message: "Your profile was not accepted. Please try again." });
    }
  });
}
