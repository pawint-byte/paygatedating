import assert from "node:assert/strict";
import { once } from "node:events";
import { request as httpRequest, type Server } from "node:http";
import { test } from "node:test";
import express from "express";

import { createQaAccess, withQaActionLock } from "../server/qa-access.ts";
import { QA_MEMBER_HEADER } from "../shared/qa.ts";

const alice = "qa_track_a_alice";
const bob = "qa_track_a_bob";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test("createQaAccess restricts and scopes QA fixture access", async (t) => {
  const app = express();
  app.use(express.json());

  // This is deliberately an isolated test-app authentication shim.  It never
  // reaches the real authentication, database, or any external service.
  const originalUsers = new Map<string, { claims: { sub: string }; expires_at: string }>();
  app.use((req: any, _res, next) => {
    const requestId = req.get("x-test-request-id");
    const authenticated = req.get("x-test-session") === "admin";
    req.isAuthenticated = () => authenticated;
    if (authenticated) {
      const user = {
        claims: { sub: "real-admin" },
        expires_at: "2099-01-01T00:00:00.000Z",
      };
      req.user = user;
      if (requestId) originalUsers.set(requestId, user);
    }
    next();
  });

  const profiles = new Map([
    [alice, { displayName: "QA Alice", subscriptionTier: "free" }],
    [bob, { displayName: "QA Bob", subscriptionTier: "free" }],
  ]);
  const matches = new Map([
    ["pair-gate1", { initiatorId: alice, recipientId: bob, currentGate: "gate1", status: "active" }],
    ["other-member", { initiatorId: alice, recipientId: "member-c", currentGate: "gate1", status: "active" }],
    ["gate2", { initiatorId: alice, recipientId: bob, currentGate: "gate2", status: "active" }],
    // A previously advanced match presents gate 2 on a repeat request.
    ["repeated", { initiatorId: alice, recipientId: bob, currentGate: "gate2", status: "active" }],
    ["declined", { initiatorId: alice, recipientId: bob, currentGate: "gate1", status: "declined" }],
    ["paused", { initiatorId: alice, recipientId: bob, currentGate: "gate1", status: "active", gatePaused: true }],
  ]);

  let authenticateCalls = 0;
  app.use(createQaAccess({
    authenticate: (req: any, res, next) => {
      authenticateCalls++;
      if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }
      next();
    },
    isAdmin: async (userId) => userId === "real-admin",
    getProfile: async (userId) => profiles.get(userId),
    getMatch: async (id) => matches.get(id),
  }));

  let walletEffectiveUser: unknown;
  app.use((req: any, res) => {
    if (req.path === "/api/wallet") walletEffectiveUser = req.user;
    res.json({ path: req.path, userId: req.user?.claims?.sub ?? null });
  });

  const server: Server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let requestNumber = 0;

  const request = async (
    path: string,
    options: { method?: string; member?: string; session?: boolean; origin?: string; secFetchSite?: string; body?: unknown } = {},
  ) => {
    const requestId = `request-${++requestNumber}`;
    const headers: Record<string, string> = { "x-test-request-id": requestId };
    if (options.member !== undefined) headers[QA_MEMBER_HEADER] = options.member;
    if (options.session) headers["x-test-session"] = "admin";
    if (options.origin) headers.origin = options.origin;
    if (options.secFetchSite) headers["sec-fetch-site"] = options.secFetchSite;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    return { response, body: await response.json(), requestId };
  };

  try {
    const ordinary = await request("/api/ordinary");
    assert.equal(ordinary.response.status, 200);
    assert.equal(ordinary.body.userId, null);
    assert.equal(ordinary.response.headers.get("cache-control"), null);
    assert.equal(authenticateCalls, 0, "ordinary requests must bypass QA authentication");

    const unauthenticated = await request("/api/wallet", { member: alice });
    assert.equal(unauthenticated.response.status, 401);

    const nonAdminApp = express();
    nonAdminApp.use((req: any, _res, next) => {
      req.user = { claims: { sub: "not-an-admin" } };
      req.isAuthenticated = () => true;
      next();
    });
    nonAdminApp.use(createQaAccess({
      authenticate: (_req, _res, next) => next(),
      isAdmin: async () => false,
      getProfile: async () => profiles.get(alice),
      getMatch: async () => undefined,
    }));
    nonAdminApp.use((_req, res) => res.json({ unexpected: true }));
    const nonAdminServer = nonAdminApp.listen(0, "127.0.0.1");
    await once(nonAdminServer, "listening");
    const nonAdminAddress = nonAdminServer.address();
    assert.ok(nonAdminAddress && typeof nonAdminAddress !== "string");
    try {
      const response = await fetch(`http://127.0.0.1:${nonAdminAddress.port}/api/wallet`, {
        headers: { [QA_MEMBER_HEADER]: alice },
      });
      assert.equal(response.status, 403);
    } finally {
      nonAdminServer.close();
      await once(nonAdminServer, "close");
    }

    const crossSite = await request("/api/wallet", {
      member: alice, session: true, origin: "https://attacker.example", secFetchSite: "cross-site",
    });
    assert.equal(crossSite.response.status, 403);

    const arbitraryId = await request("/api/wallet", { member: "arbitrary-member", session: true });
    assert.equal(arbitraryId.response.status, 400);

    for (const path of [
      "/api/wallet/deposit",
      "/api/gifts/checkout",
      "/api/subscription/create-checkout",
      "/api/auth/logout",
      "/api/admin/users",
    ]) {
      const denied = await request(path, { method: "POST", member: alice, session: true });
      assert.equal(denied.response.status, 403, `${path} must not be available in QA mode`);
    }

    const arbitraryInterest = await request("/api/matches", {
      method: "POST", member: alice, session: true, body: { recipientId: "member-c" },
    });
    assert.equal(arbitraryInterest.response.status, 403);

    const wallet = await request("/api/wallet", { member: alice, session: true });
    assert.equal(wallet.response.status, 200);
    assert.equal(wallet.body.userId, alice, "wallet route receives the QA effective identity");
    assert.equal((walletEffectiveUser as any).claims.sub, alice);
    assert.equal(wallet.response.headers.get("cache-control"), "no-store");
    assert.match(wallet.response.headers.get("vary") ?? "", new RegExp(QA_MEMBER_HEADER, "i"));
    const originalWalletUser = originalUsers.get(wallet.requestId);
    assert.ok(originalWalletUser);
    assert.equal(originalWalletUser.claims.sub, "real-admin", "the real authentication object is not mutated");
    assert.notEqual(walletEffectiveUser, originalWalletUser);

    const interest = await request("/api/matches", {
      method: "POST", member: alice, session: true, body: { recipientId: bob },
    });
    assert.equal(interest.response.status, 200);

    for (const [id, expectedStatus] of [
      ["pair-gate1", 200],
      ["other-member", 403],
      ["gate2", 403],
      ["repeated", 403],
      ["declined", 403],
      ["paused", 403],
    ] as const) {
      const advance = await request(`/api/matches/${id}/advance`, {
        method: "POST", member: alice, session: true,
      });
      assert.equal(advance.response.status, expectedStatus, `${id} advance result`);
      if (expectedStatus === 200) {
        assert.equal(advance.response.headers.get("cache-control"), "no-store");
        assert.match(advance.response.headers.get("vary") ?? "", new RegExp(QA_MEMBER_HEADER, "i"));
      }
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("withQaActionLock holds mutations through disconnect and releases after work settles", async () => {
  const app = express();
  const work = deferred<void>();
  const firstHandlerStarted = deferred<void>();
  const firstReleaseCompleted = deferred<void>();
  let locked = false;
  let acquireCalls = 0;
  let releaseCalls = 0;
  let qaHandlerCalls = 0;
  let ordinaryHandlerCalls = 0;
  let firstWorkSettled = false;

  const handler = async (req: any, res: any) => {
    if (!req.get(QA_MEMBER_HEADER)) {
      ordinaryHandlerCalls++;
      res.status(204).end();
      return;
    }
    qaHandlerCalls++;
    if (req.path === "/deferred" && qaHandlerCalls === 1) {
      firstHandlerStarted.resolve();
      await work.promise;
      firstWorkSettled = true;
      if (!res.destroyed) res.status(204).end();
      return;
    }
    if (req.path === "/throw") throw new Error("test handler failure");
    res.status(204).end();
  };

  app.use(withQaActionLock(handler, async () => {
    acquireCalls++;
    if (locked) return undefined;
    locked = true;
    return async () => {
      locked = false;
      releaseCalls++;
      if (releaseCalls === 1) firstReleaseCompleted.resolve();
    };
  }));

  const server: Server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const firstClient = httpRequest(`${baseUrl}/deferred`, {
      method: "POST",
      headers: { [QA_MEMBER_HEADER]: alice },
    });
    firstClient.on("error", () => {
      // Destroying this test client is intentional.
    });
    firstClient.end();
    await firstHandlerStarted.promise;
    firstClient.destroy();

    assert.equal(locked, true);
    assert.equal(firstWorkSettled, false);

    const acquireCallsWhileHeld = acquireCalls;
    const ordinary = await fetch(`${baseUrl}/ordinary`, { method: "POST" });
    assert.equal(ordinary.status, 204);
    assert.equal(ordinaryHandlerCalls, 1);
    assert.equal(acquireCalls, acquireCallsWhileHeld, "requests without the QA header bypass the lock");

    const conflicting = await fetch(`${baseUrl}/deferred`, {
      method: "POST",
      headers: { [QA_MEMBER_HEADER]: bob },
    });
    assert.equal(conflicting.status, 409);
    assert.equal(qaHandlerCalls, 1, "the conflicting mutation must not reach its handler");

    work.resolve();
    await firstReleaseCompleted.promise;
    assert.equal(firstWorkSettled, true);
    assert.equal(locked, false);

    const afterRelease = await fetch(`${baseUrl}/after-release`, {
      method: "POST",
      headers: { [QA_MEMBER_HEADER]: alice },
    });
    assert.equal(afterRelease.status, 204);
    assert.equal(qaHandlerCalls, 2);

    const releasesBeforeThrow = releaseCalls;
    const thrown = await fetch(`${baseUrl}/throw`, {
      method: "POST",
      headers: { [QA_MEMBER_HEADER]: alice },
    });
    assert.equal(thrown.status, 500);
    assert.equal(releaseCalls, releasesBeforeThrow + 1, "a throwing handler releases its lock");
    assert.equal(locked, false);

    const afterThrow = await fetch(`${baseUrl}/after-throw`, {
      method: "POST",
      headers: { [QA_MEMBER_HEADER]: bob },
    });
    assert.equal(afterThrow.status, 204);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("withQaActionLock skips an aborted request that disconnects before acquisition", async () => {
  const app = express();
  const acquireCalled = deferred<void>();
  const acquisition = deferred<() => Promise<void>>();
  const requestAborted = deferred<void>();
  const releaseCompleted = deferred<void>();
  let handlerCalls = 0;
  let releaseCalls = 0;

  app.use((req, _res, next) => {
    req.once("aborted", () => requestAborted.resolve());
    next();
  });
  app.use(withQaActionLock(
    async (_req, res) => {
      handlerCalls++;
      res.status(204).end();
    },
    async () => {
      acquireCalled.resolve();
      return acquisition.promise;
    },
  ));

  const server: Server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const client = httpRequest(`${baseUrl}/mutation`, {
      method: "POST",
      headers: { [QA_MEMBER_HEADER]: alice },
    });
    client.on("error", () => {
      // Destroying this test client is intentional.
    });
    client.end();
    await acquireCalled.promise;
    client.destroy();
    await requestAborted.promise;

    acquisition.resolve(async () => {
      releaseCalls++;
      releaseCompleted.resolve();
    });
    await releaseCompleted.promise;

    assert.equal(handlerCalls, 0);
    assert.equal(releaseCalls, 1);
  } finally {
    server.close();
    await once(server, "close");
  }
});