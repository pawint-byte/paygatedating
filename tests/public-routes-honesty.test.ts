import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("client/src/App.tsx", "utf8");
const paths = readFileSync("shared/app-paths.ts", "utf8");
const footer = readFileSync("client/src/components/landing/footer.tsx", "utf8");
const stories = readFileSync("client/src/components/landing/testimonials.tsx", "utf8");
const hero = readFileSync("client/src/components/landing/seasonal-hero.tsx", "utf8");
const safety = readFileSync("client/src/pages/safety.tsx", "utf8");
const terms = readFileSync("client/src/pages/terms.tsx", "utf8");
const landingFaq = readFileSync("client/src/components/landing/faq-section.tsx", "utf8");
const features = readFileSync("client/src/components/landing/features-section.tsx", "utf8");
const howItWorks = [
  readFileSync("client/src/components/landing/screening-section.tsx", "utf8"),
  readFileSync("client/src/components/landing/gate-timeline.tsx", "utf8"),
  readFileSync("client/src/components/landing/personas-section.tsx", "utf8"),
  readFileSync("client/src/components/landing/front-door-section.tsx", "utf8"),
].join("\n");

for (const route of ["/how-it-works", "/features", "/stories", "/safety", "/guidelines"]) {
  test(`${route} is a client route and an allowed SPA path`, () => {
    assert.match(app, new RegExp(`path=["']${route}["']`));
    assert.ok(paths.includes(`"${route}"`));
  });
}

test("footer safety and guidelines links are real routes and socials remain", () => {
  assert.match(footer, /href="\/safety"/);
  assert.match(footer, /href="\/guidelines"/);
  assert.doesNotMatch(footer, /href="#"[^>]*>\s*(Safety Tips|Community Guidelines)/);
  assert.match(footer, /https:\/\/www\.youtube\.com\/@PayGateDating/);
  assert.match(footer, /https:\/\/www\.tiktok\.com\/@paygatedating/);
});

test("public stories and hero avoid invented proof claims", () => {
  assert.doesNotMatch(stories, /Marcus T\.|Alicia R\.|87%|3\.2x|Real Stories from Real People/);
  assert.match(stories, /do not publish invented member testimonials/i);
  assert.doesNotMatch(hero, /Serious Seekers Only|3D Gift Experience/);
  assert.match(hero, /Start Free Profile/);
});

test("safety page states age, address, and verification limits", () => {
  assert.match(safety, /18 and older/);
  assert.match(safety, /not a background-check service/);
  assert.match(safety, /Do not put your street address/);
  assert.match(safety, /Stripe verifies payment processing/);
});

test("legal chapter prices and wallet limits remain explicit", () => {
  for (const price of ["$5 - First move", "$5 - First response", "$10 - Deeper", "$15 - Video", "$20 - Exchange"]) {
    assert.ok(terms.includes(price), price);
  }
  assert.match(terms, /\$50 skip-ahead/);
  assert.match(terms, /cannot be withdrawn, transferred, refunded, or\s+converted to cash/);
});

test("landing FAQ renders the shared supported FAQ source", () => {
  assert.match(landingFaq, /import \{ FAQ_ITEMS \} from "@shared\/faq-content"/);
  assert.match(landingFaq, /FAQ_ITEMS\.map/);
  assert.doesNotMatch(landingFaq, /Nearby Map|AI-powered ID verification|cryptocurrency payments/);
});

test("public hero, features, and how-it-works do not advertise nearby or travel discovery", () => {
  assert.doesNotMatch(hero, /promo-travel|Dating That Travels|nearby/i);
  assert.doesNotMatch(features, /Nearby Discovery|live map|matches are nearby/i);
  assert.doesNotMatch(howItWorks, /nearby|travel|on a trip/i);
});