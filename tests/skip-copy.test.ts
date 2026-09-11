import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { SKIP_AHEAD_COST } from "../shared/schema";
import { SKIP_LABEL, SKIP_SUBCOPY, SKIP_EXPLANATION, SKIP_SUCCESS, SKIP_FAQ } from "../shared/skip-copy";
import { FAQ_ITEMS, faqStructuredData } from "../shared/faq-content";
import { renderFaqDocument } from "../server/faq";
import { escapeHtml } from "../shared/faq-html";

test("Skip copy explains the unchanged $50 premium, both members, and the shared destination", () => {
  assert.equal(SKIP_AHEAD_COST, 50);
  assert.equal(SKIP_LABEL, "Skip ahead — $50");
  assert.equal(SKIP_SUBCOPY, "Covers both of you so you can plan a date and start voice calls sooner.");
  assert.match(SKIP_EXPLANATION, /hasten-to-meet premium covering both people's costs, not a single chapter fee or only your share/);
  assert.ok(SKIP_EXPLANATION.includes("It is not the same as one person paying Chapter 5 ($20)."));
  assert.match(SKIP_EXPLANATION, /you both reach the same gate—the Connected stage/);
  assert.match(SKIP_SUCCESS, /You both landed at the Connected stage/);
  assert.ok(FAQ_ITEMS.includes(SKIP_FAQ));
  const answer = faqStructuredData().mainEntity.find(item => item.name === SKIP_FAQ.question);
  assert.equal(answer?.acceptedAnswer.text, SKIP_EXPLANATION);
  const html = renderFaqDocument(readFileSync("client/index.html", "utf8"));
  assert.ok(html.includes(`<p>${escapeHtml(SKIP_EXPLANATION)}</p>`), "Answer must be visible in server HTML without JS");
  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  const serverAnswer = jsonLd.mainEntity.find((item: any) => item.name === SKIP_FAQ.question);
  assert.equal(serverAnswer.acceptedAnswer.text, SKIP_EXPLANATION, "FAQPage answer must match visible server content exactly");
  const gate = readFileSync("client/src/components/dashboard/gate-progress.tsx", "utf8");
  assert.ok(gate.includes("title={SKIP_EXPLANATION}"));
  assert.ok(gate.includes("{SKIP_SUBCOPY}"));
  assert.ok(gate.includes("{SKIP_EXPLANATION}"));
  const timeline = readFileSync("client/src/components/landing/gate-timeline.tsx", "utf8");
  assert.ok(!timeline.includes("Skip to Chapter 5"));
  assert.ok(!readFileSync("client/src/components/landing/security-section.tsx", "utf8").includes("Skip-ahead payments held in escrow"));
});

function skipHandler(storage: object) {
  const file = "server/routes.ts";
  const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let expression: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "app.post" &&
      ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "/api/matches/:id/skip") {
      assert.equal(node.arguments[1].getText(tree), "isAuthenticated");
      expression = node.arguments.at(-1)!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression);
  const context = vm.createContext({
    storage, SKIP_AHEAD_COST, console,
    authStorage: { getUser: async () => undefined },
    emailService: {},
    handler: undefined,
  });
  vm.runInContext(ts.transpileModule(`handler = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.handler as any;
}

test("real Skip handler charges either payer $50 once and advances the shared match for both", async () => {
  for (const payer of ["alice", "bob"]) {
    for (const gate of ["gate1", "gate2", "gate3", "gate4", "gate5"]) {
      let match: any = { id: "pair", initiatorId: "alice", recipientId: "bob", currentGate: gate };
      const balances: Record<string, number> = { alice: 100, bob: 100 };
      const ledger: any[] = [];
      const connections: string[][] = [];
      const handler = skipHandler({
        getMatch: async () => match,
        getWallet: async (id: string) => ({ id: `wallet-${id}`, balance: String(balances[id]) }),
        updateWalletBalance: async (id: string, balance: string) => { balances[id] = Number(balance); },
        createTransaction: async (entry: any) => ledger.push(entry),
        updateMatch: async (_id: string, update: object) => (match = { ...match, ...update }),
        createConnectionIfNotExists: async (...args: string[]) => connections.push(args),
        getProfile: async () => undefined,
      });
      const res = { statusCode: 200, body: undefined as any,
        status(code: number) { this.statusCode = code; return this; },
        json(body: any) { this.body = body; return this; },
      };
      const req = { user: { claims: { sub: payer } }, params: { id: "pair" } };
      await handler(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(balances[payer], 50);
      assert.equal(balances[payer === "alice" ? "bob" : "alice"], 100);
      assert.equal(match.currentGate, "completed");
      assert.equal(match.status, "completed");
      assert.equal(match.skipPaid, true);
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0].amount, "-50.00");
      assert.match(ledger[0].description, /Covers both members/);
      assert.deepEqual(connections, [["alice", "bob", "pair"], ["bob", "alice", "pair"]]);
      await handler(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(ledger.length, 1);
    }
  }
});