import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import express from "express";
import { z } from "zod";

import { createQaAccess } from "../server/qa-access.ts";
import { QA_MEMBER_HEADER, QA_MEMBERS } from "../shared/qa.ts";
import { isValidQaFixtureRecord } from "../shared/qa-controls.ts";

const alice = QA_MEMBERS[0].userId;
const bob = QA_MEMBERS[1].userId;

function extractRoute(method: "get" | "post", path: string, storage: object) {
  const file = "server/routes.ts";
  const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let expression: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.getText(tree) === `app.${method}` &&
      ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === path) {
      expression = node.arguments.at(-1)!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression, `Missing ${method.toUpperCase()} ${path}`);
  const context = vm.createContext({
    storage,
    z,
    authStorage: { getUser: async () => undefined },
    emailService: { sendNewMessage: async () => undefined },
    console,
    handler: undefined,
  });
  vm.runInContext(ts.transpileModule(`handler = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.handler as (req: any, res: any) => Promise<void>;
}

test("QA fixture messaging uses normal gate/auth/ended handlers for both perspectives", async () => {
  const profiles = new Map([
    [alice, { displayName: "QA Alice", subscriptionTier: "free" }],
    [bob, { displayName: "QA Bob", subscriptionTier: "free" }],
    ["ordinary-a", { displayName: "Ordinary A", subscriptionTier: "free" }],
    ["ordinary-b", { displayName: "Ordinary B", subscriptionTier: "free" }],
  ]);
  const users = new Map([
    [alice, { firstName: "QA", lastName: "Alice", email: null, isAdmin: false }],
    [bob, { firstName: "QA", lastName: "Bob", email: null, isAdmin: false }],
  ]);
  const wallets = new Map([
    [alice, { trialCreditsReceived: true }],
    [bob, { trialCreditsReceived: true }],
  ]);
  const matches = new Map<string, any>([
    ["qa-pair", { id: "qa-pair", initiatorId: alice, recipientId: bob, currentGate: "gate1", status: "active" }],
    ["ordinary-pair", { id: "ordinary-pair", initiatorId: "ordinary-a", recipientId: "ordinary-b", currentGate: "gate3", status: "active" }],
  ]);
  const messages = new Map<string, any[]>([
    ["qa-pair", [{ id: "initial", matchId: "qa-pair", senderId: bob, content: "hello", readAt: null }]],
    ["ordinary-pair", []],
  ]);
  const readRequests: string[][] = [];
  const created: any[] = [];
  let lockAcquires = 0;
  let lockReleases = 0;
  const storage = {
    getMatch: async (id: string) => matches.get(id),
    getProfile: async (id: string) => profiles.get(id),
    getMessages: async (id: string) => messages.get(id) || [],
    createMessage: async (input: any) => {
      const message = { id: `message-${created.length + 1}`, ...input, readAt: null };
      created.push(message);
      messages.get(input.matchId)!.push(message);
      return message;
    },
    markMessagesAsRead: async (matchId: string, userId: string) => {
      readRequests.push([matchId, userId]);
      for (const message of messages.get(matchId) || []) {
        if (message.senderId !== userId) message.readAt = new Date();
      }
    },
  };
  const handlers = {
    get: extractRoute("get", "/api/matches/:id/messages", storage),
    post: extractRoute("post", "/api/matches/:id/messages", storage),
    read: extractRoute("post", "/api/matches/:id/messages/read", storage),
  };
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.isAuthenticated = () => true;
    req.user = { claims: { sub: req.get("x-test-user") || "test-admin" } };
    next();
  });
  app.use(createQaAccess({
    authenticate: (_req, _res, next) => next(),
    isAdmin: async id => id === "test-admin",
    getProfile: storage.getProfile,
    getMatch: storage.getMatch,
    validateQaFixtures: async (memberIds: readonly string[]) =>
      memberIds.length === 2 && new Set(memberIds).size === memberIds.length &&
      memberIds.every(memberId => isValidQaFixtureRecord(memberId, {
        user: users.get(memberId),
        profile: profiles.get(memberId),
        wallet: wallets.get(memberId),
      })),
    acquireActionLock: async () => {
      lockAcquires++;
      return async () => { lockReleases++; };
    },
  }));
  const auth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
    next();
  };
  app.get("/api/matches/:id/messages", auth, (req, res) => handlers.get(req, res));
  app.post("/api/matches/:id/messages", auth, (req, res) => handlers.post(req, res));
  app.post("/api/matches/:id/messages/read", auth, (req, res) => handlers.read(req, res));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const request = (member: string, path: string, method = "GET", body?: unknown) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        [QA_MEMBER_HEADER]: member,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    for (const gate of ["gate1", "gate2"] as const) {
      matches.get("qa-pair")!.currentGate = gate;
      for (const member of [alice, bob]) {
        for (const [path, method, body] of [
          ["/api/matches/qa-pair/messages", "GET", undefined],
          ["/api/matches/qa-pair/messages", "POST", { content: "blocked" }],
          ["/api/matches/qa-pair/messages/read", "POST", undefined],
        ] as const) {
          const result = await request(member, path, method, body);
          assert.equal(result.status, 403, `${gate} ${member} ${method} ${path}`);
          assert.match((await result.json()).message, /Gate 3/);
        }
      }
    }

    matches.get("qa-pair")!.currentGate = "gate3";
    for (const member of [alice, bob]) {
      const fetched = await request(member, "/api/matches/qa-pair/messages");
      assert.equal(fetched.status, 200);
      assert.equal((await fetched.json())[0].content, "hello");
      const sent = await request(member, "/api/matches/qa-pair/messages", "POST", { content: `from ${member}` });
      assert.equal(sent.status, 201);
      const receipt = await request(member, "/api/matches/qa-pair/messages/read", "POST");
      assert.equal(receipt.status, 200);
      assert.equal((await receipt.json()).success, true);
    }
    assert.equal(created.length, 2);
    assert.deepEqual(readRequests, [["qa-pair", alice], ["qa-pair", bob]]);
    // Gate 1/2 POSTs still pass through the normal message handlers so they
    // return the normal "Gate 3" denial. They are genuine QA mutations and
    // must therefore acquire/release the same lock as successful Gate 3
    // sends/read receipts. GETs never acquire it.
    const expectedQaMutations = 2 * 2 * 2 + 2 * 2;
    assert.equal(lockAcquires, expectedQaMutations, "every QA send/read action acquires the existing lock");
    assert.equal(lockReleases, expectedQaMutations, "every QA send/read action releases its lock");

    matches.get("qa-pair")!.status = "declined";
    const ended = await request(alice, "/api/matches/qa-pair/messages");
    assert.equal(ended.status, 403);
    assert.equal((await ended.json()).message, "Match already ended");

    const ordinary = await fetch(`${base}/api/matches/ordinary-pair/messages`, {
      headers: { "content-type": "application/json", "x-test-user": "ordinary-a" },
    });
    assert.equal(ordinary.status, 200, "ordinary non-QA chat still uses the normal route");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("QA messaging rejects arbitrary participants and invalid fixture profiles", async () => {
  const profiles = new Map([
    [alice, { displayName: "QA Alice", subscriptionTier: "free" }],
    [bob, { displayName: "QA Bob", subscriptionTier: "free" }],
  ]);
  const users = new Map([
    [alice, { firstName: "QA", lastName: "Alice", email: null, isAdmin: false }],
    [bob, { firstName: "QA", lastName: "Bob", email: null, isAdmin: false }],
  ]);
  const wallets = new Map([
    [alice, { trialCreditsReceived: true }],
    [bob, { trialCreditsReceived: true }],
  ]);
  const matches = new Map([
    ["ordinary", { id: "ordinary", initiatorId: alice, recipientId: "ordinary-member", currentGate: "gate3", status: "active" }],
    ["same", { id: "same", initiatorId: alice, recipientId: alice, currentGate: "gate3", status: "active" }],
    ["pair", { id: "pair", initiatorId: alice, recipientId: bob, currentGate: "gate3", status: "active" }],
  ]);
  const app = express();
  app.use((req: any, _res, next) => {
    req.isAuthenticated = () => true;
    req.user = { claims: { sub: "test-admin" } };
    next();
  });
  app.use(createQaAccess({
    authenticate: (_req, _res, next) => next(),
    isAdmin: async () => true,
    getProfile: async id => profiles.get(id),
    getMatch: async id => matches.get(id),
    validateQaFixtures: async (memberIds: readonly string[]) =>
      memberIds.length === 2 && new Set(memberIds).size === memberIds.length &&
      memberIds.every(memberId => isValidQaFixtureRecord(memberId, {
        user: users.get(memberId),
        profile: profiles.get(memberId),
        wallet: wallets.get(memberId),
      })),
  }));
  app.get("/api/matches/:id/messages", (_req, res) => res.json({ unexpected: true }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  try {
    for (const id of ["ordinary", "same"]) {
      const result = await fetch(`http://127.0.0.1:${address.port}/api/matches/${id}/messages`, {
        headers: { [QA_MEMBER_HEADER]: alice },
      });
      assert.equal(result.status, 403);
    }
    profiles.set(bob, { displayName: "Not QA Bob", subscriptionTier: "free" });
    const invalidProfile = await fetch(`http://127.0.0.1:${address.port}/api/matches/pair/messages`, {
      headers: { [QA_MEMBER_HEADER]: alice },
    });
    assert.equal(invalidProfile.status, 409);
    profiles.set(bob, { displayName: "QA Bob", subscriptionTier: "free" });
    for (const corrupt of [
      () => { users.get(bob)!.isAdmin = true; },
      () => { users.get(bob)!.email = "spoof@example.test"; },
      () => { users.get(bob)!.firstName = "Not QA"; },
      () => { users.get(bob)!.lastName = "Spoofed"; },
      () => { wallets.get(bob)!.trialCreditsReceived = false; },
    ]) {
      corrupt();
      const spoofed = await fetch(`http://127.0.0.1:${address.port}/api/matches/pair/messages`, {
        headers: { [QA_MEMBER_HEADER]: alice },
      });
      assert.equal(spoofed.status, 409, "all full fixture integrity failures fail closed");
      users.get(bob)!.isAdmin = false;
      users.get(bob)!.email = null;
      users.get(bob)!.firstName = "QA";
      users.get(bob)!.lastName = "Bob";
      wallets.get(bob)!.trialCreditsReceived = true;
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});