import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "premium"]);
export const gateStageEnum = pgEnum("gate_stage", ["gate1", "gate2", "gate3", "gate4", "gate5", "completed"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "gate_payment", "refund", "subscription"]);
export const matchStatusEnum = pgEnum("match_status", ["pending", "active", "declined", "completed"]);

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  age: integer("age").notNull(),
  location: varchar("location", { length: 100 }),
  bio: text("bio"),
  tagline: varchar("tagline", { length: 200 }),
  lookingFor: varchar("looking_for", { length: 100 }),
  interests: text("interests").array(),
  photos: text("photos").array(),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free").notNull(),
  isPremiumSince: timestamp("is_premium_since"),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description"),
  relatedMatchId: varchar("related_match_id"),
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
