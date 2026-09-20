import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const storageSource = readFileSync("server/storage.ts", "utf8");
const tree = ts.createSourceFile("server/storage.ts", storageSource, ts.ScriptTarget.Latest, true);

function methodSource(name: string): string {
  let found: ts.MethodDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) found = node;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(found, `missing ${name}`);
  return found.getText(tree);
}

test("all match wallet spends commit state, balance, and ledger in one database transaction", () => {
  for (const name of [
    "createMatchWithPayment",
    "advanceMatchWithPayment",
    "skipMatchWithPayment",
    "respondToGatePullRequest",
  ]) {
    const source = methodSource(name);
    assert.match(source, /db\.transaction\s*\(/, `${name} must own a database transaction`);
    assert.match(source, /tx\.insert\(transactions\)/, `${name} must write its ledger row in that transaction`);
    assert.match(source, /tx\.update\(wallets\)/, `${name} must update balance in that transaction`);
  }
});

test("chapter and skip spends lock and conditionally transition the expected match state", () => {
  for (const name of ["advanceMatchWithPayment", "skipMatchWithPayment"]) {
    const source = methodSource(name);
    assert.match(source, /for update/i, `${name} must lock before reading charge state`);
    assert.match(source, /eq\(matches\.currentGate, confirmedGate\)/,
      `${name} must reject concurrent or replayed stale operations`);
    assert.match(source, /confirmedAmountCents\s*!==\s*Math\.round\(cost \* 100\)/,
      `${name} must reject a stale confirmed price`);
    assert.match(source, /MATCH_OPERATION_CONFLICT/,
      `${name} must surface replay/concurrency as a conflict`);
  }
});

test("interest spends serialize on the unordered member pair and claim free-match perks conditionally", () => {
  const source = methodSource("createMatchWithPayment");
  assert.match(source, /\.sort\(\)\.join\(":"\)/, "pair identity must be direction-independent");
  assert.match(source, /pg_advisory_xact_lock/, "same-pair requests must serialize without a migration");
  assert.match(source, /eq\(userRewards\.firstMatchFreeUsed, false\)/,
    "the first-match-free perk cannot be consumed twice concurrently");
});

test("canonical pricing is derived from locked server state, including pull acceptance", () => {
  for (const name of ["createMatchWithPayment", "advanceMatchWithPayment", "respondToGatePullRequest"]) {
    const source = methodSource(name);
    assert.match(source, /\.from\(profiles\)/, `${name} must read the payer profile`);
    assert.match(source, /profiles[\s\S]*for update/i, `${name} must lock pricing eligibility`);
    assert.match(source, /GATE_COSTS/, `${name} must derive price from server constants`);
  }
  const pull = methodSource("respondToGatePullRequest");
  assert.match(pull, /gatePullRequests[\s\S]*for update/i);
  assert.match(pull, /eq\(gatePullRequests\.status, "pending"\)/);
  assert.match(pull, /eq\(matches\.gatePaused, false\)/);
});