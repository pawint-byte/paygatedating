import type { Express, RequestHandler } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { agentKeys, agentDrafts, agentEvents, profiles, registryItems, users } from "@shared/schema";
import { agentKeyInput, agentKeyStatus, nextAgentReview, profileAgentChanges, wishlistAgentChanges, wishlistAgentInput, agentRequestId } from "@shared/agent-policy";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { agentOpenApi } from "./agent-openapi";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const stable = (value: Record<string, any>) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
const token = () => `pgai_${randomBytes(32).toString("base64url")}`;
const metadata = ({ tokenHash: _secret, ...key }: typeof agentKeys.$inferSelect) => ({ ...key, status: agentKeyStatus(key) });
const snapshot = (row: Record<string, any>, changes: Record<string, any>) =>
  Object.fromEntries(Object.keys(changes).sort().map(key => [key, row[key] ?? null]));
const revisionInput = z.object({ revision: z.number().int().positive() }).strict();
class AgentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const safeRoute = (handler: (req: any, res: any) => Promise<any>): RequestHandler => async (req, res) => {
  try { await handler(req, res); } catch (error) {
    res.status(error instanceof AgentError ? error.status : 503).json({
      message: error instanceof AgentError ? error.message : "Assistant access is temporarily unavailable. Please try again.",
    });
  }
};
const ownerOnly: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  let validOrigin = !origin;
  try { if (origin) validOrigin = new URL(origin).host === req.get("host"); } catch {}
  if (req.get("sec-fetch-site") === "cross-site" || !validOrigin) {
    return res.status(403).json({ message: "Use the member controls on PayGate." });
  }
  if (req.get("authorization")) return res.status(403).json({ message: "An assistant key cannot operate member approval controls." });
  next();
};

