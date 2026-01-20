import {
  profiles,
  wallets,
  transactions,
  matches,
  messages,
  type Profile,
  type InsertProfile,
  type Wallet,
  type InsertWallet,
  type Transaction,
  type InsertTransaction,
  type Match,
  type InsertMatch,
  type Message,
  type InsertMessage,
  GATE_COSTS,
  SKIP_AHEAD_COST,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ne, desc, sql } from "drizzle-orm";

export interface IStorage {
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileById(id: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;
  getDiscoverProfiles(userId: string): Promise<Profile[]>;

  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(userId: string, newBalance: string): Promise<Wallet | undefined>;
  getTransactions(walletId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  getMatch(id: string): Promise<Match | undefined>;
  getMatchesByUser(userId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, data: Partial<Match>): Promise<Match | undefined>;

  getMessages(matchId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updated] = await db
      .update(profiles)
      .set(data)
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getDiscoverProfiles(userId: string): Promise<Profile[]> {
    const existingMatches = await db
      .select({ recipientId: matches.recipientId, initiatorId: matches.initiatorId })
      .from(matches)
      .where(or(eq(matches.initiatorId, userId), eq(matches.recipientId, userId)));

    const excludeIds = new Set<string>([userId]);
    existingMatches.forEach((m) => {
      excludeIds.add(m.recipientId);
      excludeIds.add(m.initiatorId);
    });

    const discoverProfiles = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.isVisible, true), sql`${profiles.userId} != ${userId}`))
      .limit(50);

    return discoverProfiles.filter((p) => !excludeIds.has(p.userId));
  }

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db.insert(wallets).values(wallet).returning();
    return newWallet;
  }

  async updateWalletBalance(userId: string, newBalance: string): Promise<Wallet | undefined> {
    const [updated] = await db
      .update(wallets)
      .set({ balance: newBalance })
      .where(eq(wallets.userId, userId))
      .returning();
    return updated;
  }

  async getTransactions(walletId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.walletId, walletId))
      .orderBy(desc(transactions.createdAt))
      .limit(20);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMatchesByUser(userId: string): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(or(eq(matches.initiatorId, userId), eq(matches.recipientId, userId)))
      .orderBy(desc(matches.updatedAt));
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: string, data: Partial<Match>): Promise<Match | undefined> {
    const [updated] = await db
      .update(matches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();
    return updated;
  }

  async getMessages(matchId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.matchId, matchId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
