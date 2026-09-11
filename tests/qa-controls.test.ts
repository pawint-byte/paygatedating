import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import express from "express";
import { z } from "zod";

import { QA_MEMBERS } from "../shared/qa.ts";
import { isValidQaFixtureRecord, qaGateControlSchema } from "../shared/qa-controls.ts";
import { sameOriginQaRequest } from "../server/qa-access.ts";

const alice = QA_MEMBERS[0].userId;
const bob = QA_MEMBERS[1].userId;

function extractFunction(file: string, name: string, bindings: Record<string, unknown>) {
  const source = readFileSync(file, "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  let expression: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      expression = node.getText(tree).replace(/^export\s+/, "");
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression, `Missing ${name}`);
  const context = vm.createContext({ ...bindings, console, value: undefined });
  vm.runInContext(ts.transpileModule(`value = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.value as (...args: any[]) => Promise<any>;
}

function extractRouteHandler(method: "get" | "post", path: string, bindings: Record<string, unknown>) {
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
  const context = vm.createContext({ ...bindings, console, handler: undefined });
  vm.runInContext(ts.transpileModule(`handler = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.handler as (req: any, res: any) => Promise<void>;
}

function fixtureDb() {
  const state = {
    users: QA_MEMBERS.map(member => ({
      id: member.userId,
      firstName: "QA",
      lastName: member.displayName.slice(3),
      email: null,
      isAdmin: false,
    })),
    profiles: QA_MEMBERS.map(member => ({
      userId: member.userId,
      displayName: member.displayName,
      subscriptionTier: "free",
    })),
    wallets: QA_MEMBERS.map(member => ({
      userId: member.userId,
      trialCreditsReceived: true,
      balance: "20.00",
    })),
    transactions: [] as any[],
    matches: [
      {
        id: "qa-pair-1", initiatorId: alice, recipientId: bob,
        currentGate: "gate2", status: "active", gate1PaidBy: bob,
        skipPaid: false, gatePaused: true, gatePausedBy: bob,
      },
      {
        id: "qa-pair-2", initiatorId: bob, recipientId: alice,
        currentGate: "gate3", status: "active", skipPaid: false,
        gatePaused: false,
      },
      {
        id: "same-member", initiatorId: alice, recipientId: alice,
        currentGate: "gate1", status: "pending", skipPaid: false,
      },
      {
        id: "ordinary", initiatorId: "ordinary-a", recipientId: "ordinary-b",
        currentGate: "gate3", status: "active", skipPaid: false,
      },
    ],
  };
  let lockCalls = 0;
  const table = (name: keyof typeof state, columns: string[]) =>
    Object.assign({ table: name }, ...columns.map(column => ({ [column]: column })));
  const users = table("users", ["id"]);
  const profiles = table("profiles", ["userId"]);
  const wallets = table("wallets", ["userId"]);
  const matches = table("matches", ["id"]);
  const selectRows = (name: keyof typeof state) => (state[name] as any[]).slice();
  const query = (rows: any[]) => Object.assign(Promise.resolve(rows), {
    for: async () => rows,
  });
  const tx = {
    execute: async () => { lockCalls++; },
    select: () => ({
      from: (tableRef: { table: keyof typeof state }) => {
        const result = query(selectRows(tableRef.table));
        return Object.assign(result, {
          where: ({ column, value }: { column: string; value: unknown }) =>
            query(selectRows(tableRef.table).filter(row => row[column] === value)),
        });
      },
    }),
    update: (tableRef: { table: keyof typeof state }) => ({
      set: (patch: Record<string, unknown>) => ({
        where: ({ column, value }: { column: string; value: unknown }) => ({
          returning: async () => {
            const row = (state[tableRef.table] as any[]).find(item => item[column] === value);
            if (row) Object.assign(row, patch);
            return row ? [row] : [];
          },
        }),
      }),
    }),
    insert: (tableRef: { table: keyof typeof state }) => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          assert.equal(tableRef.table, "matches");
          const match = {
            id: `qa-created-${state.matches.length + 1}`,
            currentGate: "gate1",
            status: "pending",
            skipPaid: false,
            gatePaused: false,
            ...values,
          };
          (state.matches as any[]).push(match);
          return [match];
        },
      }),
    }),
  };
  const db = { transaction: async (work: (transaction: typeof tx) => Promise<any>) => work(tx) };
  const bindings = {
    db,
    users,
    profiles,
    wallets,
    matches,
    QA_MEMBERS,
    isValidQaFixtureRecord,
    qaGateControlSchema,
    QaControlError: class QaControlError extends Error {
      constructor(message: string, readonly statusCode = 409) { super(message); }
    },
    eq: (column: string, value: unknown) => ({ column, value }),
    sql: () => ({}),
    isQaMemberId: (value: unknown) => value === alice || value === bob,
  };
  const sourceFile = "server/qa-members.ts";
  const getMatches = extractFunction(sourceFile, "getQaMemberMatches", {
    ...bindings,
    validateQaFixtures: extractFunction(sourceFile, "validateQaFixtures", bindings),
    isFixturePair: (initiatorId: string, recipientId: string) =>
      (initiatorId === alice || initiatorId === bob) &&
      (recipientId === alice || recipientId === bob) &&
      initiatorId !== recipientId,
  });
  const setGate = extractFunction(sourceFile, "setQaMemberGate", {
    ...bindings,
    validateQaFixtures: extractFunction(sourceFile, "validateQaFixtures", bindings),
    isFixturePair: (initiatorId: string, recipientId: string) =>
      (initiatorId === alice || initiatorId === bob) &&
      (recipientId === alice || recipientId === bob) &&
      initiatorId !== recipientId,
  });
  const ensure = extractFunction(sourceFile, "ensureQaMemberMatch", {
    ...bindings,
    validateQaFixtures: extractFunction(sourceFile, "validateQaFixtures", bindings),
    isFixturePair: (initiatorId: string, recipientId: string) =>
      (initiatorId === alice || initiatorId === bob) &&
      (recipientId === alice || recipientId === bob) &&
      initiatorId !== recipientId,
  });
  return { state, getMatches, setGate, ensure, lockCalls: () => lockCalls };
}

