import { pgTable, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { users } from "./models/auth";

// Credentials are deliberately separate from public User DTOs.
export const nativeAccounts = pgTable("native_auth_accounts", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  verifiedAt: timestamp("verified_at"),
  sessionVersion: integer("session_version").notNull().default(0),
  adultConfirmedAt: timestamp("adult_confirmed_at"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const nativeTokens = pgTable("native_auth_tokens", {
  hash: varchar("hash", { length: 64 }).primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  kind: varchar("kind", { length: 10 }).notNull(),
  sessionVersion: integer("session_version").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
}, table => [index("native_auth_tokens_user_idx").on(table.userId)]);
export const replitIdentities = pgTable("replit_auth_identities", {
  subject: varchar("subject").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
});
export const nativeRateLimits = pgTable("native_auth_rate_limits", {
  key: varchar("key", { length: 64 }).primaryKey(),
  hits: integer("hits").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Email capture is not an account, a profile, or marketing subscription consent.
export const pendingSignups = pgTable("pending_signups", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSubmittedAt: timestamp("last_submitted_at").notNull().defaultNow(),
  referralSource: text("referral_source").notNull().default("direct"),
  referralCode: varchar("referral_code", { length: 10 }),
  status: varchar("status", { length: 10 }).notNull().default("pending"),
  completedAt: timestamp("completed_at"),
  completedUserId: varchar("completed_user_id").references(() => users.id, { onDelete: "set null" }),
});
export const pendingSignupTokens = pgTable("pending_signup_tokens", {
  hash: varchar("hash", { length: 64 }).primaryKey(),
  pendingId: varchar("pending_id").notNull().references(() => pendingSignups.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
}, table => [index("pending_signup_tokens_pending_idx").on(table.pendingId)]);
