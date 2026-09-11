import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { test } from "node:test";
import vm from "node:vm";
import express from "express";
import ts from "typescript";
import { QA_MEMBERS } from "../shared/qa";
import { qaTestRewardSchema, QA_TEST_REWARD_SOURCE } from "../shared/qa-test-rewards";
import { sameOriginQaRequest } from "../server/qa-access";

function extract(file: string, find: (node: ts.Node) => string | undefined, bindings: object): any {
  const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let expression: string | undefined;
  const visit = (node: ts.Node) => {
    expression ??= find(node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression, `Missing expression in ${file}`);
  const context = vm.createContext({ ...bindings, console, value: undefined });
  vm.runInContext(ts.transpileModule(`value = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.value;
}

// Run the real service body with an in-memory transactional database boundary.
// No live wallet, Stripe, or application startup is used by these tests.
function fixtureService() {
  let state = {
    users: QA_MEMBERS.map(member => ({ id: member.userId, firstName: "QA", lastName: member.displayName.slice(3), email: null, isAdmin: false })),
    profiles: QA_MEMBERS.map(member => ({ userId: member.userId, displayName: member.displayName })),
    wallets: QA_MEMBERS.map(member => ({ id: `wallet-${member.userId}`, userId: member.userId, balance: "20.00", trialCreditsReceived: true })),
    transactions: [] as any[],
  };
  let failLedger = false;
  const users = { table: "users", id: "id" };
  const profiles = { table: "profiles", userId: "userId" };
  const wallets = { table: "wallets", userId: "userId", id: "id", balance: "balance" };
  const transactions = { table: "transactions" };
  const db = {
    transaction: async (work: (tx: any) => Promise<any>) => {
      const draft = structuredClone(state);
      const tx = {
        execute: async () => {},
        select: () => ({
          from: (table: { table: keyof typeof state }) => ({
            where: ({ column, value }: any) => {
              const rows = (draft[table.table] as any[]).filter(row => row[column] === value);
              return Object.assign(Promise.resolve(rows), { for: () => Promise.resolve(rows) });
            },
          }),
        }),
        update: () => ({
          set: ({ balance }: any) => ({
            where: ({ value }: any) => ({
              returning: async () => {
                const wallet = draft.wallets.find(row => row.id === value)!;
                wallet.balance = (Number(wallet.balance) + balance.values[1]).toFixed(2);
                return [{ balance: wallet.balance }];
              },
            }),
          }),
        }),
        insert: () => ({
          values: async (row: any) => {
            if (failLedger) throw new Error("Ledger failure");
            draft.transactions.push(row);
          },
        }),
      };
      const result = await work(tx);
      state = draft;
      return result;
    },
  };
  const grant = extract("server/qa-members.ts", node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "grantQaTestRewards"
      ? node.getText().replace(/^export /, "") : undefined,
  {
    db, users, profiles, wallets, transactions, QA_MEMBERS, qaTestRewardSchema, QA_TEST_REWARD_SOURCE,
    eq: (column: string, value: string) => ({ column, value }),
    sql: (_strings: unknown, ...values: unknown[]) => ({ values }),
  });
  return { grant, state: () => state, failLedger: () => { failLedger = true; } };
}

test("QA reward presets/targets are strict, repeatable and credited only to selected fixtures", async () => {
  for (const amount of [5, 10, 20]) {
    for (const target of ["alice", "bob", "both"]) {
      const service = fixtureService();
      await service.grant("test-admin", { amount, target });
      const result = await service.grant("test-admin", { amount, target });
      assert.equal(result.source, "qa_test_reward");
      for (const [index, wallet] of service.state().wallets.entries()) {
        const selected = target === "both" || target === (index === 0 ? "alice" : "bob");
        assert.equal(Number(wallet.balance), 20 + (selected ? amount * 2 : 0));
      }
      assert.equal(service.state().transactions.length, target === "both" ? 4 : 2);
      for (const row of service.state().transactions) {
        assert.equal(row.type, "trial_bonus");
        assert.equal(row.amount, amount.toFixed(2));
        assert.match(row.description, /^qa_test_reward:.*actor=test-admin$/);
        assert.equal(row.stripeSessionId, undefined);
      }
    }
  }
  for (const input of [
    {}, { amount: 1, target: "both" }, { amount: -5, target: "alice" },
    { amount: "5", target: "bob" }, { amount: 5, target: "ordinary-member" },
    { amount: 5, target: "alice", userId: "ordinary-member" },
    { amount: 5, target: "alice", source: "deposit" },
  ]) {
    const service = fixtureService();
    await assert.rejects(service.grant("test-admin", input));
    assert.equal(service.state().transactions.length, 0);
  }
});

test("invalid/missing seeded fixtures and ledger failures roll back the entire grant", async () => {
  for (const corrupt of [
    (state: any) => state.users.pop(),
    (state: any) => { state.users[1].isAdmin = true; },
    (state: any) => { state.users[1].email = "not-a-fixture@example.test"; },
    (state: any) => { state.profiles[1].displayName = "Not QA"; },
    (state: any) => state.wallets.pop(),
    (state: any) => { state.wallets[1].trialCreditsReceived = false; },
  ]) {
    const service = fixtureService();
    corrupt(service.state());
    const before = structuredClone(service.state());
    await assert.rejects(service.grant("test-admin", { amount: 20, target: "both" }));
    assert.deepEqual(service.state(), before);
  }
  const service = fixtureService();
  service.failLedger();
  await assert.rejects(service.grant("test-admin", { amount: 5, target: "alice" }));
  assert.equal(service.state().wallets[0].balance, "20.00");
  assert.equal(service.state().transactions.length, 0);
});

test("actual API handler/admin guard reject unauthorized, cross-origin and arbitrary-member requests", async () => {
  const service = fixtureService();
  const handler = extract("server/routes.ts", node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) ||
      node.expression.getText() !== "app.post" || !ts.isStringLiteral(node.arguments[0]) ||
      node.arguments[0].text !== "/api/admin/qa-members/test-rewards") return;
    assert.deepEqual(node.arguments.slice(1, -1).map(arg => arg.getText()),
      ["isAuthenticated", "isAdmin", "sameOriginQaRequest"]);
    return node.arguments.at(-1)!.getText();
  }, { qaTestRewardSchema, grantQaTestRewards: service.grant });
  const adminGuard = extract("server/routes.ts", node =>
    ts.isVariableDeclaration(node) && node.name.getText() === "isAdmin" &&
    node.initializer && ts.isArrowFunction(node.initializer) ? node.initializer.getText() : undefined,
  { storage: { isUserAdmin: async (id: string) => id === "test-admin" } });
  const app = express();
  app.use(express.json());
  app.post("/reward", (req: any, _res, next) => {
    if (req.get("x-test-actor")) req.user = { claims: { sub: req.get("x-test-actor") } };
    next();
  }, adminGuard, sameOriginQaRequest, handler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  try {
    const send = (actor?: string, body: unknown = { amount: 5, target: "both" }, origin?: string) =>
      fetch(`http://127.0.0.1:${address.port}/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(actor ? { "x-test-actor": actor } : {}), ...(origin ? { origin } : {}) },
        body: JSON.stringify(body),
      });
    assert.equal((await send()).status, 401);
    assert.equal((await send("member")).status, 403);
    assert.equal((await send("test-admin", undefined, "https://elsewhere.example")).status, 403);
    assert.equal((await send("test-admin", { amount: 20, target: "both", userId: "member" })).status, 400);
    assert.equal(service.state().transactions.length, 0);
    assert.equal((await send("test-admin")).status, 200);
    assert.equal((await send("test-admin")).status, 200);
    assert.equal(service.state().transactions.length, 4);
    service.failLedger();
    assert.equal((await send("test-admin")).status, 409);
    assert.equal(service.state().transactions.length, 4);
  } finally {
    server.close();
    await once(server, "close");
  }
});