test("QA gate controls select only distinct fixture pairs and update no payment records", async () => {
  const service = fixtureDb();
  const listed = await service.getMatches();
  assert.deepEqual(listed.map(match => match.id), ["qa-pair-1", "qa-pair-2"]);

  const beforeWallets = structuredClone(service.state.wallets);
  const beforeTransactions = structuredClone(service.state.transactions);
  for (const [gate, status] of [
    ["gate1", "pending"],
    ["gate2", "active"],
    ["gate3", "active"],
    ["gate4", "active"],
    ["gate5", "active"],
    ["completed", "completed"],
  ] as const) {
    const updated = await service.setGate("test-admin", "qa-pair-1", { gate });
    assert.equal(updated.currentGate, gate);
    assert.equal(updated.status, status);
    assert.equal(updated.gatePaused, false);
    assert.equal(updated.gatePausedBy, null);
    assert.equal(updated.gate1PaidBy, bob, "control does not forge paidBy");
    assert.equal(updated.skipPaid, false, "control does not forge skipPaid");
  }
  assert.deepEqual(service.state.wallets, beforeWallets);
  assert.deepEqual(service.state.transactions, beforeTransactions);
  assert.ok(service.lockCalls() >= 6, "each direct control uses the QA advisory lock");
  await assert.rejects(service.setGate("test-admin", "same-member", { gate: "gate3" }));
  await assert.rejects(service.setGate("test-admin", "ordinary", { gate: "gate3" }));
  await assert.rejects(service.setGate("test-admin", "qa-pair-1", { gate: "gate3", skipPaid: true }));
  assert.equal(service.state.matches.find(match => match.id === "ordinary")!.currentGate, "gate3");
});

test("gate control schema is strict and permits only the fixed gate targets", () => {
  for (const gate of ["gate1", "gate2", "gate3", "gate4", "gate5", "completed"]) {
    assert.equal(qaGateControlSchema.safeParse({ gate }).success, true);
  }
  for (const input of [
    {},
    { gate: "gate6" },
    { gate: "gate1", userId: alice },
    { gate: 1 },
  ]) {
    assert.equal(qaGateControlSchema.safeParse(input).success, false);
  }
});

test("explicit QA match creation is fixed, idempotent, locked, and payment-free", async () => {
  const service = fixtureDb();
  const beforeWallets = structuredClone(service.state.wallets);
  const beforeTransactions = structuredClone(service.state.transactions);
  const existing = await service.ensure("test-admin");
  assert.equal(existing.created, false);
  assert.equal(existing.match.id, "qa-pair-1", "active pair is selected deterministically");
  assert.equal(existing.match.currentGate, "gate2", "existing gate is never reset");
  assert.deepEqual(service.state.wallets, beforeWallets);
  assert.deepEqual(service.state.transactions, beforeTransactions);

  const createdService = fixtureDb();
  createdService.state.matches.splice(0, 2);
  const created = await createdService.ensure("test-admin");
  assert.equal(created.created, true);
  assert.equal(created.match.initiatorId, alice);
  assert.equal(created.match.recipientId, bob);
  assert.equal(created.match.currentGate, "gate1");
  assert.equal(created.match.status, "pending");
  assert.equal(created.match.lastActionBy, alice);
  assert.match(created.match.message, /QA Alice.*QA Bob/);
  created.match.initiatorId = bob;
  created.match.recipientId = alice;
  created.match.currentGate = "gate3";
  created.match.status = "active";
  const repeated = await createdService.ensure("test-admin");
  assert.equal(repeated.created, false);
  assert.equal(repeated.match.id, created.match.id);
  assert.equal(repeated.match.currentGate, "gate3");
  assert.equal(repeated.match.initiatorId, bob);
  assert.equal(repeated.match.recipientId, alice);
  assert.equal(createdService.state.matches.length, 3);
  assert.ok(createdService.lockCalls() >= 2);
});

