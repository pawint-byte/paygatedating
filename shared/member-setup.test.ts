import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSetupBio, setupDestination, setupDraftSchema } from "./member-setup";
import { shouldLogApiResponseBody } from "../server/api-log-privacy";

const input = { firstName: "Sam", gate: "serious_romance", wants: "quiet walks", willNot: "rush into things", photo: null };

test("accepts only the five setup inputs and two gates", () => {
  assert.equal(setupDraftSchema.safeParse(input).success, true);
  assert.equal(setupDraftSchema.safeParse({ ...input, gate: "casual_dating" }).success, false);
  assert.equal(setupDraftSchema.safeParse({ ...input, isVisible: true }).success, false);
  assert.equal(setupDraftSchema.safeParse({ ...input, firstName: " " }).success, false);
  assert.equal(setupDraftSchema.safeParse({ ...input, wants: "x".repeat(241) }).success, false);
});

test("bio is two sentences based only on the member's own words", () => {
  assert.equal(makeSetupBio("quiet walks", "rush into things"),
    "What I want: quiet walks. What I will not do: rush into things.");
  const bio = makeSetupBio("Hiking. Coffee! Reading?", "Smoking. Pressure!");
  assert.equal(bio.split(".").filter(s => s.trim()).length, 2);
  for (const word of ["Hiking", "Coffee", "Reading", "Smoking", "Pressure"]) assert.ok(bio.includes(word));
});

test("optional photo must be a bounded image data URL, not a public URL or SVG", () => {
  assert.equal(setupDraftSchema.safeParse({ ...input, photo: undefined }).success, true);
  assert.equal(setupDraftSchema.safeParse({ ...input, photo: "https://example.com/photo.png" }).success, false);
  assert.equal(setupDraftSchema.safeParse({ ...input, photo: "data:image/svg+xml;base64,YQ==" }).success, false);
  assert.equal(setupDraftSchema.safeParse({ ...input, photo: "data:image/png;base64,YQ==" }).success, true);
});

test("gate destinations bypass the homepage and private draft responses are not logged", () => {
  assert.equal(setupDestination("serious_romance"), "/serious-romance");
  assert.equal(setupDestination("activity_partner"), "/activity-partner");
  for (const path of ["/api/setup", "/api/setup/draft", "/api/setup/accept?x=1"]) {
    assert.equal(shouldLogApiResponseBody(path), false);
  }
});
