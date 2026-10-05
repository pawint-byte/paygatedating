import { test } from "node:test";
import assert from "node:assert/strict";
import { agentKeyStatus, nextAgentReview, profileAgentChanges, wishlistAgentInput, agentKeyInput } from "../shared/agent-policy";
import { shouldLogApiResponseBody } from "../server/api-log-privacy";
import { agentOpenApi } from "../server/agent-openapi";

test("access review grants 30 days, seven grace days, then pauses new acts", () => {
  const created = new Date("2026-01-01T00:00:00Z");
  const due = nextAgentReview(created);
  assert.equal(due.toISOString(), "2026-01-31T00:00:00.000Z");
  const key = { revokedAt: null, reviewDueAt: due };
  assert.equal(agentKeyStatus(key, new Date("2026-01-30T23:59:59Z")), "active");
  assert.equal(agentKeyStatus(key, due), "review_due");
  assert.equal(agentKeyStatus(key, new Date("2026-02-06T23:59:59Z")), "review_due");
  assert.equal(agentKeyStatus(key, new Date("2026-02-07T00:00:00Z")), "paused");
  assert.equal(agentKeyStatus({ ...key, revokedAt: created }, created), "revoked");
});

test("no profile impersonation, visibility, gate progression, shipping, age or empty drafts", () => {
  assert.ok(profileAgentChanges.safeParse({ bio: "I enjoy hiking." }).success);
  for (const forbidden of ["userId", "isVisible", "setupGate", "age", "shippingAddress", "subscriptionTier"]) {
    assert.equal(profileAgentChanges.safeParse({ [forbidden]: "changed" }).success, false, forbidden);
  }
  assert.equal(profileAgentChanges.safeParse({}).success, false);
  assert.equal(agentKeyInput.safeParse({ name: "My helper", scopes: ["read", "send_messages"] }).success, false);
});

test("wishlist drafts use exact item IDs, bounded prices and ordinary links", () => {
  assert.ok(wishlistAgentInput.safeParse({ operation: "add", changes: { title: "Boots", affiliateUrl: "https://amazon.com/dp/B000000000", price: "50.00" } }).success);
  assert.equal(wishlistAgentInput.safeParse({ operation: "update", changes: { title: "Boots" } }).success, false);
  for (const affiliateUrl of ["javascript:alert(1)", "file:///etc/passwd", "https://user:password@example.com"]) {
    assert.equal(wishlistAgentInput.safeParse({ operation: "add", changes: { title: "Boots", affiliateUrl, price: "50.00" } }).success, false);
  }
});

test("tokens and drafts cannot appear in response-body logs, OpenAPI exposes no member controls", () => {
  for (const path of ["/api/agent/keys", "/api/agent/profile-drafts", "/api/assistant/access", "/api/assistant/drafts/id/accept"]) {
    assert.equal(shouldLogApiResponseBody(path), false);
  }
  const spec = agentOpenApi("https://example.com");
  assert.ok(spec.paths["/api/agent/context"]);
  assert.equal(Object.keys(spec.paths).some(path => /keys|accept|send|payment|login/.test(path)), false);
  assert.deepEqual(spec.paths["/api/agent/health"].get.security, []);
  assert.ok(spec.paths["/api/agent/profile-drafts"].post.requestBody.content["application/json"].schema.required.includes("requestId"));
  assert.equal("parameters" in spec.paths["/api/agent/profile-drafts"].post, false);
});