test("explicit QA match creation fails closed for a malformed fixture", async () => {
  const service = fixtureDb();
  service.state.wallets.pop();
  await assert.rejects(service.ensure("test-admin"));
  assert.equal(service.state.matches.length, 4, "fixture failure cannot create a match");
});

test("QA gate admin routes use authentication, admin, same-origin and strict target guards", async () => {
  const source = readFileSync("server/routes.ts", "utf8");
  const tree = ts.createSourceFile("server/routes.ts", source, ts.ScriptTarget.Latest, true);
  const routeTexts = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(tree) === "app" &&
      ts.isStringLiteral(node.arguments[0]) &&
      ["/api/admin/qa-members/matches", "/api/admin/qa-members/matches/:id/gate"].includes(node.arguments[0].text)) {
      routeTexts.set(`${node.expression.name.text}:${node.arguments[0].text}`,
        node.arguments.slice(1, -1).map(argument => argument.getText(tree)).join(","));
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(routeTexts.get("get:/api/admin/qa-members/matches"), "isAuthenticated,isAdmin,sameOriginQaRequest");
  assert.equal(routeTexts.get("post:/api/admin/qa-members/matches"), "isAuthenticated,isAdmin,sameOriginQaRequest");
  assert.equal(routeTexts.get("post:/api/admin/qa-members/matches/:id/gate"), "isAuthenticated,isAdmin,sameOriginQaRequest");

  const service = fixtureDb();
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const actor = req.get("x-test-actor");
    req.user = actor ? { claims: { sub: actor } } : undefined;
    req.isAuthenticated = () => Boolean(actor);
    next();
  });
  const authenticate = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };
  const isAdmin = async (req: any, res: any, next: any) => {
    if (req.user?.claims?.sub !== "test-admin") return res.status(403).json({ message: "Admin access required" });
    next();
  };
  const createHandler = extractRouteHandler("post", "/api/admin/qa-members/matches", {
    z,
    ensureQaMemberMatch: service.ensure,
    QaControlError: class QaControlError extends Error {},
  });
  const getHandler = async (_req: any, res: any) => res.json(await service.getMatches());
  const postHandler = async (req: any, res: any) => {
    const validation = qaGateControlSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: "invalid gate" });
    res.json(await service.setGate(req.user.claims.sub, req.params.id, validation.data));
  };
  app.post("/api/admin/qa-members/matches", authenticate, isAdmin, sameOriginQaRequest, createHandler);
  app.get("/api/admin/qa-members/matches", authenticate, isAdmin, sameOriginQaRequest, getHandler);
  app.post("/api/admin/qa-members/matches/:id/gate", authenticate, isAdmin, sameOriginQaRequest, postHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${base}/api/admin/qa-members/matches`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/qa-members/matches`, {
      headers: { "x-test-actor": "ordinary" },
    })).status, 403);
    assert.equal((await fetch(`${base}/api/admin/qa-members/matches`, {
      headers: { "x-test-actor": "test-admin", origin: "https://attacker.example" },
    })).status, 403);
    assert.equal((await fetch(`${base}/api/admin/qa-members/matches`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })).status, 401);
    assert.equal((await fetch(`${base}/api/admin/qa-members/matches`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "ordinary" },
      body: JSON.stringify({}),
    })).status, 403);
    assert.equal((await fetch(`${base}/api/admin/qa-members/matches`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "test-admin", origin: "https://attacker.example" },
      body: JSON.stringify({}),
    })).status, 403);
    const strict = await fetch(`${base}/api/admin/qa-members/matches`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "test-admin" },
      body: JSON.stringify({ recipientId: bob }),
    });
    assert.equal(strict.status, 400);
    const created = await fetch(`${base}/api/admin/qa-members/matches`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "test-admin" },
      body: JSON.stringify({}),
    });
    assert.equal(created.status, 200);
    const createdBody = await created.json();
    assert.equal(createdBody.match.initiatorId, alice);
    assert.equal(createdBody.match.recipientId, bob);
    assert.equal(createdBody.created, false);
    const invalid = await fetch(`${base}/api/admin/qa-members/matches/qa-pair-1/gate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "test-admin" },
      body: JSON.stringify({ gate: "gate3", extra: "nope" }),
    });
    assert.equal(invalid.status, 400);
    const valid = await fetch(`${base}/api/admin/qa-members/matches/qa-pair-1/gate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "test-admin" },
      body: JSON.stringify({ gate: "gate3" }),
    });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).currentGate, "gate3");
    service.state.wallets.pop();
    const malformedFixture = await fetch(`${base}/api/admin/qa-members/matches`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-actor": "test-admin" },
      body: JSON.stringify({}),
    });
    assert.equal(malformedFixture.status, 409);
  } finally {
    server.close();
    await new Promise<void>(resolve => server.once("close", resolve));
  }
});