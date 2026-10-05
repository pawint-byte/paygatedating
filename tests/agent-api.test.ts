// Integration fixture: authentication below exists ONLY in this ephemeral test
// server. It is never registered in the running application.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { registerAgentApi } from "../server/agent-api";
import { db, pool } from "../server/db";
import { users, profiles, registryItems, matches, gatePullRequests, agentKeys, agentDrafts, agentEvents } from "../shared/schema";

test("external assistant authority, private drafts, explicit approval, isolation, renew and revoke", async t => {
  const member = `agent-test-${randomUUID()}`;
  const other = `agent-test-${randomUUID()}`;
  await db.insert(users).values([{ id: member }, { id: other }]);
  await db.insert(profiles).values([
    { userId: member, displayName: "Fixture owner", age: 30, bio: "Original bio", isVisible: true },
    { userId: other, displayName: "Other fixture", age: 30, bio: "Other bio", isVisible: true, showFirstNamePublicly: false },
  ]);
  const [foreignItem] = await db.insert(registryItems).values({ userId: other, title: "Other item", affiliateUrl: "https://amazon.com/dp/B000000000", price: "30.00" }).returning();
  const [incoming] = await db.insert(matches).values({ initiatorId: other, recipientId: member, status: "pending" }).returning();
  const [active] = await db.insert(matches).values({ initiatorId: member, recipientId: other, status: "active", currentGate: "gate3", gatePaused: true }).returning();
  await db.insert(gatePullRequests).values({ matchId: active.id, gateNumber: 3, requestedBy: other, requestedFrom: member });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const id = req.get("x-test-member");
    req.isAuthenticated = () => id === member || id === other;
    if (req.isAuthenticated()) req.user = { claims: { sub: id }, expires_at: Math.floor(Date.now() / 1000) + 3600 };
    next();
  });
  registerAgentApi(app, { validate: url => ({ valid: new URL(url).hostname === "amazon.com" }), prepare: async url => url });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const id of [member, other]) {
      await db.delete(agentEvents).where(eq(agentEvents.userId, id));
      await db.delete(agentDrafts).where(eq(agentDrafts.userId, id));
      await db.delete(agentKeys).where(eq(agentKeys.userId, id));
      await db.delete(gatePullRequests).where(eq(gatePullRequests.requestedFrom, id));
      await db.delete(matches).where(eq(matches.initiatorId, id));
      await db.delete(registryItems).where(eq(registryItems.userId, id));
      await db.delete(profiles).where(eq(profiles.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
    await pool.end();
  });
  async function request(path: string, options: { method?: string; body?: unknown; owner?: string; bearer?: string; requestId?: string } = {}) {
    const headers: Record<string, string> = {};
    if (options.owner) headers["x-test-member"] = options.owner;
    if (options.bearer) headers.authorization = `Bearer ${options.bearer}`;
    if (options.requestId) headers["idempotency-key"] = options.requestId;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(base + path, { method: options.method || "GET", headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    return { status: response.status, data: await response.json() };
  }
  assert.deepEqual((await request("/api/agent/health")).data, { ok: true });
  assert.equal((await request("/api/agent/context")).status, 401);
  assert.equal((await request("/api/agent/keys", { method: "POST", body: { name: "Agent", scopes: ["read"] } })).status, 401);
  const created = await request("/api/agent/keys", { method: "POST", owner: member, body: { name: "Fixture agent", scopes: ["read", "profile_drafts", "wishlist_drafts"] } });
  assert.equal(created.status, 201);
  const key = created.data.key;
  let bearer = created.data.token;
  assert.equal("tokenHash" in key, false);
  const [stored] = await db.select().from(agentKeys).where(eq(agentKeys.id, key.id));
  assert.equal(stored.tokenHash, createHash("sha256").update(bearer).digest("hex"));
  assert.notEqual(stored.tokenHash, bearer);
  const access = await request("/api/assistant/access", { owner: member });
  assert.equal(JSON.stringify(access.data).includes(bearer), false);
  assert.equal(JSON.stringify(access.data).includes(stored.tokenHash), false);
  const context = await request("/api/agent/context", { bearer, owner: other });
  assert.equal(context.data.profile.displayName, "Fixture owner");
  assert.equal(context.data.boundaries.canSendMessages, false);
  assert.equal("shippingAddress" in context.data.profile, false);
  const incomingSummary = context.data.gates.find((gate: any) => gate.id === incoming.id);
  assert.equal(incomingSummary.incoming, true);
  assert.equal(incomingSummary.name, "PayGate member");
  const activeSummary = context.data.gates.find((gate: any) => gate.id === active.id);
  assert.equal(activeSummary.currentGate, "gate3");
  assert.equal(activeSummary.paused, true);
  assert.equal(activeSummary.paymentRequest.incoming, true);
  assert.equal(activeSummary.paymentRequest.financialAction, true);
  const readOnly = await request("/api/agent/keys", { method: "POST", owner: member, body: { name: "Read only", scopes: ["read"] } });
  const draftBody = { changes: { bio: "Member-supplied hiking preference." } };
  assert.equal((await request("/api/agent/profile-drafts", { method: "POST", bearer: readOnly.data.token, requestId: "readonly", body: draftBody })).status, 403);
  assert.equal((await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "forbidden", body: { changes: { isVisible: true } } })).status, 400);
  const saved = await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "profile-one", body: draftBody });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.draft.status, "pending");
  assert.equal((await db.select().from(profiles).where(eq(profiles.userId, member)))[0].bio, "Original bio");
  const retry = await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "profile-one", body: draftBody });
  assert.equal(retry.data.draft.id, saved.data.draft.id);
  assert.equal((await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "profile-one", body: { changes: { bio: "Different" } } })).status, 409);
  const actionDraft = await request("/api/agent/profile-drafts", { method: "POST", bearer, body: { requestId: "body-request-one", changes: { bio: "Actions-compatible private draft." } } });
  assert.equal(actionDraft.status, 201);
  assert.equal((await request("/api/agent/profile-drafts", { method: "POST", bearer, body: { requestId: "body-request-one", changes: { bio: "Actions-compatible private draft." } } })).data.draft.id, actionDraft.data.draft.id);
  assert.equal((await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "different-header", body: { requestId: "body-request-one", changes: { bio: "Mismatch" } } })).status, 400);
  assert.equal((await request(`/api/assistant/drafts/${actionDraft.data.draft.id}/reject`, { method: "POST", owner: member, body: { revision: 1 } })).status, 200);
  const decisionPath = `/api/assistant/drafts/${saved.data.draft.id}/accept`;
  assert.equal((await request(decisionPath, { method: "POST", bearer, body: { revision: 1 } })).status, 401);
  assert.equal((await request(decisionPath, { method: "POST", owner: member, bearer, body: { revision: 1 } })).status, 403);
  assert.equal((await request(decisionPath, { method: "POST", owner: other, body: { revision: 1 } })).status, 404);
  const edited = await request(`/api/assistant/drafts/${saved.data.draft.id}`, { method: "PATCH", owner: member, body: { revision: 1, changes: { bio: "Member edited hiking bio." } } });
  assert.equal(edited.data.draft.revision, 2);
  assert.equal((await request(decisionPath, { method: "POST", owner: member, body: { revision: 1 } })).status, 409);
  assert.equal((await request(decisionPath, { method: "POST", owner: member, body: { revision: 2 } })).status, 200);
  assert.equal((await db.select().from(profiles).where(eq(profiles.userId, member)))[0].bio, "Member edited hiking bio.");
  assert.equal((await request(decisionPath, { method: "POST", owner: member, body: { revision: 2 } })).status, 200);
  // A normal site edit since the proposal must conflict, not be overwritten.
  const stale = await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "profile-stale", body: { changes: { bio: "Old idea" } } });
  await db.update(profiles).set({ bio: "Newer normal-site edit" }).where(eq(profiles.userId, member));
  assert.equal((await request(`/api/assistant/drafts/${stale.data.draft.id}/accept`, { method: "POST", owner: member, body: { revision: 1 } })).status, 409);
  assert.equal((await request("/api/agent/wishlist-drafts", { method: "POST", bearer, requestId: "foreign", body: { operation: "update", itemId: foreignItem.id, changes: { title: "Hijack" } } })).status, 404);
  const wish = await request("/api/agent/wishlist-drafts", { method: "POST", bearer, body: { requestId: "wish", operation: "add", changes: { title: "Hiking boots", affiliateUrl: "https://amazon.com/dp/B000000001", price: "50.00" } } });
  assert.equal(wish.status, 201);
  assert.equal((await db.select().from(registryItems).where(eq(registryItems.userId, member))).length, 0);
  assert.equal((await request(`/api/assistant/drafts/${wish.data.draft.id}/accept`, { method: "POST", owner: member, body: { revision: 1 } })).status, 200);
  await request(`/api/assistant/drafts/${wish.data.draft.id}/accept`, { method: "POST", owner: member, body: { revision: 1 } });
  assert.equal((await db.select().from(registryItems).where(eq(registryItems.userId, member))).length, 1);
  assert.equal((await request("/api/agent/send-message", { method: "POST", bearer, body: { name: "Unknown" } })).status, 403);
  assert.equal((await request("/api/agent/keys", { method: "POST", bearer, body: { name: "Self grant", scopes: ["read"] } })).status, 401);
  await db.update(agentKeys).set({ reviewDueAt: new Date(Date.now() - 8 * 86_400_000) }).where(eq(agentKeys.id, key.id));
  assert.equal((await request("/api/agent/context", { bearer })).status, 200);
  assert.equal((await request("/api/agent/profile-drafts", { method: "POST", bearer, requestId: "paused", body: draftBody })).status, 403);
  const extended = await request(`/api/assistant/keys/${key.id}/review`, { method: "POST", owner: member, body: { action: "extend" } });
  assert.equal(extended.data.key.status, "active");
  assert.equal("token" in extended.data, false);
  const renewed = await request(`/api/assistant/keys/${key.id}/review`, { method: "POST", owner: member, body: { action: "renew" } });
  assert.equal((await request("/api/agent/context", { bearer })).status, 401);
  bearer = renewed.data.token;
  assert.equal((await request("/api/agent/context", { bearer })).status, 200);
  assert.equal((await request(`/api/agent/keys/${key.id}`, { method: "DELETE", owner: other })).status, 404);
  assert.equal((await request(`/api/agent/keys/${key.id}`, { method: "DELETE", owner: member })).status, 200);
  assert.equal((await request("/api/agent/context", { bearer })).status, 401);
  const audit = await db.select().from(agentEvents).where(and(eq(agentEvents.userId, member), eq(agentEvents.keyId, key.id)));
  for (const action of ["key_created", "profile_draft_created", "draft_edited_by_member", "draft_accepted_by_member", "wishlist_draft_created", "key_extend", "key_renew", "key_revoked"]) {
    assert.ok(audit.some(event => event.action === action), action);
  }
  assert.equal((await db.select().from(profiles).where(eq(profiles.userId, other)))[0].bio, "Other bio");
});
