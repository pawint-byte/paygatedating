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
  connections,
  users,
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
  type Connection,
  type InsertConnection,
  feedback,
  type Feedback,
  type InsertFeedback,
  datePlans,
  type DatePlan,
  type InsertDatePlan,
  cryptoPayments,
  type CryptoPayment,
  type InsertCryptoPayment,
  userRewards,
  rewardHistory,
  type UserRewards,
  type InsertUserRewards,
  type RewardHistory,
  type InsertRewardHistory,
  type UpdateProfile,
  TRIAL_CREDITS_AMOUNT,
  REFERRAL_BONUS_AMOUNT,
  PROMO_CONSTANTS,
  callLogs,
  ghostReports,
  type CallLog,
  type InsertCallLog,
  type GhostReport,
  type InsertGhostReport,
  GIFT_PROTECTION,
  gatePullRequests,
  type GatePullRequest,
  type InsertGatePullRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, gte, lte, lt, ne, inArray } from "drizzle-orm";

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
  updateProfile(userId: string, data: UpdateProfile): Promise<Profile | undefined>;
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
  getActiveMatches(userId: string): Promise<Match[]>;
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
  
  // Live Nearby Feature
  getLiveProfiles(userId: string, lat: number, lng: number, radiusKm: number): Promise<Profile[]>;
  updateLiveStatus(userId: string, isLive: boolean, lat?: number, lng?: number): Promise<Profile | undefined>;
  
  // Connections (Friends-of-Friends)
  getConnections(userId: string): Promise<Connection[]>;
  getConnection(userId: string, connectedUserId: string): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  createConnectionIfNotExists(userId: string, connectedUserId: string, matchId: string): Promise<Connection | undefined>;
  getMutualConnections(userId: string, otherUserId: string): Promise<Profile[]>;
  getFriendsOfFriends(userId: string): Promise<{ profile: Profile; mutualCount: number; throughUsers: string[] }[]>;
  
  // Activity Tracking
  updateLastActive(userId: string): Promise<Profile | undefined>;
  getInactiveProfiles(daysSinceActive: number): Promise<Profile[]>;
  
  // Feedback / Support
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackByUser(userId: string): Promise<Feedback[]>;
  
  // Admin
  getAllFeedback(): Promise<Feedback[]>;
  updateFeedbackStatus(feedbackId: string, status: string): Promise<Feedback | undefined>;
  isUserAdmin(userId: string): Promise<boolean>;
  
  // Date Plans
  createDatePlan(datePlan: InsertDatePlan): Promise<DatePlan>;
  getDatePlansByMatch(matchId: string): Promise<DatePlan[]>;
  getDatePlanById(id: string): Promise<DatePlan | undefined>;
  updateDatePlanStatus(id: string, status: string): Promise<DatePlan | undefined>;
  
  // Crypto Payments
  getCryptoPayment(id: string): Promise<CryptoPayment | undefined>;
  getCryptoPaymentByInvoiceId(invoiceId: string): Promise<CryptoPayment | undefined>;
  getCryptoPaymentByOrderId(orderId: string): Promise<CryptoPayment | undefined>;
  getCryptoPaymentsByUser(userId: string): Promise<CryptoPayment[]>;
  createCryptoPayment(payment: InsertCryptoPayment): Promise<CryptoPayment>;
  updateCryptoPayment(id: string, data: Partial<CryptoPayment>): Promise<CryptoPayment | undefined>;
  markCryptoPaymentCredited(id: string): Promise<CryptoPayment | undefined>;
  
  // Rewards System
  getUserRewards(userId: string): Promise<UserRewards | undefined>;
  createUserRewards(userId: string): Promise<UserRewards>;
  updateUserRewards(userId: string, data: Partial<UserRewards>): Promise<UserRewards | undefined>;
  recordLoginStreak(userId: string): Promise<{ streakUpdated: boolean; newStreak: number; rewardEarned: boolean }>;
  incrementReferralCount(referrerUserId: string): Promise<{ tierReached: string | null; premiumDays: number }>;
  claimProfileCompletionReward(userId: string): Promise<boolean>;
  useFirstMatchFree(userId: string): Promise<boolean>;
  getRewardHistory(userId: string): Promise<RewardHistory[]>;
  addRewardHistory(reward: InsertRewardHistory): Promise<RewardHistory>;
  checkAndUpdatePremiumStatus(userId: string): Promise<boolean>;
  applySeasonalTrial(userId: string): Promise<number>;

  // Call Logs
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  getCallLog(id: string): Promise<CallLog | undefined>;
  getCallLogsByMatch(matchId: string): Promise<CallLog[]>;
  getConfirmedCallBetweenUsers(userId1: string, userId2: string): Promise<CallLog | undefined>;
  updateCallLog(id: string, data: Partial<CallLog>): Promise<CallLog | undefined>;

  // Ghost Reports
  createGhostReport(report: InsertGhostReport): Promise<GhostReport>;
  getGhostReportsByReported(userId: string): Promise<GhostReport[]>;
  getGhostReportCount(userId: string): Promise<number>;

  // Read Receipts
  markMessagesAsRead(matchId: string, readerUserId: string): Promise<void>;

  // Gate Pull Requests
  createGatePullRequest(request: InsertGatePullRequest): Promise<GatePullRequest>;
  getGatePullRequests(matchId: string): Promise<GatePullRequest[]>;
  getPendingPullRequest(matchId: string): Promise<GatePullRequest | undefined>;
  updateGatePullRequest(id: string, data: Partial<GatePullRequest>): Promise<GatePullRequest | undefined>;
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

  async updateProfile(userId: string, data: UpdateProfile): Promise<Profile | undefined> {
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

  async getActiveMatches(userId: string): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.initiatorId, userId), eq(matches.recipientId, userId)),
          eq(matches.status, "active")
        )
      )
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

  async getGiftPurchaseBySessionId(sessionId: string): Promise<GiftPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(giftPurchases)
      .where(eq(giftPurchases.stripeSessionId, sessionId));
    return purchase;
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

  // Live Nearby Feature
  async getLiveProfiles(userId: string, lat: number, lng: number, radiusKm: number): Promise<Profile[]> {
    // Get profiles that are live and visible
    const liveProfiles = await db
      .select()
      .from(profiles)
      .where(and(
        eq(profiles.isLive, true),
        eq(profiles.isVisible, true),
        ne(profiles.userId, userId)
      ))
      .limit(100);

    // Filter by distance (radius in km, convert to miles for calculation)
    const radiusMiles = radiusKm * 0.621371;
    return liveProfiles.filter(profile => {
      if (!profile.latitude || !profile.longitude) return false;
      const distance = this.calculateDistance(
        lat, lng,
        parseFloat(profile.latitude), parseFloat(profile.longitude)
      );
      return distance <= radiusMiles;
    });
  }

  async updateLiveStatus(userId: string, isLive: boolean, lat?: number, lng?: number): Promise<Profile | undefined> {
    const updateData: Partial<Profile> = {
      isLive,
      locationUpdatedAt: new Date(),
    };
    
    if (lat !== undefined && lng !== undefined) {
      updateData.latitude = lat.toString();
      updateData.longitude = lng.toString();
    }
    
    const [updated] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.userId, userId))
      .returning();
    
    return updated;
  }

  // Connections (Friends-of-Friends)
  async getConnections(userId: string): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .where(eq(connections.userId, userId));
  }

  async getConnection(userId: string, connectedUserId: string): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(and(
        eq(connections.userId, userId),
        eq(connections.connectedUserId, connectedUserId)
      ));
    return connection;
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db.insert(connections).values(connection).returning();
    return newConnection;
  }

  async createConnectionIfNotExists(userId: string, connectedUserId: string, matchId: string): Promise<Connection | undefined> {
    // Check if connection already exists first
    const existing = await this.getConnection(userId, connectedUserId);
    if (existing) return existing;
    
    // Try to create, handling potential race condition via unique constraint
    try {
      const [newConnection] = await db.insert(connections).values({
        userId,
        connectedUserId,
        status: "connected",
        matchId,
      }).returning();
      return newConnection;
    } catch (error: any) {
      // If duplicate key error, just return undefined (connection already exists)
      if (error?.code === "23505") { // PostgreSQL unique violation
        return await this.getConnection(userId, connectedUserId);
      }
      throw error;
    }
  }

  async getMutualConnections(userId: string, otherUserId: string): Promise<Profile[]> {
    // Get user's connections
    const userConnections = await db
      .select({ connectedUserId: connections.connectedUserId })
      .from(connections)
      .where(eq(connections.userId, userId));
    
    const userConnectedIds = new Set(userConnections.map(c => c.connectedUserId));
    
    // Get other user's connections
    const otherConnections = await db
      .select({ connectedUserId: connections.connectedUserId })
      .from(connections)
      .where(eq(connections.userId, otherUserId));
    
    // Find intersection
    const mutualIds = otherConnections
      .map(c => c.connectedUserId)
      .filter(id => userConnectedIds.has(id));
    
    if (mutualIds.length === 0) return [];
    
    return await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, mutualIds));
  }

  async getFriendsOfFriends(userId: string): Promise<{ profile: Profile; mutualCount: number; throughUsers: string[] }[]> {
    // Get direct connections
    const directConnections = await db
      .select({ connectedUserId: connections.connectedUserId })
      .from(connections)
      .where(eq(connections.userId, userId));
    
    const directIds = new Set(directConnections.map(c => c.connectedUserId));
    directIds.add(userId); // Exclude self
    
    // For each connection, get their connections (2nd degree)
    const secondDegree: Map<string, string[]> = new Map();
    
    for (const conn of directConnections) {
      const theirConnections = await db
        .select({ connectedUserId: connections.connectedUserId })
        .from(connections)
        .where(eq(connections.userId, conn.connectedUserId));
      
      for (const c of theirConnections) {
        if (!directIds.has(c.connectedUserId)) {
          const existing = secondDegree.get(c.connectedUserId) || [];
          existing.push(conn.connectedUserId);
          secondDegree.set(c.connectedUserId, existing);
        }
      }
    }
    
    if (secondDegree.size === 0) return [];
    
    // Get profiles for 2nd degree connections
    const fofProfiles = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, Array.from(secondDegree.keys())));
    
    return fofProfiles.map(profile => ({
      profile,
      mutualCount: secondDegree.get(profile.userId)?.length || 0,
      throughUsers: secondDegree.get(profile.userId) || [],
    }));
  }

  // Activity Tracking
  async updateLastActive(userId: string): Promise<Profile | undefined> {
    const [updated] = await db
      .update(profiles)
      .set({ lastActiveAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getInactiveProfiles(daysSinceActive: number): Promise<Profile[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceActive);
    
    // Get profiles that are either:
    // 1. Never been active (lastActiveAt is null) and created more than X days ago
    // 2. Last active more than X days ago
    const inactiveProfiles = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.isVisible, true),
          or(
            and(
              sql`${profiles.lastActiveAt} IS NULL`,
              lt(profiles.createdAt, cutoffDate)
            ),
            lt(profiles.lastActiveAt, cutoffDate)
          )
        )
      )
      .limit(100);
    
    return inactiveProfiles;
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

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async updateFeedbackStatus(feedbackId: string, status: string): Promise<Feedback | undefined> {
    const [updated] = await db
      .update(feedback)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(feedback.id, feedbackId))
      .returning();
    return updated;
  }

  async isUserAdmin(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.isAdmin ?? false;
  }

  async createDatePlan(datePlan: InsertDatePlan): Promise<DatePlan> {
    const [newDatePlan] = await db.insert(datePlans).values(datePlan).returning();
    return newDatePlan;
  }

  async getDatePlansByMatch(matchId: string): Promise<DatePlan[]> {
    return await db.select().from(datePlans).where(eq(datePlans.matchId, matchId)).orderBy(desc(datePlans.createdAt));
  }

  async getDatePlanById(id: string): Promise<DatePlan | undefined> {
    const [datePlan] = await db.select().from(datePlans).where(eq(datePlans.id, id));
    return datePlan;
  }

  async updateDatePlanStatus(id: string, status: string): Promise<DatePlan | undefined> {
    const [updated] = await db
      .update(datePlans)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(datePlans.id, id))
      .returning();
    return updated;
  }

  async getCryptoPayment(id: string): Promise<CryptoPayment | undefined> {
    const [payment] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, id));
    return payment;
  }

  async getCryptoPaymentByInvoiceId(invoiceId: string): Promise<CryptoPayment | undefined> {
    const [payment] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.invoiceId, invoiceId));
    return payment;
  }

  async getCryptoPaymentByOrderId(orderId: string): Promise<CryptoPayment | undefined> {
    const [payment] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.orderId, orderId));
    return payment;
  }

  async getCryptoPaymentsByUser(userId: string): Promise<CryptoPayment[]> {
    return await db.select().from(cryptoPayments).where(eq(cryptoPayments.userId, userId)).orderBy(desc(cryptoPayments.createdAt));
  }

  async createCryptoPayment(payment: InsertCryptoPayment): Promise<CryptoPayment> {
    const [newPayment] = await db.insert(cryptoPayments).values(payment).returning();
    return newPayment;
  }

  async updateCryptoPayment(id: string, data: Partial<CryptoPayment>): Promise<CryptoPayment | undefined> {
    const [updated] = await db
      .update(cryptoPayments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cryptoPayments.id, id))
      .returning();
    return updated;
  }

  async markCryptoPaymentCredited(id: string): Promise<CryptoPayment | undefined> {
    const [updated] = await db
      .update(cryptoPayments)
      .set({ credited: true, creditedAt: new Date(), updatedAt: new Date() })
      .where(eq(cryptoPayments.id, id))
      .returning();
    return updated;
  }

  // Rewards System Implementation
  async getUserRewards(userId: string): Promise<UserRewards | undefined> {
    const [rewards] = await db.select().from(userRewards).where(eq(userRewards.userId, userId));
    return rewards;
  }

  async createUserRewards(userId: string): Promise<UserRewards> {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    // Determine trial days based on season
    let trialDays: number = PROMO_CONSTANTS.DEFAULT_TRIAL_DAYS;
    if (month >= PROMO_CONSTANTS.CUFFING_SEASON_START && month <= PROMO_CONSTANTS.CUFFING_SEASON_END) {
      trialDays = PROMO_CONSTANTS.CUFFING_SEASON_TRIAL_DAYS;
    }
    
    const [newRewards] = await db.insert(userRewards).values({
      userId,
      trialDays: trialDays as any,
      trialStartedAt: now,
      premiumExpiresAt: new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000),
      monthlyReferralsResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }).returning();
    
    return newRewards;
  }

  async updateUserRewards(userId: string, data: Partial<UserRewards>): Promise<UserRewards | undefined> {
    const [updated] = await db
      .update(userRewards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userRewards.userId, userId))
      .returning();
    return updated;
  }

  async recordLoginStreak(userId: string): Promise<{ streakUpdated: boolean; newStreak: number; rewardEarned: boolean }> {
    let rewards = await this.getUserRewards(userId);
    if (!rewards) {
      rewards = await this.createUserRewards(userId);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = rewards.lastLoginDate ? new Date(rewards.lastLoginDate) : null;
    const lastLoginDay = lastLogin ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()) : null;

    // Check if already logged in today
    if (lastLoginDay && lastLoginDay.getTime() === today.getTime()) {
      return { streakUpdated: false, newStreak: rewards.loginStreak, rewardEarned: false };
    }

    // Check if streak continues (logged in yesterday)
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    let newStreak = 1;
    if (lastLoginDay && lastLoginDay.getTime() === yesterday.getTime()) {
      newStreak = rewards.loginStreak + 1;
    }

    // Check if streak reward earned
    let rewardEarned = false;
    if (newStreak >= PROMO_CONSTANTS.STREAK_DAYS_FOR_REWARD && 
        newStreak % PROMO_CONSTANTS.STREAK_DAYS_FOR_REWARD === 0) {
      // Award credits for each 7-day streak completion
      const wallet = await this.getWallet(userId);
      if (wallet) {
        const newBalance = (parseFloat(wallet.balance) + PROMO_CONSTANTS.STREAK_CREDITS_REWARD).toFixed(2);
        await this.updateWalletBalance(userId, newBalance);
        await this.createTransaction({
          walletId: wallet.id,
          amount: PROMO_CONSTANTS.STREAK_CREDITS_REWARD.toString(),
          type: "referral_bonus",
          description: `7-day login streak reward`,
        });
        rewardEarned = true;
        
        await this.addRewardHistory({
          userId,
          rewardType: "login_streak",
          description: `Completed ${newStreak}-day login streak`,
          creditsAwarded: PROMO_CONSTANTS.STREAK_CREDITS_REWARD.toString(),
        });
      }
    }

    // Update streak
    const longestStreak = Math.max(rewards.longestStreak, newStreak);
    await this.updateUserRewards(userId, {
      loginStreak: newStreak,
      lastLoginDate: now,
      longestStreak,
      streakRewardsClaimedCount: rewardEarned ? rewards.streakRewardsClaimedCount + 1 : rewards.streakRewardsClaimedCount,
    });

    return { streakUpdated: true, newStreak, rewardEarned };
  }

  async incrementReferralCount(referrerUserId: string): Promise<{ tierReached: string | null; premiumDays: number }> {
    let rewards = await this.getUserRewards(referrerUserId);
    if (!rewards) {
      rewards = await this.createUserRewards(referrerUserId);
    }

    const now = new Date();
    
    // Reset monthly if needed
    let monthlyReferrals = rewards.monthlyReferrals;
    if (rewards.monthlyReferralsResetAt && new Date(rewards.monthlyReferralsResetAt) <= now) {
      monthlyReferrals = 0;
    }

    const newTotalReferrals = rewards.totalReferrals + 1;
    const newMonthlyReferrals = monthlyReferrals + 1;

    let tierReached: string | null = null;
    let premiumDays = 0;

    // Check milestone (5 this month = lifetime)
    if (newMonthlyReferrals >= PROMO_CONSTANTS.REFERRAL_MONTHLY_MILESTONE && !rewards.hasLifetimePremium) {
      tierReached = "lifetime";
      await this.updateUserRewards(referrerUserId, {
        totalReferrals: newTotalReferrals,
        monthlyReferrals: newMonthlyReferrals,
        hasLifetimePremium: true,
        monthlyReferralsResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      });
      
      await this.addRewardHistory({
        userId: referrerUserId,
        rewardType: "referral_milestone",
        description: `Referred ${PROMO_CONSTANTS.REFERRAL_MONTHLY_MILESTONE} users this month - Lifetime Premium earned!`,
      });
      
      // Update profile to premium
      await this.updateProfile(referrerUserId, { subscriptionTier: "premium", isPremiumSince: now });
      
      return { tierReached: "lifetime", premiumDays: 0 };
    }

    // Check tier 2 (10 total = 1 month)
    if (newTotalReferrals === PROMO_CONSTANTS.REFERRAL_TIER_2_COUNT) {
      tierReached = "tier_2";
      premiumDays = PROMO_CONSTANTS.REFERRAL_TIER_2_PREMIUM_DAYS;
    }
    // Check tier 1 (3 total = 1 week)
    else if (newTotalReferrals === PROMO_CONSTANTS.REFERRAL_TIER_1_COUNT) {
      tierReached = "tier_1";
      premiumDays = PROMO_CONSTANTS.REFERRAL_TIER_1_PREMIUM_DAYS;
    }

    // Apply premium days if earned
    if (premiumDays > 0) {
      const currentExpiry = rewards.premiumExpiresAt ? new Date(rewards.premiumExpiresAt) : now;
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseDate.getTime() + premiumDays * 24 * 60 * 60 * 1000);
      
      await this.updateUserRewards(referrerUserId, {
        totalReferrals: newTotalReferrals,
        monthlyReferrals: newMonthlyReferrals,
        premiumExpiresAt: newExpiry,
        monthlyReferralsResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      });
      
      await this.addRewardHistory({
        userId: referrerUserId,
        rewardType: tierReached === "tier_2" ? "referral_tier_2" : "referral_tier_1",
        description: `Reached ${newTotalReferrals} referrals - ${premiumDays} days Premium earned!`,
        premiumDaysAwarded: premiumDays,
      });
      
      // Ensure profile is premium
      await this.updateProfile(referrerUserId, { subscriptionTier: "premium", isPremiumSince: now });
    } else {
      await this.updateUserRewards(referrerUserId, {
        totalReferrals: newTotalReferrals,
        monthlyReferrals: newMonthlyReferrals,
        monthlyReferralsResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      });
    }

    return { tierReached, premiumDays };
  }

  async claimProfileCompletionReward(userId: string): Promise<boolean> {
    let rewards = await this.getUserRewards(userId);
    if (!rewards) {
      rewards = await this.createUserRewards(userId);
    }

    if (rewards.profileCompletionRewardClaimed) {
      return false;
    }

    const now = new Date();
    const currentExpiry = rewards.premiumExpiresAt ? new Date(rewards.premiumExpiresAt) : now;
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + PROMO_CONSTANTS.PROFILE_COMPLETION_PREMIUM_DAYS * 24 * 60 * 60 * 1000);

    await this.updateUserRewards(userId, {
      profileCompletionRewardClaimed: true,
      premiumExpiresAt: newExpiry,
    });

    await this.addRewardHistory({
      userId,
      rewardType: "profile_completion",
      description: `100% profile completion - ${PROMO_CONSTANTS.PROFILE_COMPLETION_PREMIUM_DAYS} days Premium earned!`,
      premiumDaysAwarded: PROMO_CONSTANTS.PROFILE_COMPLETION_PREMIUM_DAYS,
    });

    await this.updateProfile(userId, { subscriptionTier: "premium", isPremiumSince: now });

    return true;
  }

  async useFirstMatchFree(userId: string): Promise<boolean> {
    let rewards = await this.getUserRewards(userId);
    if (!rewards) {
      rewards = await this.createUserRewards(userId);
    }

    if (rewards.firstMatchFreeUsed) {
      return false;
    }

    await this.updateUserRewards(userId, { firstMatchFreeUsed: true });

    await this.addRewardHistory({
      userId,
      rewardType: "first_match_free",
      description: "First match Gate 1 free!",
    });

    return true;
  }

  async getRewardHistory(userId: string): Promise<RewardHistory[]> {
    return await db.select().from(rewardHistory).where(eq(rewardHistory.userId, userId)).orderBy(desc(rewardHistory.createdAt));
  }

  async addRewardHistory(reward: InsertRewardHistory): Promise<RewardHistory> {
    const [newReward] = await db.insert(rewardHistory).values(reward).returning();
    return newReward;
  }

  async checkAndUpdatePremiumStatus(userId: string): Promise<boolean> {
    const rewards = await this.getUserRewards(userId);
    if (!rewards) return false;

    if (rewards.hasLifetimePremium) {
      return true;
    }

    const now = new Date();
    if (rewards.premiumExpiresAt && new Date(rewards.premiumExpiresAt) > now) {
      return true;
    }

    // Premium expired, downgrade to free
    await this.updateProfile(userId, { subscriptionTier: "free" });
    return false;
  }

  async applySeasonalTrial(userId: string): Promise<number> {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    let trialDays: number = PROMO_CONSTANTS.DEFAULT_TRIAL_DAYS;
    if (month >= PROMO_CONSTANTS.CUFFING_SEASON_START && month <= PROMO_CONSTANTS.CUFFING_SEASON_END) {
      trialDays = PROMO_CONSTANTS.CUFFING_SEASON_TRIAL_DAYS;
    }
    
    return trialDays;
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const [created] = await db.insert(callLogs).values(log).returning();
    return created;
  }

  async getCallLog(id: string): Promise<CallLog | undefined> {
    const [log] = await db.select().from(callLogs).where(eq(callLogs.id, id));
    return log;
  }

  async getCallLogsByMatch(matchId: string): Promise<CallLog[]> {
    return db.select().from(callLogs).where(eq(callLogs.matchId, matchId)).orderBy(desc(callLogs.createdAt));
  }

  async getConfirmedCallBetweenUsers(userId1: string, userId2: string): Promise<CallLog | undefined> {
    const [log] = await db.select().from(callLogs).where(
      and(
        eq(callLogs.status, "confirmed"),
        or(
          and(eq(callLogs.initiatorId, userId1), eq(callLogs.recipientId, userId2)),
          and(eq(callLogs.initiatorId, userId2), eq(callLogs.recipientId, userId1))
        )
      )
    );
    return log;
  }

  async updateCallLog(id: string, data: Partial<CallLog>): Promise<CallLog | undefined> {
    const [updated] = await db.update(callLogs).set(data).where(eq(callLogs.id, id)).returning();
    return updated;
  }

  async createGhostReport(report: InsertGhostReport): Promise<GhostReport> {
    const [created] = await db.insert(ghostReports).values(report).returning();
    return created;
  }

  async getGhostReportsByReported(userId: string): Promise<GhostReport[]> {
    return db.select().from(ghostReports).where(eq(ghostReports.reportedUserId, userId)).orderBy(desc(ghostReports.createdAt));
  }

  async getGhostReportCount(userId: string): Promise<number> {
    const reports = await db.select().from(ghostReports).where(
      and(
        eq(ghostReports.reportedUserId, userId),
        eq(ghostReports.status, "open")
      )
    );
    return reports.length;
  }

  async markMessagesAsRead(matchId: string, readerUserId: string): Promise<void> {
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.matchId, matchId),
          sql`${messages.senderId} != ${readerUserId}`,
          sql`${messages.readAt} IS NULL`
        )
      );
  }

  async createGatePullRequest(request: InsertGatePullRequest): Promise<GatePullRequest> {
    const [created] = await db.insert(gatePullRequests).values(request).returning();
    return created;
  }

  async getGatePullRequests(matchId: string): Promise<GatePullRequest[]> {
    return db.select().from(gatePullRequests).where(eq(gatePullRequests.matchId, matchId)).orderBy(desc(gatePullRequests.createdAt));
  }

  async getPendingPullRequest(matchId: string): Promise<GatePullRequest | undefined> {
    const [request] = await db.select().from(gatePullRequests).where(
      and(
        eq(gatePullRequests.matchId, matchId),
        eq(gatePullRequests.status, "pending")
      )
    );
    return request;
  }

  async updateGatePullRequest(id: string, data: Partial<GatePullRequest>): Promise<GatePullRequest | undefined> {
    const [updated] = await db.update(gatePullRequests).set(data).where(eq(gatePullRequests.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
