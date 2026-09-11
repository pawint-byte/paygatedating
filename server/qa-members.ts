import { and, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { matches, profiles, transactions, userRewards, wallets, type Match } from "@shared/schema";
import { users } from "@shared/models/auth";
import { QA_GRANT_DESCRIPTION, QA_INITIAL_CREDIT, QA_MEMBERS, isQaMemberId } from "@shared/qa";
import { qaTestRewardSchema, QA_TEST_REWARD_SOURCE } from "@shared/qa-test-rewards";
import { isValidQaFixtureRecord, qaGateControlSchema } from "@shared/qa-controls";

export class QaControlError extends Error {
  constructor(message: string, readonly statusCode = 409) {
    super(message);
    this.name = "QaControlError";
  }
}

/**
 * QA control operations must never operate on a merely similarly named
 * account. Keep this validation in lockstep with the reward service: both
 * reserved users, their exact fixture profiles, and their provisioned
 * wallets must still be intact before an admin can control a match.
 */
async function validateQaFixtures(tx: any) {
  for (const member of QA_MEMBERS) {
    const [user] = await tx.select().from(users).where(eq(users.id, member.userId));
    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, member.userId));
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, member.userId));
    if (!isValidQaFixtureRecord(member.userId, { user, profile, wallet })) {
      throw new QaControlError("QA fixtures are missing or invalid. Run Setup QA members first.");
    }
  }
}

/**
 * Read-only full fixture validation for request-scoped QA impersonation.
 * Missing/invalid IDs are rejected rather than being treated as an optional
 * check, so callers cannot accidentally authorize a name-only fixture.
 */
export async function validateQaFixtureMembers(memberIds: readonly string[]) {
  if (memberIds.length === 0 || new Set(memberIds).size !== memberIds.length ||
    memberIds.some(memberId => !isQaMemberId(memberId))) {
    return false;
  }
  return db.transaction(async tx => {
    for (const memberId of memberIds) {
      const member = QA_MEMBERS.find(candidate => candidate.userId === memberId);
      if (!member) return false;
      const [user] = await tx.select().from(users).where(eq(users.id, memberId));
      const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, memberId));
      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, memberId));
      if (!isValidQaFixtureRecord(memberId, { user, profile, wallet })) return false;
    }
    return true;
  });
}

function isFixturePair(initiatorId: string, recipientId: string) {
  return isQaMemberId(initiatorId) && isQaMemberId(recipientId) && initiatorId !== recipientId;
}

/**
 * Ensure the one explicit QA pair exists without going through the ordinary
 * interest/payment path. This is deliberately separate from Setup: setup
 * provisions the fixtures and this operation only creates the fixed match.
 */
export async function ensureQaMemberMatch(actor: string): Promise<{ match: Match; created: boolean }> {
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(714209, 1)`);
    await validateQaFixtures(tx);

    // Inspect every row so either Alice -> Bob or Bob -> Alice is treated as
    // the same pair. Prefer an active existing row, then use its id for a
    // stable choice if data contains more than one historical QA match.
    const existingMatches = await tx.select().from(matches);
    const pairMatches = existingMatches
      .filter(match => isFixturePair(match.initiatorId, match.recipientId))
      .sort((left, right) => {
        const activeDifference = Number(right.status === "active") - Number(left.status === "active");
        if (activeDifference !== 0) return activeDifference;
        return left.id.localeCompare(right.id);
      });
    if (pairMatches[0]) {
      return { match: pairMatches[0], created: false };
    }

    const [match] = await tx.insert(matches).values({
      initiatorId: QA_MEMBERS[0].userId,
      recipientId: QA_MEMBERS[1].userId,
      currentGate: "gate1",
      status: "pending",
      lastActionBy: QA_MEMBERS[0].userId,
      message: "QA Alice and QA Bob test match (Admin-supervised QA fixture)",
    }).returning();
    return { match, created: true };
  });
  console.info("[Track A QA match]", { actor, matchId: result.match.id, created: result.created });
  return result;
}

/**
 * Return every match belonging to the one supported QA pair. This deliberately
 * does not select by a caller-provided participant or expose arbitrary users.
 */
export async function getQaMemberMatches() {
  return db.transaction(async tx => {
    await validateQaFixtures(tx);
    const allMatches = await tx.select().from(matches);
    return allMatches.filter(match => isFixturePair(match.initiatorId, match.recipientId));
  });
}

/**
 * Direct QA gate control is a test-state operation, not a payment operation.
 * It is serialized with setup and the other QA mutations, and only updates
 * state fields that describe the requested gate. In particular it never writes
 * gate*PaidBy, skipPaid, wallets, or transactions.
 */
export async function setQaMemberGate(actor: string, matchId: string, input: unknown) {
  const { gate } = qaGateControlSchema.parse(input);
  const updated = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(714209, 1)`);
    await validateQaFixtures(tx);

    const [match] = await tx.select().from(matches).where(eq(matches.id, matchId)).for("update");
    if (!match) {
      throw new QaControlError("QA match not found", 404);
    }
    if (!isFixturePair(match.initiatorId, match.recipientId)) {
      throw new QaControlError("Only a distinct QA Alice/QA Bob match can be controlled");
    }

    const status = gate === "gate1" ? "pending" : gate === "completed" ? "completed" : "active";
    const [result] = await tx.update(matches).set({
      currentGate: gate,
      status,
      gatePaused: false,
      gatePausedBy: null,
      updatedAt: new Date(),
    }).where(eq(matches.id, matchId)).returning();
    return result;
  });
  console.info("[Track A QA gate control]", { actor, matchId, gate });
  return updated;
}

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

// Repeatable fixture-only rewards use the same wallet increment + trial_bonus
// ledger primitive as setup. Neither setup nor payment confirmation is altered.
export async function grantQaTestRewards(actor: string, input: unknown) {
  const { amount, target } = qaTestRewardSchema.parse(input);
  const selected = target === "both" ? QA_MEMBERS : [QA_MEMBERS[target === "alice" ? 0 : 1]];
  const members = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(714209, 1)`);
    const result = [];
    for (const member of selected) {
      const [user] = await tx.select().from(users).where(eq(users.id, member.userId));
      const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, member.userId));
      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, member.userId)).for("update");
      if (!user || !profile || !wallet || user.isAdmin || user.email !== null ||
        user.firstName !== "QA" || user.lastName !== member.displayName.slice(3) ||
        profile.displayName !== member.displayName || !wallet.trialCreditsReceived) {
        throw new Error("QA fixtures are missing or invalid. Run Setup QA members first.");
      }
      const [updated] = await tx.update(wallets).set({
        balance: sql`${wallets.balance} + ${amount}`,
      }).where(eq(wallets.id, wallet.id)).returning({ balance: wallets.balance });
      await tx.insert(transactions).values({
        walletId: wallet.id,
        amount: amount.toFixed(2),
        type: "trial_bonus",
        description: `${QA_TEST_REWARD_SOURCE}: Admin QA/testing-only reward; not a payment; actor=${actor}`,
      });
      result.push({ userId: member.userId, displayName: member.displayName, balance: updated.balance });
    }
    return result;
  });
  console.info("[Track A QA test reward]", { actor, amount, target, members });
  return { source: QA_TEST_REWARD_SOURCE, amount, members };
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