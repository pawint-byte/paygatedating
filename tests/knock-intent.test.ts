import assert from "node:assert/strict";
import { test } from "node:test";
import { sendKnockWithIntent } from "../client/src/lib/knock-intent";
import { MATCH_INTENT_OPTIONS } from "../shared/schema";

test("pre-knock intent is included in the single interest-creation request", async () => {
  const calls: Array<{ method: string; url: string; data: unknown }> = [];
  const request = async (method: string, url: string, data?: unknown) => {
    calls.push({ method, url, data });
    return { json: async () => ({ id: "match-1", chargedAmount: 5, paymentType: "wallet" }) };
  };

  const result = await sendKnockWithIntent<{ id: string }>(
    request,
    "recipient-1",
    MATCH_INTENT_OPTIONS[2].value,
  );

  assert.equal(result.id, "match-1");
  assert.deepEqual(calls, [{
    method: "POST",
    url: "/api/matches",
    data: { recipientId: "recipient-1", initiatorIntent: "activity_partner" },
  }]);
});

test("a failed atomic knock does not attempt a follow-up intent write", async () => {
  let calls = 0;
  const request = async () => {
    calls += 1;
    throw new Error("interest creation failed");
  };

  await assert.rejects(
    sendKnockWithIntent(request, "recipient-1", "serious_romance"),
    /interest creation failed/,
  );
  assert.equal(calls, 1);
});