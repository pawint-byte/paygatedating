import { z } from "zod";

export const AGENT_SCOPES = ["read", "profile_drafts", "wishlist_drafts"] as const;
export const agentRequestId = z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/, "Use a unique requestId with 1–100 letters, digits, _, ., :, or -.");
export const agentKeyInput = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(AGENT_SCOPES)).min(1).max(3)
    .refine(scopes => scopes.includes("read"), "Read permission is required."),
}).strict();
const words = z.array(z.string().trim().min(1).max(100)).max(20);
export const profileAgentChanges = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().min(1).max(2000).optional(),
  lookingFor: z.string().trim().max(100).optional(),
  interests: words.optional(),
  dealBreakers: words.optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Supply at least one change.");

const webUrl = z.string().max(2048).url().refine(value => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, "Use a normal product link, not credentials or another URL scheme.");
export const wishlistAgentChanges = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  affiliateUrl: webUrl.optional(),
  price: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/, "Use a nonnegative price with at most two decimals.").optional(),
  visibility: z.enum(["public", "matches_only", "after_gate1"]).optional(),
  priceTier: z.enum(["starter", "impressive", "vip"]).optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Supply at least one change.");
export const wishlistAgentInput = z.object({
  requestId: agentRequestId.optional(),
  operation: z.enum(["add", "update"]),
  itemId: z.string().min(1).max(100).optional(),
  changes: wishlistAgentChanges,
}).strict().superRefine((value, ctx) => {
  if (value.operation === "update" && !value.itemId) {
    ctx.addIssue({ code: "custom", message: "An existing wishlist item ID is required." });
  }
  if (value.operation === "add" && (!value.changes.title || !value.changes.affiliateUrl || !value.changes.price || value.itemId)) {
    ctx.addIssue({ code: "custom", message: "A new item needs title, product link, and price, without an item ID." });
  }
});
export const AGENT_REVIEW_DAYS = 30;
export const AGENT_GRACE_DAYS = 7;
const DAY_MS = 86_400_000;
export function nextAgentReview(now = new Date()) {
  return new Date(now.getTime() + AGENT_REVIEW_DAYS * DAY_MS);
}
export function agentKeyStatus(key: { revokedAt: Date | string | null; reviewDueAt: Date | string }, now = new Date()) {
  if (key.revokedAt) return "revoked";
  const due = new Date(key.reviewDueAt).getTime();
  if (now.getTime() >= due + AGENT_GRACE_DAYS * DAY_MS) return "paused";
  return now.getTime() >= due ? "review_due" : "active";
}
