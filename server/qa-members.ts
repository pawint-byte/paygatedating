import { and, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { profiles, transactions, userRewards, wallets } from "@shared/schema";
import { users } from "@shared/models/auth";
import { QA_GRANT_DESCRIPTION, QA_INITIAL_CREDIT, QA_MEMBERS } from "@shared/qa";

/**
 * Called only by the authenticated Admin route or the Replit workspace seed.
 * No Stripe, passwords, auth sessions, referrals, or non-QA records are changed.
 */
export async function setupQaMembers(actor: string) {
  const members = await db.transaction(async tx => {
    // Serialize setup across server instances. Grant and ledger commit together.
    await tx.execute(sql`select pg_advisory_xact_lock(714209, 1)`);
    const namedProfiles = await tx.select().from(profiles)
      .where(inArray(profiles.displayName, QA_MEMBERS.map(member => member.displayName)));
    if (namedProfiles.some(profile => !QA_MEMBERS.some(member => member.userId === profile.userId))) {
      throw new Error("A QA name already belongs to another account; no records were changed.");
    }

    const result = [];
    for (const member of QA_MEMBERS) {
      const [existingUser] = await tx.select().from(users).where(eq(users.id, member.userId));
      const [existingProfile] = await tx.select().from(profiles).where(eq(profiles.userId, member.userId));
      const [existingWallet] = await tx.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, member.userId));
      const [existingRewards] = await tx.select({ id: userRewards.id }).from(userRewards).where(eq(userRewards.userId, member.userId));
      if ((!existingUser && (existingProfile || existingWallet || existingRewards)) ||
        (existingProfile && existingProfile.displayName !== member.displayName) ||
        (existingUser && (
        existingUser.isAdmin || existingUser.email !== null ||
        existingUser.firstName !== "QA" || existingUser.lastName !== member.displayName.slice(3)
      ))) {
        throw new Error("A reserved QA ID is already in use; no records were changed.");
      }

      await tx.insert(users).values({
        id: member.userId,
        firstName: "QA",
        lastName: member.displayName.slice(3),
        email: null,
        isAdmin: false,
      }).onConflictDoNothing({ target: users.id });

      await tx.insert(profiles).values({
        ...member,
        location: "QA test account",
        bio: "QA test member for Admin-supervised wallet and chapter checks. Not a real dating member.",
        tagline: "QA testing account",
        lookingFor: "QA testing",
        interests: ["Reading", "Music", "Travel"],
        photos: [],
        isVisible: true,
        subscriptionTier: "free",
      }).onConflictDoUpdate({
        target: profiles.userId,
        set: { isVisible: true, subscriptionTier: "free" },
      });

      await tx.insert(wallets).values({
        userId: member.userId,
        balance: "0.00",
        trialCreditsReceived: true,
      }).onConflictDoNothing({ target: wallets.userId });
      const [wallet] = await tx.select().from(wallets)
        .where(eq(wallets.userId, member.userId)).for("update");

      const [grant] = await tx.select({ id: transactions.id }).from(transactions).where(and(
        eq(transactions.walletId, wallet.id),
        eq(transactions.type, "trial_bonus"),
        eq(transactions.description, QA_GRANT_DESCRIPTION),
      ));
      if (!grant) {
        await tx.update(wallets).set({
          balance: sql`${wallets.balance} + ${QA_INITIAL_CREDIT}`,
          trialCreditsReceived: true,
        }).where(eq(wallets.id, wallet.id));
        await tx.insert(transactions).values({
          walletId: wallet.id,
          amount: QA_INITIAL_CREDIT.toFixed(2),
          type: "trial_bonus",
          description: QA_GRANT_DESCRIPTION,
        });
      }
      // Exercise actual $5 wallet debits, not first-match-free or Premium.
      await tx.insert(userRewards).values({
        userId: member.userId, firstMatchFreeUsed: true,
      }).onConflictDoUpdate({
        target: userRewards.userId, set: { firstMatchFreeUsed: true },
      });

      const [updated] = await tx.select({ balance: wallets.balance }).from(wallets)
        .where(eq(wallets.id, wallet.id));
      result.push({
        userId: member.userId,
        displayName: member.displayName,
        balance: updated.balance,
        credited: !grant,
      });
    }
    return result;
  });
  console.info("[Track A QA setup]", { actor, members });
  return { members, grantAmount: QA_INITIAL_CREDIT };
}

// Same lock as provisioning: overlapping QA clicks cannot double-spend or
// slip from Chapter 1 into Chapter 2 between authorization and the real handler.
export async function acquireQaActionLock(): Promise<(() => Promise<void>) | undefined> {
  const connection = await pool.connect();
  try {
    const { rows } = await connection.query("select pg_try_advisory_lock(714209, 1) as locked");
    if (!rows[0].locked) {
      connection.release();
      return undefined;
    }
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      try {
        await connection.query("select pg_advisory_unlock(714209, 1)");
        connection.release();
      } catch (error) {
        connection.release(true);
        throw error;
      }
    };
  } catch (error) {
    connection.release(true);
    throw error;
  }
}