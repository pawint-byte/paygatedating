import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import vm from "node:vm";
import express from "express";
import ts from "typescript";
import { z } from "zod";

import { createQaAccess, withQaActionLock } from "../server/qa-access.ts";
import { GATE_COSTS, PREMIUM_GATE_DISCOUNT } from "../shared/schema.ts";
import { isQaMemberId, QA_MEMBER_HEADER } from "../shared/qa.ts";

const alice = "qa_track_a_alice";
const bob = "qa_track_a_bob";

/*
 * These are source-handler contract tests, rather than a live authenticated
 * E2E suite.  The AST extraction makes the routes below execute the exact
 * handler expressions in server/routes.ts while the only replaceable boundary
 * is an in-memory storage/email/auth implementation.
 */
async function routeHandler(method: "get" | "post", path: string, bindings: Record<string, unknown>) {
  const fileName = new URL("../server/routes.ts", import.meta.url).pathname;
  const source = await readFile(fileName, "utf8");
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(tree) === "app" &&
      node.expression.name.text === method &&
      ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === path) {
      found.push(node.arguments[node.arguments.length - 1]);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(found.length, 1, `Expected exactly one app.${method}(${path}) route expression`);
  const javascript = ts.transpileModule(`handler = (${found[0].getText(tree)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName,
  }).outputText;
  const context = vm.createContext({ ...bindings, console, handler: undefined });
  new vm.Script(javascript, { filename: `${fileName}:${method}:${path}` }).runInContext(context);
  assert.equal(typeof context.handler, "function", `Could not compile ${method} ${path} handler`);
  return context.handler as express.RequestHandler;
}

type Match = {
  id: string; initiatorId: string; recipientId: string; message?: string;
  currentGate: string; status: string; lastActionBy: string; gate1PaidBy?: string;
};

function memory() {
  const profiles = new Map([
    [alice, { userId: alice, displayName: "QA Alice", subscriptionTier: "free", isVisible: true }],
    [bob, { userId: bob, displayName: "QA Bob", subscriptionTier: "free", isVisible: true }],
  ]);
  const wallets = new Map([
    [alice, { id: `wallet-${alice}`, userId: alice, balance: "20.00" }],
    [bob, { id: `wallet-${bob}`, userId: bob, balance: "20.00" }],
  ]);
  const rewards = new Map([[alice, { firstMatchFreeUsed: true }], [bob, { firstMatchFreeUsed: true }]]);
  const matches = new Map<string, Match>();
  const transactions: any[] = [];
  const connections: any[] = [];
  let next = 1;
  const storage = {
    isUserAdmin: async (id: string) => id === "real-admin",
    getProfile: async (id: string) => profiles.get(id),
    getWallet: async (id: string) => wallets.get(id),
    createWallet: async ({ userId }: any) => {
      const wallet = { id: `wallet-${userId}`, userId, balance: "0.00" };
      wallets.set(userId, wallet); return wallet;
    },
    getTransactions: async (walletId: string) => transactions.filter(t => t.walletId === walletId),
    getMatchesByUser: async (id: string) => [...matches.values()].filter(m => m.initiatorId === id || m.recipientId === id),
    getMatch: async (id: string) => matches.get(id),
    getUserRewards: async (id: string) => rewards.get(id),
    useFirstMatchFree: async (id: string) => { rewards.get(id)!.firstMatchFreeUsed = true; },
    createMatch: async (input: any) => {
      const match: Match = { id: `match-${next++}`, ...input, currentGate: "gate1", status: "pending" };
      matches.set(match.id, match); return match;
    },
    updateWalletBalance: async (id: string, balance: string) => { wallets.get(id)!.balance = balance; },
    createTransaction: async (transaction: any) => { transactions.push({ id: `tx-${transactions.length + 1}`, ...transaction }); },
    getPendingPullRequest: async () => undefined,
    updateMatch: async (id: string, patch: any) => {
      const match = matches.get(id)!; Object.assign(match, patch); return match;
    },
    createConnectionIfNotExists: async (...connection: any[]) => { connections.push(connection); },
  };
  return { storage, wallets, matches, transactions, connections };
}

async function exerciseWalletFlow(initiatorId: string, recipientId: string) {
  const state = memory();
  const createMatchSchema = z.object({ recipientId: z.string().min(1), message: z.string().optional() });
  const bindings = {
    storage: state.storage,
    authStorage: { getUser: async () => undefined }, // no email address: email is never sent
    emailService: { sendInterestReceived: () => { throw new Error("email must not be reached"); }, sendGateUnlocked: () => { throw new Error("email must not be reached"); } },
    GATE_COSTS, PREMIUM_GATE_DISCOUNT, QA_MEMBER_HEADER, isQaMemberId, z, createMatchSchema,
    withQaActionLock, acquireQaActionLock: async () => async () => {},
  };
  const [wallet, transactions, matches, interest, advance] = await Promise.all([
    routeHandler("get", "/api/wallet", bindings),
    routeHandler("get", "/api/wallet/transactions", bindings),
    routeHandler("get", "/api/matches", bindings),
    routeHandler("post", "/api/matches", bindings),
    routeHandler("post", "/api/matches/:id/advance", bindings),
  ]);

  const app = express();
  app.use(express.json());
  // Fixed authenticated admin is intentionally server-side only; QA middleware
  // derives the effective Alice/Bob identity from its header.
  app.use((req: any, _res, next) => {
    req.isAuthenticated = () => true;
    req.user = { claims: { sub: "real-admin" } };
    next();
  });
  app.use(createQaAccess({
    authenticate: (_req, _res, next) => next(),
    isAdmin: state.storage.isUserAdmin,
    getProfile: state.storage.getProfile,
    getMatch: state.storage.getMatch,
  }));
  app.get("/api/wallet", wallet);
  app.get("/api/wallet/transactions", transactions);
  app.get("/api/matches", matches);
  app.post("/api/matches", interest);
  app.post("/api/matches/:id/advance", advance);

  const server: Server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const request = async (member: string, path: string, method = "GET", body?: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: { [QA_MEMBER_HEADER]: member, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, body: await response.json() };
  };

  try {
    for (const member of [alice, bob]) assert.equal((await request(member, "/api/wallet")).body.balance, "20.00");
    const sent = await request(initiatorId, "/api/matches", "POST", { recipientId, message: "Hi" });
    assert.equal(sent.response.status, 201);
    assert.equal(sent.body.chargedAmount, 5);
    assert.equal(sent.body.paymentType, "wallet");
    const id = sent.body.id;
    assert.equal((await request(initiatorId, "/api/wallet")).body.balance, "15.00");
    assert.equal((await request(recipientId, "/api/wallet")).body.balance, "20.00");
    for (const member of [alice, bob]) {
      const listed = await request(member, "/api/matches");
      assert.equal(listed.body.length, 1);
      assert.equal(listed.body[0].currentGate, "gate1");
      assert.equal(listed.body[0].status, "pending");
    }

    assert.equal((await request(initiatorId, `/api/matches/${id}/advance`, "POST")).response.status, 403, "initiator cannot accept Gate 1");
    assert.equal((await request(initiatorId, "/api/wallet")).body.balance, "15.00", "denial cannot debit");
    const accepted = await request(recipientId, `/api/matches/${id}/advance`, "POST");
    assert.equal(accepted.response.status, 200);
    assert.equal(accepted.body.currentGate, "gate2");
    assert.equal(accepted.body.status, "active");
    assert.equal(accepted.body.gate1PaidBy, recipientId);

    // Independently re-fetch every public read model from both perspectives;
    // the mutation response alone is not evidence that counterpart state agrees.
    for (const member of [initiatorId, recipientId]) {
      const fetchedWallet = await request(member, "/api/wallet");
      assert.equal(fetchedWallet.body.balance, "15.00");

      const fetchedMatches = await request(member, "/api/matches");
      assert.equal(fetchedMatches.body.length, 1);
      assert.equal(fetchedMatches.body[0].id, id);
      assert.equal(fetchedMatches.body[0].currentGate, "gate2");
      assert.equal(fetchedMatches.body[0].status, "active");
      assert.equal(fetchedMatches.body[0].gate1PaidBy, recipientId);

      const fetchedTransactions = await request(member, "/api/wallet/transactions");
      assert.equal(fetchedTransactions.body.length, 1);
      assert.equal(fetchedTransactions.body[0].walletId, `wallet-${member}`);
      assert.equal(fetchedTransactions.body[0].amount, "-5.00");
      assert.equal(fetchedTransactions.body[0].type, "gate_payment");
      assert.equal(fetchedTransactions.body[0].relatedMatchId ?? null,
        member === recipientId ? id : null);
    }
    assert.equal(state.connections.length, 2);
    assert.deepEqual(state.transactions.map(t => [t.walletId, t.amount, t.relatedMatchId ?? null]), [
      [`wallet-${initiatorId}`, "-5.00", null], [`wallet-${recipientId}`, "-5.00", id],
    ]);
    assert.ok([403, 409].includes((await request(recipientId, `/api/matches/${id}/advance`, "POST")).response.status),
      "QA middleware may reject a post-Gate-1 repeat before the handler sees it");
    assert.equal((await request(recipientId, "/api/wallet")).body.balance, "15.00", "repeat cannot debit");
    assert.equal((await request(recipientId, "/api/matches", "POST", { recipientId: initiatorId })).response.status, 409);
    assert.equal(state.matches.size, 1);
    assert.equal(state.transactions.length, 2, "duplicate/repeat attempts cannot add ledger rows");
  } finally {
    server.close();
    await once(server, "close");
  }
}

for (const [initiatorId, recipientId, label] of [
  [alice, bob, "Alice initiates and Bob accepts"],
  [bob, alice, "Bob initiates and Alice accepts"],
] as const) {
  test(`QA Interest/Gate 1 source handlers: ${label}`, async () => {
    await exerciseWalletFlow(initiatorId, recipientId);
  });
}