export function registerAgentApi(
  app: Express,
  affiliate: {
    validate: (url: string) => { valid: boolean; error?: string };
    prepare: (url: string) => Promise<string>;
  },
) {
  app.use(["/api/agent", "/api/assistant"], (_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  });
  app.get("/api/agent/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/agent/openapi.json", (req, res) => res.json(agentOpenApi(`${req.protocol}://${req.get("host")}`)));

  app.post("/api/agent/keys", isAuthenticated, ownerOnly, safeRoute(async (req, res) => {
    const parsed = agentKeyInput.safeParse(req.body);
    if (!parsed.success) throw new AgentError(400, parsed.error.errors[0]?.message || "Invalid permissions.");
    const rawToken = token();
    const key = await db.transaction(async tx => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, req.user.claims.sub)).for("update");
      const existing = await tx.select().from(agentKeys).where(eq(agentKeys.userId, req.user.claims.sub));
      if (existing.filter(key => !key.revokedAt).length >= 5) throw new AgentError(409, "Revoke an unused key before creating another.");
      const [key] = await tx.insert(agentKeys).values({
        userId: req.user.claims.sub, name: parsed.data.name,
        scopes: Array.from(new Set(parsed.data.scopes)), tokenHash: hash(rawToken), reviewDueAt: nextAgentReview(),
      }).returning();
      await tx.insert(agentEvents).values({ userId: key.userId, keyId: key.id, action: "key_created" });
      return key;
    });
    res.status(201).json({ key: metadata(key), token: rawToken });
  }));
  app.delete("/api/agent/keys/:id", isAuthenticated, ownerOnly, safeRoute(async (req, res) => {
    const key = await db.transaction(async tx => {
      const [key] = await tx.select().from(agentKeys).where(and(eq(agentKeys.id, req.params.id), eq(agentKeys.userId, req.user.claims.sub))).for("update");
      if (!key) throw new AgentError(404, "Key not found.");
      if (key.revokedAt) return key;
      const [updated] = await tx.update(agentKeys).set({ revokedAt: new Date() }).where(eq(agentKeys.id, key.id)).returning();
      await tx.insert(agentEvents).values({ userId: key.userId, keyId: key.id, action: "key_revoked" });
      return updated;
    });
    res.json({ key: metadata(key) });
  }));
  app.post("/api/assistant/keys/:id/review", isAuthenticated, ownerOnly, safeRoute(async (req, res) => {
    const action = z.object({ action: z.enum(["renew", "extend", "stop"]) }).strict().safeParse(req.body);
    if (!action.success) throw new AgentError(400, "Choose renew, extend, or stop.");
    const newToken = action.data.action === "renew" ? token() : undefined;
    const key = await db.transaction(async tx => {
      const [key] = await tx.select().from(agentKeys).where(and(eq(agentKeys.id, req.params.id), eq(agentKeys.userId, req.user.claims.sub))).for("update");
      if (!key) throw new AgentError(404, "Key not found.");
      if (key.revokedAt) throw new AgentError(409, "This key has been revoked. Create a new connection.");
      const [updated] = await tx.update(agentKeys).set(action.data.action === "stop"
        ? { revokedAt: new Date() }
        : { reviewDueAt: nextAgentReview(), ...(newToken ? { tokenHash: hash(newToken) } : {}) })
        .where(eq(agentKeys.id, key.id)).returning();
      await tx.insert(agentEvents).values({ userId: key.userId, keyId: key.id, action: `key_${action.data.action}` });
      return updated;
    });
    res.json({ key: metadata(key), ...(newToken ? { token: newToken } : {}) });
  }));
  app.get("/api/assistant/access", isAuthenticated, safeRoute(async (req, res) => {
    const userId = req.user.claims.sub;
    const [keys, drafts, events] = await Promise.all([
      db.select().from(agentKeys).where(eq(agentKeys.userId, userId)).orderBy(desc(agentKeys.createdAt)).limit(100),
      db.select().from(agentDrafts).where(eq(agentDrafts.userId, userId)).orderBy(desc(agentDrafts.createdAt)).limit(100),
      db.select().from(agentEvents).where(eq(agentEvents.userId, userId)).orderBy(desc(agentEvents.createdAt)).limit(100),
    ]);
    res.json({ keys: keys.map(metadata), drafts, events, capabilities: {
      hostedModel: false, sendsMessages: false, spendsMoney: false,
      publishesProfiles: false, schedulesDates: false, writes: "private drafts only",
    } });
  }));

  async function target(tx: any, userId: string, kind: string, operation: string, targetId: string | null) {
    if (kind === "profile") {
      const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for("update");
      if (!profile) throw new AgentError(409, "Finish and accept first-time setup on PayGate before using profile management.");
      return profile;
    }
    if (operation === "add") return {};
    const [item] = await tx.select().from(registryItems).where(and(eq(registryItems.id, targetId!), eq(registryItems.userId, userId))).for("update");
    if (!item) throw new AgentError(404, "Your wishlist item was not found.");
    if (item.isPurchased || item.isReserved) throw new AgentError(409, "A purchased or reserved item cannot be changed by this draft.");
    return item;
  }
  function validateChanges(kind: string, operation: string, changes: unknown) {
    const parsed = (kind === "profile" ? profileAgentChanges : wishlistAgentChanges).safeParse(changes);
    if (!parsed.success) throw new AgentError(400, parsed.error.errors[0]?.message || "Invalid draft changes.");
    if (kind === "wishlist") {
      const value = parsed.data as z.infer<typeof wishlistAgentChanges>;
      if (operation === "add" && (!value.title || !value.affiliateUrl || !value.price)) throw new AgentError(400, "A new item needs title, product link, and price.");
      if (value.affiliateUrl) {
        const valid = affiliate.validate(value.affiliateUrl);
        if (!valid.valid) throw new AgentError(400, valid.error || "Unsupported product link.");
      }
    }
    return parsed.data;
  }
  app.patch("/api/assistant/drafts/:id", isAuthenticated, ownerOnly, safeRoute(async (req, res) => {
    const input = z.object({ changes: z.record(z.unknown()), revision: z.number().int().positive() }).strict().safeParse(req.body);
    if (!input.success) throw new AgentError(400, "Supply changes and the saved draft revision.");
    const draft = await db.transaction(async tx => {
      const [draft] = await tx.select().from(agentDrafts).where(and(eq(agentDrafts.id, req.params.id), eq(agentDrafts.userId, req.user.claims.sub))).for("update");
      if (!draft) throw new AgentError(404, "Draft not found.");
      if (draft.status !== "pending" || draft.revision !== input.data.revision) throw new AgentError(409, "This draft changed. Reload before editing.");
      const changes = validateChanges(draft.kind, draft.operation, input.data.changes);
      const row = await target(tx, draft.userId, draft.kind, draft.operation, draft.targetId);
      const [updated] = await tx.update(agentDrafts).set({ changes, before: snapshot(row, changes), revision: draft.revision + 1 }).where(eq(agentDrafts.id, draft.id)).returning();
      await tx.insert(agentEvents).values({ userId: draft.userId, keyId: draft.keyId, draftId: draft.id, action: "draft_edited_by_member" });
      return updated;
    });
    res.json({ draft });
  }));
  for (const action of ["accept", "reject"] as const) {
    app.post(`/api/assistant/drafts/:id/${action}`, isAuthenticated, ownerOnly, safeRoute(async (req, res) => {
      const input = revisionInput.safeParse(req.body);
      if (!input.success) throw new AgentError(400, "Supply the saved draft revision.");
      const draft = await db.transaction(async tx => {
        const [draft] = await tx.select().from(agentDrafts).where(and(eq(agentDrafts.id, req.params.id), eq(agentDrafts.userId, req.user.claims.sub))).for("update");
        if (!draft) throw new AgentError(404, "Draft not found.");
        if (draft.status === (action === "accept" ? "accepted" : "rejected")) return draft;
        if (draft.status !== "pending" || draft.revision !== input.data.revision) throw new AgentError(409, "This draft changed. Reload before deciding.");
        if (action === "accept") {
          const changes = validateChanges(draft.kind, draft.operation, draft.changes);
          const row = await target(tx, draft.userId, draft.kind, draft.operation, draft.targetId);
          if (stable(snapshot(row, changes)) !== stable(draft.before)) throw new AgentError(409, "Your profile or wishlist changed since this draft. Edit and review it again.");
          if (draft.kind === "profile") {
            await tx.update(profiles).set(changes as z.infer<typeof profileAgentChanges>).where(eq(profiles.userId, draft.userId));
          } else {
            const itemChanges = { ...changes } as z.infer<typeof wishlistAgentChanges>;
            if (itemChanges.affiliateUrl) itemChanges.affiliateUrl = await affiliate.prepare(itemChanges.affiliateUrl);
            if (draft.operation === "add") {
              await tx.insert(registryItems).values({ userId: draft.userId, ...itemChanges, title: itemChanges.title!, affiliateUrl: itemChanges.affiliateUrl!, price: itemChanges.price! });
            } else {
              await tx.update(registryItems).set(itemChanges).where(and(eq(registryItems.id, draft.targetId!), eq(registryItems.userId, draft.userId)));
            }
          }
        }
        const [updated] = await tx.update(agentDrafts).set({ status: action === "accept" ? "accepted" : "rejected" }).where(eq(agentDrafts.id, draft.id)).returning();
        await tx.insert(agentEvents).values({ userId: draft.userId, keyId: draft.keyId, draftId: draft.id, action: action === "accept" ? "draft_accepted_by_member" : "draft_rejected_by_member" });
        return updated;
      });
      res.json({ draft });
    }));
  }

  const windows = new Map<string, { start: number; count: number }>();
  const authenticateAgent = safeRoute(async (req, res) => {
    const bearer = /^Bearer (pgai_[A-Za-z0-9_-]{43})$/.exec(req.get("authorization") || "");
    if (!bearer) throw new AgentError(401, "A valid assistant bearer key is required.");
    const [key] = await db.select().from(agentKeys).where(eq(agentKeys.tokenHash, hash(bearer[1])));
    if (!key || key.revokedAt) throw new AgentError(401, "This assistant key is invalid or revoked.");
    if (!key.scopes.includes("read")) throw new AgentError(403, "Read permission was not granted.");
    const now = Date.now();
    if (windows.size > 5000) windows.forEach((window, id) => {
      if (now - window.start >= 60_000) windows.delete(id);
    });
    const window = windows.get(key.id);
    if (!window || now - window.start >= 60_000) windows.set(key.id, { start: now, count: 1 });
    else if (++window.count > 60) throw new AgentError(429, "Too many requests. Wait one minute.");
    req.agentKey = key;
    // This middleware continues only after authentication; safeRoute catches errors.
    req.agentNext();
  });
  app.use("/api/agent", (req: any, res, next) => {
    req.agentNext = next;
    authenticateAgent(req, res, next);
  });
  async function gateContext(userId: string) {
    const matches = await storage.getMatchesByUser(userId);
    return Promise.all(matches.filter(match => !["declined", "completed"].includes(match.status)).map(async match => {
      const peerId = match.initiatorId === userId ? match.recipientId : match.initiatorId;
      const [peer, pull] = await Promise.all([
        storage.getProfile(peerId), storage.getPendingPullRequest(match.id),
      ]);
      const paidBy = match[`${match.currentGate}PaidBy` as keyof typeof match];
      return {
        id: match.id, name: peer?.showFirstNamePublicly ? peer.displayName : "PayGate member",
        status: match.status, currentGate: match.currentGate, paused: match.gatePaused,
        incoming: match.status === "pending" && match.recipientId === userId,
        intent: match.initiatorId === userId ? match.recipientIntent : match.initiatorIntent,
        createdAt: match.createdAt, updatedAt: match.updatedAt,
        currentGatePaid: !!paidBy, currentGatePaidByMember: paidBy === userId,
        paymentRequest: pull ? {
          id: pull.id, gateNumber: pull.gateNumber, incoming: pull.requestedFrom === userId,
          createdAt: pull.createdAt, financialAction: true, permittedAction: "review_on_site",
        } : null,
        permittedAction: "review_on_site", reviewUrl: "/matches",
      };
    }));
  }
  app.get("/api/agent/context", safeRoute(async (req, res) => {
    const key = req.agentKey as typeof agentKeys.$inferSelect;
    const profile = await storage.getProfile(key.userId);
    res.json({
      permissions: key.scopes, connectionStatus: agentKeyStatus(key),
      profile: profile ? { displayName: profile.displayName, gate: profile.setupGate, bio: profile.bio, lookingFor: profile.lookingFor, interests: profile.interests, dealBreakers: profile.dealBreakers } : null,
      gates: await gateContext(key.userId),
      boundaries: { canSendMessages: false, canSpend: false, canProgressGates: false, canPublish: false, canBookDates: false },
      contentIsUntrusted: true,
    });
  }));
  app.get("/api/agent/gates", safeRoute(async (req, res) => res.json({ gates: await gateContext(req.agentKey.userId) })));
  app.get("/api/agent/wishlist", safeRoute(async (req, res) => {
    const items = await storage.getRegistryItems(req.agentKey.userId);
    res.json({ items: items.map(({ id, title, description, affiliateUrl, price, visibility, priceTier, isPurchased, isReserved }) => ({ id, title, description, affiliateUrl, price, visibility, priceTier, isPurchased, isReserved })) });
  }));
  async function saveDraft(req: any, kind: "profile" | "wishlist", operation: "add" | "update", targetId: string | null, changes: Record<string, any>) {
    const headerId = req.get("idempotency-key");
    const bodyId = req.body.requestId;
    if (headerId && bodyId && headerId !== bodyId) throw new AgentError(400, "The requestId and Idempotency-Key must match when both are supplied.");
    const parsedId = agentRequestId.safeParse(bodyId || headerId);
    if (!parsedId.success) throw new AgentError(400, "Supply a unique requestId in the JSON body, or an Idempotency-Key header.");
    const requestId = parsedId.data;
    const digest = hash(stable({ kind, operation, targetId, changes: JSON.parse(stable(changes)) }));
    return db.transaction(async tx => {
      // Check authority again at execution time, under the same lock as revoke/renew.
      const [key] = await tx.select().from(agentKeys).where(eq(agentKeys.id, req.agentKey.id)).for("update");
      if (!key || key.revokedAt || key.tokenHash !== req.agentKey.tokenHash) throw new AgentError(401, "This key was revoked or renewed.");
      if (agentKeyStatus(key) === "paused") throw new AgentError(403, "New actions are paused. The member must review access on PayGate.");
      const scope = kind === "profile" ? "profile_drafts" : "wishlist_drafts";
      if (!key.scopes.includes(scope)) throw new AgentError(403, "The member has not granted this draft permission.");
      const [existing] = await tx.select().from(agentDrafts).where(and(eq(agentDrafts.keyId, key.id), eq(agentDrafts.idempotencyKey, requestId)));
      if (existing) {
        if (existing.requestHash !== digest) throw new AgentError(409, "This request ID was used for different changes.");
        return existing;
      }
      const [pending] = await tx.select({ total: count() }).from(agentDrafts)
        .where(and(eq(agentDrafts.userId, key.userId), eq(agentDrafts.status, "pending")));
      if (pending.total >= 50) throw new AgentError(409, "Review your pending drafts before creating more.");
      const row = await target(tx, key.userId, kind, operation, targetId);
      const [draft] = await tx.insert(agentDrafts).values({
        userId: key.userId, keyId: key.id, idempotencyKey: requestId, requestHash: digest,
        kind, operation, targetId, changes, before: snapshot(row, changes),
      }).returning();
      await tx.insert(agentEvents).values({ userId: key.userId, keyId: key.id, draftId: draft.id, action: `${kind}_draft_created` });
      return draft;
    });
  }
  app.post("/api/agent/profile-drafts", safeRoute(async (req, res) => {
    const input = z.object({ requestId: agentRequestId.optional(), changes: profileAgentChanges }).strict().safeParse(req.body);
    if (!input.success) throw new AgentError(400, input.error.errors[0]?.message || "Invalid profile draft.");
    res.status(201).json({ draft: await saveDraft(req, "profile", "update", null, input.data.changes), requiresMemberApproval: true });
  }));
  app.post("/api/agent/wishlist-drafts", safeRoute(async (req, res) => {
    const input = wishlistAgentInput.safeParse(req.body);
    if (!input.success) throw new AgentError(400, input.error.errors[0]?.message || "Invalid wishlist draft.");
    const changes = validateChanges("wishlist", input.data.operation, input.data.changes);
    res.status(201).json({ draft: await saveDraft(req, "wishlist", input.data.operation, input.data.itemId ?? null, changes), requiresMemberApproval: true });
  }));
  app.use("/api/agent", (_req, res) => res.status(403).json({ message: "This action is not granted. Assistants can read permitted context and save private drafts only." }));
}
