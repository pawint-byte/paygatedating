// Authentication is injected ONLY into this short-lived, ephemeral-port fixture.
// No fixture login or testing header is added to the running application.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { registerAgentApi } from "../server/agent-api";
import { db, pool } from "../server/db";
import { agentKeys, agentTasks, users, profiles, wallets, matches } from "../shared/schema";
import { agentTaskCreateInput, agentTaskQueryInput, agentTaskUpdateInput } from "../shared/agent-task-policy";

test("Scout queue: all six acceptance checks, plus permission and concurrency boundaries", async t => {
  const member = `queue-qa-${randomUUID()}`, other = `queue-qa-${randomUUID()}`;
  await db.insert(users).values([{ id: member }, { id: other }]);
  t.after(async () => {
    for (const id of [member, other]) {
      await db.delete(matches).where(eq(matches.initiatorId, id));
      await db.delete(wallets).where(eq(wallets.userId, id));
      await db.delete(profiles).where(eq(profiles.userId, id));
      await db.delete(users).where(eq(users.id, id)); // task/key/draft/event FKs cascade
    }
    await pool.end();
  });
  await db.insert(profiles).values([
    { userId: member, displayName: "Queue QA", bio: "Original bio", isVisible: false },
    { userId: other, displayName: "Other queue QA", bio: "Protected peer bio", isVisible: false, showFirstNamePublicly: false },
  ]);
  await db.insert(wallets).values([{ userId: member, balance: "12.00" }, { userId: other, balance: "99.00" }]);
  await db.insert(matches).values({ initiatorId: other, recipientId: member, status: "pending" });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const id = req.get("x-test-member");
    req.isAuthenticated = () => id === member || id === other;
    if (req.isAuthenticated()) req.user = { claims: { sub: id }, expires_at: Math.floor(Date.now() / 1000) + 3600 };
    next();
  });
  registerAgentApi(app, { validate: () => ({ valid: true }), prepare: async url => url });
  const server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  async function request(path: string, options: { owner?: string; bearer?: string; method?: string; body?: unknown } = {}) {
    const headers: Record<string, string> = {};
    if (options.owner) headers["x-test-member"] = options.owner;
    if (options.bearer) headers.authorization = `Bearer ${options.bearer}`;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(base + path, { method: options.method || "GET", headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    return { status: response.status, data: await response.json(), retryAfter: response.headers.get("retry-after") };
  }
  async function makeKey(owner: string, name: string, scopes = ["read", "tasks_read", "tasks_write", "profile_drafts"]) {
    const response = await request("/api/agent/keys", { owner, method: "POST", body: { name, scopes } });
    assert.equal(response.status, 201);
    return { id: response.data.key.id as string, bearer: response.data.token as string };
  }
  const a = await makeKey(member, "Scout");
  const b = await makeKey(member, "Second connector");
  const outsider = await makeKey(other, "Other member's Scout");
  const readOnly = await makeKey(member, "No queue permissions", ["read"]);
  const queueReader = await makeKey(member, "Queue reader", ["read", "tasks_read"]);
  let taskId = "";
  await t.test("1: stable documentation URL serves bearer auth, scopes, endpoints and real approval boundaries", async () => {
    const spec = await request("/assistant-openapi.json");
    assert.equal(spec.status, 200);
    const tools = (await request("/api/agent/openapi.json")).data;
    assert.equal(tools.info.version, spec.data.info.version);
    assert.equal("post" in tools.paths["/api/assistant/tasks"], false);
    assert.equal("memberSession" in tools.components.securitySchemes, false);
    assert.ok(tools.paths["/api/assistant/tasks"].get && tools.paths["/api/assistant/tasks/{id}"].patch);
    assert.equal(spec.data.components.securitySchemes.memberAssistantKey.scheme, "bearer");
    for (const scope of ["read", "profile_drafts", "wishlist_drafts", "tasks_read", "tasks_write"]) {
      assert.ok(spec.data["x-member-scopes"][scope], scope);
    }
    assert.ok(spec.data.paths["/api/assistant/tasks"].get);
    assert.ok(spec.data.paths["/api/assistant/tasks"].post);
    assert.ok(spec.data.paths["/api/assistant/tasks/{id}"].patch);
    assert.match(spec.data.info.description, /Reject.*NO automatic revert endpoint/);
    assert.deepEqual(spec.data.paths["/api/assistant/tasks"].post.security, [{ memberSession: [] }]);
    for (const path of ["/api/agent/credits", "/api/agent/notifications", "/api/agent/matches", "/api/agent/knock-requests"]) {
      assert.ok(spec.data.paths[path], path);
    }
  });
  await t.test("2: human member submission is pollable as pending and stores no executed bio change", async () => {
    const result = await request("/api/assistant/tasks", { owner: member, method: "POST", body: { prompt: "Add 'QA test' to the end of my bio" } });
    assert.equal(result.status, 201);
    taskId = result.data.id;
    assert.equal(result.data.status, "pending");
    assert.ok(result.data.created_at);
    const pending = await request("/api/assistant/tasks?status=pending", { bearer: a.bearer });
    assert.equal(pending.status, 200);
    assert.equal(pending.data.tasks[0].id, taskId);
    assert.equal(pending.data.tasks[0].prompt, "Add 'QA test' to the end of my bio");
    assert.equal((await db.select().from(profiles).where(eq(profiles.userId, member)))[0].bio, "Original bio");
    assert.equal((await request("/api/assistant/tasks", { method: "POST", bearer: a.bearer, owner: member, body: { prompt: "Self-generated work" } })).status, 403);
    assert.equal((await request("/api/assistant/tasks", { method: "POST", body: { prompt: "Anonymous" } })).status, 401);
  });
  await t.test("3: claim then done is visible to member, and only claimer may finish", async () => {
    const patch = (bearer: string, status: string, note?: string) =>
      request(`/api/assistant/tasks/${taskId}`, { bearer, method: "PATCH", body: { status, ...(note ? { note } : {}) } });
    assert.equal((await patch(a.bearer, "done")).status, 403);
    assert.equal((await patch(a.bearer, "claimed")).status, 200);
    assert.equal((await patch(a.bearer, "claimed")).status, 200);
    assert.equal((await request("/api/assistant/tasks?status=claimed", { owner: member })).data.tasks[0].id, taskId);
    assert.equal((await patch(b.bearer, "claimed")).status, 409);
    assert.equal((await patch(b.bearer, "done")).status, 403);
    assert.equal((await patch(a.bearer, "done", "Reported done; no live edit or approval.")).status, 200);
    const done = (await request("/api/assistant/tasks?status=done", { owner: member })).data.tasks[0];
    assert.equal(done.id, taskId);
    assert.ok(done.claimed_at && done.finished_at);
    assert.equal(done.claimed_by_key_id, a.id);
    assert.equal((await patch(a.bearer, "done")).status, 200);
    assert.equal((await patch(a.bearer, "failed")).status, 409);
    assert.equal((await request(`/api/assistant/tasks/${taskId}`, { owner: member, method: "PATCH", body: { status: "failed" } })).status, 401);
  });
  await t.test("4: another member cannot list, claim, finish, or read the first member's task even with their session", async () => {
    const result = await request("/api/assistant/tasks?status=done", { bearer: outsider.bearer, owner: member });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.tasks, []);
    assert.equal((await request(`/api/assistant/tasks/${taskId}`, { bearer: outsider.bearer, method: "PATCH", body: { status: "claimed" } })).status, 404);
    assert.equal((await request(`/api/assistant/tasks/${taskId}`, { bearer: outsider.bearer, method: "PATCH", body: { status: "done" } })).status, 404);
    assert.deepEqual((await request("/api/assistant/tasks", { owner: other })).data.tasks, []);
  });
  await t.test("5: private profile draft still needs explicit human approval before the bio changes", async () => {
    const draft = await request("/api/agent/profile-drafts", {
      bearer: a.bearer, method: "POST", body: { requestId: randomUUID(), changes: { bio: "Original bio QA test" } },
    });
    assert.equal(draft.status, 201);
    assert.equal((await db.select().from(profiles).where(eq(profiles.userId, member)))[0].bio, "Original bio");
    const access = await request("/api/assistant/access", { owner: member });
    assert.ok(access.data.drafts.some((entry: any) => entry.id === draft.data.draft.id && entry.status === "pending"));
    const acceptPath = `/api/assistant/drafts/${draft.data.draft.id}/accept`;
    assert.equal((await request(acceptPath, { bearer: a.bearer, owner: member, method: "POST", body: { revision: 1 } })).status, 403);
    assert.equal((await request(acceptPath, { owner: member, method: "POST", body: { revision: 1 } })).status, 200);
    assert.equal((await db.select().from(profiles).where(eq(profiles.userId, member)))[0].bio, "Original bio QA test");
    assert.equal((await db.select().from(profiles).where(eq(profiles.userId, other)))[0].bio, "Protected peer bio");
  });
  await t.test("6: pending and claimed tasks older than 24h expire, disappear from pending and cannot finish", async () => {
    const ids: string[] = [];
    for (const status of ["pending", "claimed"]) {
      const created = await request("/api/assistant/tasks", { owner: member, method: "POST", body: { prompt: `Expired ${status}` } });
      ids.push(created.data.id);
      if (status === "claimed") assert.equal((await request(`/api/assistant/tasks/${created.data.id}`, { bearer: a.bearer, method: "PATCH", body: { status: "claimed" } })).status, 200);
    }
    await db.update(agentTasks).set({ createdAt: new Date(Date.now() - 25 * 3600_000), expiresAt: new Date(Date.now() - 3600_000) }).where(inArray(agentTasks.id, ids));
    const pending = await request("/api/assistant/tasks?status=pending", { bearer: a.bearer });
    assert.ok(!pending.data.tasks.some((entry: any) => ids.includes(entry.id)));
    const expired = (await request("/api/assistant/tasks?status=expired", { owner: member })).data.tasks;
    assert.equal(expired.filter((entry: any) => ids.includes(entry.id)).length, 2);
    assert.equal((await request(`/api/assistant/tasks/${ids[0]}`, { bearer: a.bearer, method: "PATCH", body: { status: "claimed" } })).status, 409);
    assert.equal((await request(`/api/assistant/tasks/${ids[1]}`, { bearer: a.bearer, method: "PATCH", body: { status: "done" } })).status, 409);
  });
  await t.test("a task cannot be claimed if a key-lock wait crosses its expiry deadline", async () => {
    const created = await request("/api/assistant/tasks", { owner: member, method: "POST", body: { prompt: "Lock-wait expiry fixture" } });
    assert.equal(created.status, 201);
    let waiting: ReturnType<typeof request> | undefined;
    await db.transaction(async tx => {
      await tx.select().from(agentKeys).where(eq(agentKeys.id, a.id)).for("update");
      await tx.update(agentTasks).set({ expiresAt: new Date(Date.now() + 600) }).where(eq(agentTasks.id, created.data.id));
      // Commit the short deadline separately so the waiting request sees it.
    });
    await db.transaction(async tx => {
      await tx.select().from(agentKeys).where(eq(agentKeys.id, a.id)).for("update");
      waiting = request(`/api/assistant/tasks/${created.data.id}`, { bearer: a.bearer, method: "PATCH", body: { status: "claimed" } });
      await new Promise(resolve => setTimeout(resolve, 900));
    });
    assert.equal((await waiting!).status, 409);
    const expired = (await request("/api/assistant/tasks?status=expired", { owner: member })).data.tasks;
    assert.ok(expired.some((entry: any) => entry.id === created.data.id));
  });
  await t.test("scopes, transitions, racing claims, oldest-first polling, failed state and pagination", async () => {
    assert.equal((await request("/api/assistant/tasks", { bearer: readOnly.bearer })).status, 403);
    assert.equal((await request("/api/assistant/tasks?status=unknown", { bearer: a.bearer })).status, 400);
    assert.equal((await request("/api/assistant/tasks?limit=100", { bearer: a.bearer })).status, 400);
    const first = await request("/api/assistant/tasks", { owner: member, method: "POST", body: { prompt: "First pending" } });
    const second = await request("/api/assistant/tasks", { owner: member, method: "POST", body: { prompt: "Second pending" } });
    const page = await request("/api/assistant/tasks?status=pending&limit=1", { bearer: a.bearer });
    assert.equal(page.data.tasks[0].id, first.data.id);
    assert.equal(page.data.nextOffset, 1);
    assert.equal((await request("/api/assistant/tasks?status=pending&limit=1&offset=1", { bearer: a.bearer })).data.tasks[0].id, second.data.id);
    assert.equal((await request(`/api/assistant/tasks/${first.data.id}`, { bearer: queueReader.bearer, method: "PATCH", body: { status: "claimed" } })).status, 403);
    const claims = await Promise.all([a, b].map(key =>
      request(`/api/assistant/tasks/${first.data.id}`, { bearer: key.bearer, method: "PATCH", body: { status: "claimed" } })));
    assert.deepEqual(claims.map(result => result.status).sort(), [200, 409]);
    const winner = claims[0].status === 200 ? a : b;
    assert.equal((await request(`/api/assistant/tasks/${first.data.id}`, { bearer: winner.bearer, method: "PATCH", body: { status: "failed", note: "Unable to create a permitted draft." } })).status, 200);
    assert.ok((await request("/api/assistant/tasks?status=failed", { owner: member })).data.tasks.some((entry: any) => entry.id === first.data.id));
  });
  await t.test("read-only credits and safe notification/match/knock summaries, pause and revoke boundaries", async () => {
    assert.equal((await request("/api/agent/credits", { bearer: a.bearer })).data.credits.balance, "12.00");
    const notices = (await request("/api/agent/notifications", { bearer: a.bearer })).data;
    assert.equal(notices.notifications.length, 1);
    assert.equal(notices.generalInboxSupported, false);
    assert.equal(notices.includesMessages, false);
    assert.ok(!JSON.stringify(notices).includes("Protected peer bio"));
    assert.equal((await request("/api/agent/knock-requests", { bearer: a.bearer })).data.requests.length, 1);
    assert.equal((await request("/api/agent/matches", { bearer: a.bearer })).data.matches[0].name, "PayGate member");
    await db.update(agentKeys).set({ reviewDueAt: new Date(Date.now() - 8 * 86400_000) }).where(eq(agentKeys.id, a.id));
    assert.equal((await request("/api/assistant/tasks", { bearer: a.bearer })).status, 200);
    assert.equal((await request(`/api/assistant/tasks/${taskId}`, { bearer: a.bearer, method: "PATCH", body: { status: "done" } })).status, 403);
    assert.equal((await request(`/api/agent/keys/${a.id}`, { owner: member, method: "DELETE" })).status, 200);
    assert.equal((await request("/api/assistant/tasks", { bearer: a.bearer })).status, 401);
  });
  await t.test("polling rate limit is shared per key and returns an explicit retry time", async () => {
    let last = { status: 200, retryAfter: null as string | null };
    for (let i = 0; i < 61; i++) last = await request("/api/assistant/tasks?status=pending", { bearer: queueReader.bearer });
    assert.equal(last.status, 429);
    assert.equal(last.retryAfter, "60");
  });
});

test("task input cannot smuggle scopes, member IDs, approval flags, or unsupported statuses", () => {
  assert.ok(agentTaskCreateInput.safeParse({ prompt: "Add QA test to bio" }).success);
  assert.equal(agentTaskCreateInput.safeParse({ prompt: "   " }).success, false);
  assert.equal(agentTaskCreateInput.safeParse({ prompt: "x".repeat(2001) }).success, false);
  assert.equal(agentTaskCreateInput.safeParse({ prompt: `Key pgai_${"x".repeat(43)}` }).success, false);
  assert.equal(agentTaskCreateInput.safeParse({ prompt: "Request", userId: "someone-else" }).success, false);
  assert.equal(agentTaskUpdateInput.safeParse({ status: "done", approve: true }).success, false);
  assert.equal(agentTaskUpdateInput.safeParse({ status: "pending" }).success, false);
  assert.equal(agentTaskUpdateInput.safeParse({ status: "done", note: `Key pgai_${"x".repeat(43)}` }).success, false);
  assert.equal(agentTaskQueryInput.safeParse({ status: "pending", limit: "10" }).success, true);
});
