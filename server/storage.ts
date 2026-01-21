import {
  profiles,
  wallets,
  transactions,
  matches,
  messages,
  referrals,
  registryItems,
  giftPurchases,
  subscriptions,
  searchPreferences,
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
  type Referral,
  type InsertReferral,
  type RegistryItem,
  type InsertRegistryItem,
  type GiftPurchase,
  type InsertGiftPurchase,
  type Subscription,
  type InsertSubscription,
  type SearchPreferences,
  type InsertSearchPreferences,
  TRIAL_CREDITS_AMOUNT,
  REFERRAL_BONUS_AMOUNT,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, gte, lte, ne, inArray } from "drizzle-orm";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface IStorage {
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileById(id: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;
  getDiscoverProfiles(userId: string): Promise<Profile[]>;

  getWallet(userId: string): Promise<Wallet | undefined>;
  getWalletByReferralCode(code: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(userId: string, newBalance: string): Promise<Wallet | undefined>;
  markTrialCreditsReceived(userId: string): Promise<Wallet | undefined>;
  getTransactions(walletId: string): Promise<Transaction[]>;
  getTransactionByStripeSessionId(sessionId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  getMatch(id: string): Promise<Match | undefined>;
  getMatchesByUser(userId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, data: Partial<Match>): Promise<Match | undefined>;

  getMessages(matchId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralByReferredUser(userId: string): Promise<Referral | undefined>;
  getReferralsByReferrer(userId: string): Promise<Referral[]>;
  markReferralBonusPaid(id: string): Promise<Referral | undefined>;

  getRegistryItems(userId: string): Promise<RegistryItem[]>;
  getRegistryItem(id: string): Promise<RegistryItem | undefined>;
  createRegistryItem(item: InsertRegistryItem): Promise<RegistryItem>;
  updateRegistryItem(id: string, data: Partial<RegistryItem>): Promise<RegistryItem | undefined>;
  deleteRegistryItem(id: string): Promise<boolean>;

  getGiftPurchase(id: string): Promise<GiftPurchase | undefined>;
  getGiftPurchasesByBuyer(userId: string): Promise<GiftPurchase[]>;
  getGiftPurchasesByRecipient(userId: string): Promise<GiftPurchase[]>;
  createGiftPurchase(purchase: InsertGiftPurchase): Promise<GiftPurchase>;
  updateGiftPurchase(id: string, data: Partial<GiftPurchase>): Promise<GiftPurchase | undefined>;

  getSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  getSubscriptionByCustomerId(stripeCustomerId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;

  getSearchPreferences(userId: string): Promise<SearchPreferences | undefined>;
  upsertSearchPreferences(prefs: InsertSearchPreferences): Promise<SearchPreferences>;
  getFilteredProfiles(userId: string, prefs: SearchPreferences): Promise<Profile[]>;
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

  async getWalletByReferralCode(code: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.referralCode, code.toUpperCase()));
    return wallet;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const referralCode = generateReferralCode();
    const [newWallet] = await db.insert(wallets).values({
      ...wallet,
      referralCode,
    }).returning();
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

  async markTrialCreditsReceived(userId: string): Promise<Wallet | undefined> {
    const [updated] = await db
      .update(wallets)
      .set({ trialCreditsReceived: true })
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

  async getTransactionByStripeSessionId(sessionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.stripeSessionId, sessionId));
    return transaction;
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

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getReferralByReferredUser(userId: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referredUserId, userId));
    return referral;
  }

  async getReferralsByReferrer(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerUserId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async markReferralBonusPaid(id: string): Promise<Referral | undefined> {
    const [updated] = await db
      .update(referrals)
      .set({ bonusPaid: true })
      .where(eq(referrals.id, id))
      .returning();
    return updated;
  }

  async getRegistryItems(userId: string): Promise<RegistryItem[]> {
    return await db
      .select()
      .from(registryItems)
      .where(eq(registryItems.userId, userId))
      .orderBy(desc(registryItems.createdAt));
  }

  async getRegistryItem(id: string): Promise<RegistryItem | undefined> {
    const [item] = await db.select().from(registryItems).where(eq(registryItems.id, id));
    return item;
  }

  async createRegistryItem(item: InsertRegistryItem): Promise<RegistryItem> {
    const [newItem] = await db.insert(registryItems).values(item).returning();
    return newItem;
  }

  async updateRegistryItem(id: string, data: Partial<RegistryItem>): Promise<RegistryItem | undefined> {
    const [updated] = await db
      .update(registryItems)
      .set(data)
      .where(eq(registryItems.id, id))
      .returning();
    return updated;
  }

  async deleteRegistryItem(id: string): Promise<boolean> {
    const result = await db.delete(registryItems).where(eq(registryItems.id, id));
    return true;
  }

  async getGiftPurchase(id: string): Promise<GiftPurchase | undefined> {
    const [purchase] = await db.select().from(giftPurchases).where(eq(giftPurchases.id, id));
    return purchase;
  }

  async getGiftPurchasesByBuyer(userId: string): Promise<GiftPurchase[]> {
    return await db
      .select()
      .from(giftPurchases)
      .where(eq(giftPurchases.buyerUserId, userId))
      .orderBy(desc(giftPurchases.createdAt));
  }

  async getGiftPurchasesByRecipient(userId: string): Promise<GiftPurchase[]> {
    return await db
      .select()
      .from(giftPurchases)
      .where(eq(giftPurchases.recipientUserId, userId))
      .orderBy(desc(giftPurchases.createdAt));
  }

  async createGiftPurchase(purchase: InsertGiftPurchase): Promise<GiftPurchase> {
    const [newPurchase] = await db.insert(giftPurchases).values(purchase).returning();
    return newPurchase;
  }

  async updateGiftPurchase(id: string, data: Partial<GiftPurchase>): Promise<GiftPurchase | undefined> {
    const [updated] = await db
      .update(giftPurchases)
      .set(data)
      .where(eq(giftPurchases.id, id))
      .returning();
    return updated;
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async getSubscriptionByCustomerId(stripeCustomerId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, stripeCustomerId));
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return updated;
  }

  async getSearchPreferences(userId: string): Promise<SearchPreferences | undefined> {
    const [prefs] = await db.select().from(searchPreferences).where(eq(searchPreferences.userId, userId));
    return prefs;
  }

  async upsertSearchPreferences(prefs: InsertSearchPreferences): Promise<SearchPreferences> {
    const existing = await this.getSearchPreferences(prefs.userId);
    if (existing) {
      const [updated] = await db
        .update(searchPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(searchPreferences.userId, prefs.userId))
        .returning();
      return updated;
    }
    const [newPrefs] = await db.insert(searchPreferences).values(prefs).returning();
    return newPrefs;
  }

  async getFilteredProfiles(userId: string, prefs: SearchPreferences): Promise<Profile[]> {
    const userProfile = await this.getProfile(userId);
    
    const conditions = [
      ne(profiles.userId, userId),
      eq(profiles.isVisible, true),
    ];

    if (prefs.minAge) {
      conditions.push(gte(profiles.age, prefs.minAge));
    }
    if (prefs.maxAge) {
      conditions.push(lte(profiles.age, prefs.maxAge));
    }
    if (prefs.genderPreference && prefs.genderPreference.length > 0) {
      conditions.push(inArray(profiles.gender, prefs.genderPreference));
    }

    let results = await db
      .select()
      .from(profiles)
      .where(and(...conditions))
      .limit(100);

    if (userProfile?.latitude && userProfile?.longitude && prefs.maxDistance) {
      const userLat = parseFloat(userProfile.latitude);
      const userLon = parseFloat(userProfile.longitude);
      const maxDist = prefs.maxDistance;

      results = results.filter(profile => {
        if (!profile.latitude || !profile.longitude) return true;
        const distance = this.calculateDistance(
          userLat, userLon,
          parseFloat(profile.latitude), parseFloat(profile.longitude)
        );
        return distance <= maxDist;
      });
    }

    return results.slice(0, 50);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const storage = new DatabaseStorage();
