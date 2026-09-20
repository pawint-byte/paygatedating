import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { GATE_COSTS, SKIP_AHEAD_COST } from "../shared/schema";
import {
  chapterSpendQuote,
  confirmedSpend,
  isStaleSpendConfirmation,
  knockSpendQuote,
  skipSpendQuote,
  submissionLockAfterOpenTransition,
} from "../client/src/lib/wallet-spend";

const wallet = { balance: "80.00" };

test("chapter confirmations use configured prices, balances, and existing Premium discount", () => {
  for (const gate of Object.keys(GATE_COSTS) as Array<keyof typeof GATE_COSTS>) {
    const standard = chapterSpendQuote(gate, wallet, "free");
    assert.equal(standard.amount, GATE_COSTS[gate]);
    assert.equal(standard.resultingBalance, 80 - GATE_COSTS[gate]);

    const premium = chapterSpendQuote(gate, wallet, "premium");
    assert.equal(premium.amount, GATE_COSTS[gate] * 0.5);
    assert.equal(premium.resultingBalance, 80 - GATE_COSTS[gate] * 0.5);
    assert.equal(premium.discountLabel, "50% Premium discount");
  }
});

test("pull-request Gate 1 preserves the existing Premium initiator free benefit", () => {
  const quote = chapterSpendQuote("gate1", wallet, "premium", true);
  assert.equal(quote.amount, 0);
  assert.equal(quote.resultingBalance, 80);
  assert.equal(quote.discountLabel, "Premium Gate 1 benefit");
});

test("skip and paid-interest confirmations show accurate configured wallet effects", () => {
  const skip = skipSpendQuote(wallet);
  assert.equal(skip.amount, SKIP_AHEAD_COST);
  assert.equal(skip.resultingBalance, 80 - SKIP_AHEAD_COST);

  const paidKnock = knockSpendQuote(wallet, "free", { firstMatchFreeUsed: true });
  assert.equal(paidKnock.amount, GATE_COSTS.gate1);
  assert.equal(paidKnock.resultingBalance, 80 - GATE_COSTS.gate1);

  const freeKnock = knockSpendQuote(wallet, "free", { firstMatchFreeUsed: false });
  assert.equal(freeKnock.amount, 0);
  assert.equal(freeKnock.paymentType, "first_match_free");
  assert.equal(freeKnock.resultingBalance, 80);
});

test("displayed quotes bind to integer-cent confirmation contracts", () => {
  assert.deepEqual(
    confirmedSpend("gate4", chapterSpendQuote("gate4", wallet, "premium")),
    { confirmedGate: "gate4", confirmedAmountCents: 750 },
  );
  assert.deepEqual(
    confirmedSpend("gate2", skipSpendQuote(wallet)),
    { confirmedGate: "gate2", confirmedAmountCents: 5000 },
  );
  assert.equal(isStaleSpendConfirmation(new Error("409: stale confirmation")), true);
  assert.equal(isStaleSpendConfirmation(new Error("400: insufficient balance")), false);
});

test("confirmation lock resets after a 409 closes and a parent reopens the controlled dialog", () => {
  let open = true;
  let submitted = false;

  // First explicit confirmation is accepted and locks duplicate submissions.
  submitted = true;
  assert.equal(submitted, true);

  // Submission closes, then the server rejects the bound quote as stale.
  const previousOpen = open;
  open = false;
  submitted = submissionLockAfterOpenTransition(previousOpen, open, submitted);
  assert.equal(submitted, true);

  // Parent state opens a fresh confirmation without calling the dialog's
  // onOpenChange(true); the actual false -> true prop transition must unlock it.
  const closedOpen = open;
  open = true;
  submitted = submissionLockAfterOpenTransition(closedOpen, open, submitted);
  assert.equal(submitted, false);

  // The second explicit confirmation can submit and lock exactly once.
  const secondConfirmAccepted = !submitted;
  if (secondConfirmAccepted) submitted = true;
  assert.equal(secondConfirmAccepted, true);
  assert.equal(submitted, true);
});

test("every client wallet-spending entry point is behind the shared explicit confirmation", () => {
  const gate = fs.readFileSync("client/src/components/dashboard/gate-progress.tsx", "utf8");
  const matches = fs.readFileSync("client/src/pages/matches.tsx", "utf8");
  const discover = fs.readFileSync("client/src/pages/discover.tsx", "utf8");
  const referrer = fs.readFileSync("client/src/components/dashboard/referrer-highlight.tsx", "utf8");
  const dialog = fs.readFileSync("client/src/components/dashboard/wallet-spend-confirmation.tsx", "utf8");

  assert.match(gate, /confirm-advance-/);
  assert.match(gate, /confirm-skip-/);
  assert.match(gate, /confirm-pull-/);
  assert.match(gate, /confirmedSpend\(currentGateKey, chapterQuote\)/);
  assert.match(gate, /confirmedSpend\(currentGateKey, skipQuote\)/);
  assert.match(gate, /confirmedSpend\(pullGateKey, pullQuote\)/);
  assert.match(gate, /action === "accept" \? confirmation : \{\}/);
  assert.match(matches, /advance`, confirmation\)/);
  assert.match(matches, /skip`, confirmation\)/);
  assert.match(discover, /testId="confirm-knock"/);
  assert.match(discover, /confirmedSpend\("gate1", interestQuote\)/);
  assert.match(referrer, /testId="confirm-referrer-knock"/);
  assert.match(referrer, /confirmedSpend\("gate1", interestQuote\)/);
  assert.match(dialog, /Confirm \$\{formatWalletAmount\(quote\.amount\)\} payment/);
  assert.match(dialog, /Wallet payments are non-refundable/);
  assert.match(dialog, /Current wallet balance/);
  assert.match(dialog, /Resulting balance/);
  assert.match(dialog, /submittedRef/);
  assert.match(dialog, /previousOpenRef/);
  assert.match(dialog, /submissionLockAfterOpenTransition/);
});

test("409 stale confirmations invalidate spend state and never configure automatic retry", () => {
  const sources = [
    fs.readFileSync("client/src/pages/matches.tsx", "utf8"),
    fs.readFileSync("client/src/pages/discover.tsx", "utf8"),
    fs.readFileSync("client/src/components/dashboard/referrer-highlight.tsx", "utf8"),
    fs.readFileSync("client/src/components/dashboard/gate-progress.tsx", "utf8"),
  ];
  for (const source of sources) {
    assert.match(source, /isStaleSpendConfirmation/);
    assert.match(source, /\["\/api\/wallet"\]/);
    assert.match(source, /\["\/api\/matches"\]/);
    assert.match(source, /\["\/api\/rewards"\]/);
    assert.doesNotMatch(source, /retry\s*:/);
  }
});