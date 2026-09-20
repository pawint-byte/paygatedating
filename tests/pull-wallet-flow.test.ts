import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { GATE_COSTS } from "../shared/schema";

function pullResponseHandler(storage: object) {
  const file = "server/routes.ts";
  const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let expression: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "app.post" &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === "/api/matches/:id/pull-request/:pullId/respond") {
      expression = node.arguments.at(-1)!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression);
  const context = vm.createContext({
    storage,
    authStorage: { getUser: async () => undefined },
    emailService: {},
    walletSpendConfirmationSchema: z.object({
      confirmedGate: z.enum(["gate1", "gate2", "gate3", "gate4", "gate5"]),
      confirmedAmountCents: z.number().int().nonnegative(),
    }),
    console,
    handler: undefined,
  });
  vm.runInContext(ts.transpileModule(`handler = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.handler as any;
}

function state() {
  const match: any = {
    id: "match", initiatorId: "alice", recipientId: "bob",
    currentGate: "gate2", status: "active", gatePaused: false,
  };
  const pull: any = {
    id: "pull", matchId: "match", gateNumber: 2, requestedBy: "alice",
    requestedFrom: "bob", status: "pending",
  };
  let balance = 100;
  const ledger: any[] = [];
  const storage = {
    getMatch: async () => match,
    getPendingPullRequest: async () => pull.status === "pending" ? pull : undefined,
    getProfile: async () => undefined,
    createConnectionIfNotExists: async () => undefined,
    respondToGatePullRequest: async (
      _matchId: string,
      _pullId: string,
      userId: string,
      action: "accept" | "decline",
      confirmedGate?: string,
      confirmedAmountCents?: number,
    ) => {
      // This synchronous compare-and-transition models the locked DB transaction.
      if (pull.status !== "pending") {
        throw Object.assign(new Error("already responded"), { code: "MATCH_OPERATION_CONFLICT" });
      }
      if (userId !== pull.requestedFrom ||
        (userId !== match.initiatorId && userId !== match.recipientId)) {
        throw Object.assign(new Error("not authorized"), { code: "MATCH_NOT_AUTHORIZED" });
      }
      if (action === "decline") {
        pull.status = "declined";
        return { match, gateNumber: 2, requestedBy: "alice", declined: true };
      }
      const cost = GATE_COSTS.gate2;
      if (match.gatePaused || match.status === "declined" ||
        match.currentGate !== "gate2" || confirmedGate !== "gate2" ||
        confirmedAmountCents !== cost * 100) {
        throw Object.assign(new Error("stale pull"), { code: "MATCH_OPERATION_CONFLICT" });
      }
      balance -= cost;
      ledger.push({ amount: (-cost).toFixed(2) });
      match.currentGate = "gate3";
      match.gate2PaidBy = userId;
      pull.status = "accepted";
      return { match, gateNumber: 2, requestedBy: "alice", declined: false };
    },
  };
  return { match, pull, storage, ledger, get balance() { return balance; } };
}

function response() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
}

function request(action: "accept" | "decline", body: object = {}) {
  return {
    user: { claims: { sub: "bob" } },
    params: { id: "match", pullId: "pull" },
    body: { action, ...body },
  };
}

test("pull acceptance requires the confirmed gate and canonical price and rejects invalid state without writes", async () => {
  for (const invalid of [
    {},
    { confirmedGate: "gate2", confirmedAmountCents: 499 },
    { confirmedGate: "gate1", confirmedAmountCents: 500 },
  ]) {
    const current = state();
    const res = response();
    await pullResponseHandler(current.storage)(request("accept", invalid), res);
    assert.ok([400, 409].includes(res.statusCode));
    assert.equal(current.balance, 100);
    assert.equal(current.ledger.length, 0);
    assert.equal(current.pull.status, "pending");
  }

  const paused = state();
  paused.match.gatePaused = true;
  const pausedRes = response();
  await pullResponseHandler(paused.storage)(
    request("accept", { confirmedGate: "gate2", confirmedAmountCents: 500 }),
    pausedRes,
  );
  assert.equal(pausedRes.statusCode, 409);
  assert.equal(paused.ledger.length, 0);
});

test("concurrent/replayed pull acceptance can debit and resolve only once", async () => {
  const current = state();
  const handler = pullResponseHandler(current.storage);
  const req = request("accept", { confirmedGate: "gate2", confirmedAmountCents: 500 });
  const first = response();
  const second = response();
  await Promise.all([handler(req, first), handler(req, second)]);
  assert.equal([first.statusCode, second.statusCode].filter(code => code === 200).length, 1);
  assert.equal(current.balance, 95);
  assert.equal(current.ledger.length, 1);
  assert.equal(current.pull.status, "accepted");
  assert.equal(current.match.currentGate, "gate3");

  const replay = response();
  await handler(req, replay);
  assert.ok([404, 409].includes(replay.statusCode));
  assert.equal(current.balance, 95);
  assert.equal(current.ledger.length, 1);
});

test("decline races accept under the same pending-state transition and never charges itself", async () => {
  const current = state();
  const handler = pullResponseHandler(current.storage);
  const accept = response();
  const decline = response();
  await Promise.all([
    handler(request("accept", { confirmedGate: "gate2", confirmedAmountCents: 500 }), accept),
    handler(request("decline"), decline),
  ]);
  assert.equal([accept.statusCode, decline.statusCode].filter(code => code === 200).length, 1);
  assert.ok(current.ledger.length === 0 || current.ledger.length === 1);
  assert.equal(current.balance, current.ledger.length ? 95 : 100);
  assert.notEqual(current.pull.status, "pending");
});