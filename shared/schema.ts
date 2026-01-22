import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "premium"]);
export const gateStageEnum = pgEnum("gate_stage", ["gate1", "gate2", "gate3", "gate4", "gate5", "completed"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "gate_payment", "refund", "subscription", "trial_bonus", "referral_bonus", "crypto_deposit"]);

export const cryptoPaymentStatusEnum = pgEnum("crypto_payment_status", ["waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "refunded", "expired"]);
export const matchStatusEnum = pgEnum("match_status", ["pending", "active", "declined", "completed"]);
export const verificationStatusEnum = pgEnum("verification_status", ["none", "pending", "verified", "rejected"]);

export const TRIAL_CREDITS_AMOUNT = 15;
export const REFERRAL_BONUS_AMOUNT = 5;

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 50 }),
  location: varchar("location", { length: 100 }),
  bio: text("bio"),
  tagline: varchar("tagline", { length: 200 }),
  lookingFor: varchar("looking_for", { length: 100 }),
  interests: text("interests").array(),
  hobbies: text("hobbies").array(),
  mustHaves: text("must_haves").array(),
  dealBreakers: text("deal_breakers").array(),
  photos: text("photos").array(),
  videos: text("videos").array(),
  facetimeAvailable: boolean("facetime_available").default(false),
  
  // Physical Attributes
  height: varchar("height", { length: 20 }),
  bodyType: varchar("body_type", { length: 50 }),
  eyeColor: varchar("eye_color", { length: 30 }),
  hairColor: varchar("hair_color", { length: 30 }),
  ethnicity: varchar("ethnicity", { length: 50 }),
  
  // Lifestyle
  smoking: varchar("smoking", { length: 30 }),
  drinking: varchar("drinking", { length: 30 }),
  exercise: varchar("exercise", { length: 30 }),
  diet: varchar("diet", { length: 50 }),
  
  // Background
  education: varchar("education", { length: 100 }),
  occupation: varchar("occupation", { length: 100 }),
  income: varchar("income", { length: 50 }),
  religion: varchar("religion", { length: 50 }),
  politics: varchar("politics", { length: 50 }),
  languages: text("languages").array(),
  
  // Relationship
  relationshipStatus: varchar("relationship_status", { length: 50 }),
  hasKids: varchar("has_kids", { length: 30 }),
  wantsKids: varchar("wants_kids", { length: 30 }),
  
  // Zodiac (optional fun)
  zodiacSign: varchar("zodiac_sign", { length: 20 }),
  
  // ID Verification
  verificationStatus: verificationStatusEnum("verification_status").default("none").notNull(),
  verificationPhoto: text("verification_photo"),
  verifiedAt: timestamp("verified_at"),
  verificationAttempts: integer("verification_attempts").default(0).notNull(),
  verificationRejectionReason: text("verification_rejection_reason"),
  
  // Geolocation
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  city: varchar("city", { length: 100 }),
  
  // Live Nearby Feature
  isLive: boolean("is_live").default(false).notNull(),
  locationUpdatedAt: timestamp("location_updated_at"),
  
  // Social Media Links
  socialLinks: jsonb("social_links").$type<{
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    snapchat?: string;
  }>(),
  
  // Visibility Settings - what's shown before gate progression
  showPhotoPublicly: boolean("show_photo_publicly").default(true).notNull(),
  showLocationPublicly: boolean("show_location_publicly").default(true).notNull(),
  showFirstNamePublicly: boolean("show_first_name_publicly").default(true).notNull(),
  showAgePublicly: boolean("show_age_publicly").default(true).notNull(),
  showRegistryPublicly: boolean("show_registry_publicly").default(false).notNull(),
  showInterestsPublicly: boolean("show_interests_publicly").default(true).notNull(),
  
  // Date Preferences
  datePreferences: text("date_preferences").array(),
  dateBlacklist: text("date_blacklist").array(),
  dateBudgetFloor: integer("date_budget_floor"),
  dateBudgetCeiling: integer("date_budget_ceiling"),
  
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free").notNull(),
  isPremiumSince: timestamp("is_premium_since"),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  trialCreditsReceived: boolean("trial_credits_received").default(false).notNull(),
  referralCode: varchar("referral_code", { length: 10 }).unique(),
  referredBy: varchar("referred_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull(),
  referredUserId: varchar("referred_user_id").notNull().unique(),
  bonusPaid: boolean("bonus_paid").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description"),
  relatedMatchId: varchar("related_match_id"),
  stripeSessionId: varchar("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initiatorId: varchar("initiator_id").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  currentGate: gateStageEnum("current_gate").default("gate1").notNull(),
  status: matchStatusEnum("status").default("pending").notNull(),
  lastActionBy: varchar("last_action_by"),
  skipPaid: boolean("skip_paid").default(false).notNull(),
  message: text("message"),
  gate1PaidBy: varchar("gate1_paid_by"),
  gate2PaidBy: varchar("gate2_paid_by"),
  gate3PaidBy: varchar("gate3_paid_by"),
  gate4PaidBy: varchar("gate4_paid_by"),
  gate5PaidBy: varchar("gate5_paid_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registryVisibilityEnum = pgEnum("registry_visibility", ["public", "matches_only", "after_gate1"]);
export const registryPriceTierEnum = pgEnum("registry_price_tier", ["starter", "impressive", "vip"]);
export const giftStatusEnum = pgEnum("gift_status", ["pending", "purchased", "shipped", "delivered", "claimed", "refunded"]);

export const registryItems = pgTable("registry_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  affiliateUrl: text("affiliate_url").notNull(),
  imageUrl: text("image_url"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  priceTier: registryPriceTierEnum("price_tier").default("starter").notNull(),
  visibility: registryVisibilityEnum("visibility").default("public").notNull(),
  isPurchased: boolean("is_purchased").default(false).notNull(),
  isReserved: boolean("is_reserved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const giftPurchases = pgTable("gift_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerUserId: varchar("buyer_user_id").notNull(),
  recipientUserId: varchar("recipient_user_id").notNull(),
  registryItemId: varchar("registry_item_id").notNull(),
  matchId: varchar("match_id"),
  giftValue: decimal("gift_value", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  affiliateCommission: decimal("affiliate_commission", { precision: 10, scale: 2 }),
  status: giftStatusEnum("status").default("pending").notNull(),
  gatesUnlocked: integer("gates_unlocked").default(0).notNull(),
  claimDeadline: timestamp("claim_deadline"),
  stripeSessionId: varchar("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"]);

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const SUBSCRIPTION_MONTHLY_PRICE = 9.99;
export const SUBSCRIPTION_YEARLY_PRICE = 99;

export const searchPreferences = pgTable("search_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  minAge: integer("min_age").default(18),
  maxAge: integer("max_age").default(99),
  maxDistance: integer("max_distance").default(100),
  genderPreference: text("gender_preference").array(),
  interestsFilter: text("interests_filter").array(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const connectionStatusEnum = pgEnum("connection_status", ["pending", "connected", "blocked"]);

export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  connectedUserId: varchar("connected_user_id").notNull(),
  status: connectionStatusEnum("status").default("connected").notNull(),
  matchId: varchar("match_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueConnection: unique().on(table.userId, table.connectedUserId),
}));

// Feedback / Support System
export const feedbackCategoryEnum = pgEnum("feedback_category", ["issue", "complaint", "feature_request", "general"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["pending", "reviewed", "resolved", "closed"]);

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  category: feedbackCategoryEnum("category").notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: feedbackStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true, updatedAt: true, status: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// Date Planning System
export const datePlanStatusEnum = pgEnum("date_plan_status", ["proposed", "accepted", "declined", "completed", "cancelled"]);
export const paymentPreferenceEnum = pgEnum("payment_preference", ["ill_pay", "you_pay", "split"]);

export const datePlans = pgTable("date_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  proposerId: varchar("proposer_id").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  activity: varchar("activity", { length: 100 }).notNull(),
  activityType: varchar("activity_type", { length: 50 }),
  placeName: varchar("place_name", { length: 200 }),
  placeAddress: text("place_address"),
  proposedDate: timestamp("proposed_date").notNull(),
  paymentPreference: paymentPreferenceEnum("payment_preference").notNull(),
  notes: text("notes"),
  // Per-date preferences (override profile defaults)
  preferences: text("preferences").array(),
  blacklist: text("blacklist").array(),
  budgetFloor: integer("budget_floor"),
  budgetCeiling: integer("budget_ceiling"),
  status: datePlanStatusEnum("status").default("proposed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDatePlanSchema = createInsertSchema(datePlans).omit({ id: true, createdAt: true, updatedAt: true, status: true });
export type InsertDatePlan = z.infer<typeof insertDatePlanSchema>;
export type DatePlan = typeof datePlans.$inferSelect;

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [profiles.userId],
    references: [wallets.userId],
  }),
  initiatedMatches: many(matches),
  receivedMatches: many(matches),
}));

export const walletsRelations = relations(wallets, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  initiator: one(profiles, {
    fields: [matches.initiatorId],
    references: [profiles.userId],
  }),
  recipient: one(profiles, {
    fields: [matches.recipientId],
    references: [profiles.userId],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  match: one(matches, {
    fields: [messages.matchId],
    references: [matches.id],
  }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  isPremiumSince: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  balance: true,
  trialCreditsReceived: true,
  referralCode: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentGate: true,
  status: true,
  skipPaid: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertRegistryItemSchema = createInsertSchema(registryItems).omit({
  id: true,
  createdAt: true,
  isPurchased: true,
  isReserved: true,
});

export const insertGiftPurchaseSchema = createInsertSchema(giftPurchases).omit({
  id: true,
  createdAt: true,
  status: true,
  gatesUnlocked: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  bonusPaid: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSearchPreferencesSchema = createInsertSchema(searchPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type RegistryItem = typeof registryItems.$inferSelect;
export type InsertRegistryItem = z.infer<typeof insertRegistryItemSchema>;
export type GiftPurchase = typeof giftPurchases.$inferSelect;
export type InsertGiftPurchase = z.infer<typeof insertGiftPurchaseSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type SearchPreferences = typeof searchPreferences.$inferSelect;
export type InsertSearchPreferences = z.infer<typeof insertSearchPreferencesSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;

export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  snapchat?: string;
};

export const GATE_COSTS = {
  gate1: 5,
  gate2: 5,
  gate3: 10,
  gate4: 15,
  gate5: 20,
} as const;

export const SKIP_AHEAD_COST = 50;
export const PREMIUM_MONTHLY_COST = 9.99;
export const PREMIUM_YEARLY_COST = 99;
export const MINIMUM_WALLET_BALANCE = 20;
export const GIFT_MINIMUM_VALUE = 25;
export const GIFT_PLATFORM_FEE_PERCENT = 10;
export const GIFT_AFFILIATE_COMMISSION_PERCENT = 10;

export const cryptoPayments = pgTable("crypto_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  walletId: varchar("wallet_id").notNull(),
  invoiceId: varchar("invoice_id").notNull().unique(),
  paymentId: varchar("payment_id"),
  orderId: varchar("order_id").notNull(),
  priceAmount: decimal("price_amount", { precision: 10, scale: 2 }).notNull(),
  priceCurrency: varchar("price_currency", { length: 10 }).default("usd").notNull(),
  payCurrency: varchar("pay_currency", { length: 20 }),
  actuallyPaid: decimal("actually_paid", { precision: 18, scale: 8 }),
  invoiceUrl: text("invoice_url").notNull(),
  status: cryptoPaymentStatusEnum("status").default("waiting").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCryptoPaymentSchema = createInsertSchema(cryptoPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  paymentId: true,
  payCurrency: true,
  actuallyPaid: true,
});

export type CryptoPayment = typeof cryptoPayments.$inferSelect;
export type InsertCryptoPayment = z.infer<typeof insertCryptoPaymentSchema>;

export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
