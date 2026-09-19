import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import { test } from "node:test";
import express from "express";
import { registerFaqRoutes, renderFaqDocument } from "../server/faq";
import { FAQ_CANONICAL, FAQ_DESCRIPTION, FAQ_H1, FAQ_ITEMS, FAQ_TITLE } from "../shared/faq-content";
import { escapeHtml } from "../shared/faq-html";
import { GATE_COSTS, MATCH_INTENT_OPTIONS } from "../shared/schema";
import { INTERNAL_NONLIVE_CAPABILITY_CHECKLIST } from "../shared/product-capability-checklist";

const template = fs.readFileSync("client/index.html", "utf8");

test("gift shipping FAQ is crawlable, role-private, retailer-fulfilled, and service-fee-only", () => {
  const html = renderFaqDocument(template);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  const questions = [
    "Can the person buying my gift see my street address?",
    "How do Amazon gifts ship without sharing my address?",
    "Can other approved retailers deliver gifts privately?",
    "Does the PayGate gift service fee pay for the product or shipping?",
  ];
  const answers = questions.map(question => {
    const item = FAQ_ITEMS.find(item => item.question === question);
    assert.ok(item, question);
    assert.ok(html.includes(escapeHtml(item.answer)));
    assert.equal(schema.mainEntity.find((entry: { name: string }) => entry.name === question).acceptedAnswer.text, item.answer);
    return item.answer;
  });
  assert.match(answers[0], /Ships to recipient via retailer — address stays private/);
  assert.match(answers[1], /'This is a gift'.*does not by itself provide private delivery/);
  assert.match(answers[2], /do not proceed/);
  assert.match(answers[3], /only the gift service fee/);
  assert.match(answers[3], /not the product-funds custodian or shipper/);
  assert.match(answers[3], /recipient ID verification before fee checkout/);
});

test("messaging FAQ explains Chapter 3 access without per-message or subscription billing", () => {
  const item = FAQ_ITEMS.find(item => item.question === "When does messaging unlock, and do I pay per message?");
  assert.ok(item);
  assert.match(item.answer, /Chapter 3 \(Getting Real\).*Gate 3/);
  assert.match(item.answer, /not pay-per-message and does not require a subscription/);
  assert.match(item.answer, /My Matches/);
  const html = renderFaqDocument(template);
  assert.ok(html.includes(escapeHtml(item.answer)));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  assert.equal(schema.mainEntity.find((entry: { name: string }) => entry.name === item.question).acceptedAnswer.text, item.answer);
});

test("FAQ publishes only supported intents and accurately describes hidden and mid-story behavior", () => {
  const intent = FAQ_ITEMS.find(item => item.question === "What intents can I state when I knock?");
  assert.ok(intent);
  for (const option of MATCH_INTENT_OPTIONS) assert.match(intent.answer, new RegExp(`\\b${option.label}\\b`));
  assert.doesNotMatch(intent.answer, /friendship|travel meet|divorce/i);

  const hidden = FAQ_ITEMS.find(item => item.question === "Can I be on the site and stay invisible?");
  assert.ok(hidden);
  assert.match(hidden.answer, /off browse and search results/);
  assert.match(hidden.answer, /public profile link unavailable/);
  assert.doesNotMatch(hidden.answer, /still share|stay shareable/i);

  const stopped = FAQ_ITEMS.find(item => item.question === "What happens if I stop mid-story?");
  assert.ok(stopped);
  assert.match(stopped.answer, /progress stays where it is/);
  assert.match(stopped.answer, /non-withdrawable/);
  assert.match(stopped.answer, /not refunded/);

  assert.ok(!FAQ_ITEMS.some(item => /travel|nearby map/i.test(`${item.question} ${item.answer}`)));
  assert.deepEqual(INTERNAL_NONLIVE_CAPABILITY_CHECKLIST.map(item => item.capability), [
    "Link-only hidden profile",
    "Travel-area scan",
  ]);
});

test("knock UI and match UI share the schema intent options", () => {
  const discover = fs.readFileSync("client/src/pages/discover.tsx", "utf8");
  const referrer = fs.readFileSync("client/src/components/dashboard/referrer-highlight.tsx", "utf8");
  const gate = fs.readFileSync("client/src/components/dashboard/gate-progress.tsx", "utf8");
  for (const source of [discover, referrer, gate]) {
    assert.match(source, /MATCH_INTENT_OPTIONS\.map/);
  }
  assert.match(discover, /select-knock-intent/);
  assert.match(discover, /sendKnockWithIntent/);
  assert.match(referrer, /select-referrer-knock-intent/);
  assert.match(referrer, /sendKnockWithIntent/);
});

test("FAQ HTML has unique SEO, visible answers and matching honest structured data without the SPA entry", () => {
  const html = renderFaqDocument(template);
  assert.ok(html.includes(`<title>${FAQ_TITLE}</title>`));
  assert.ok(html.includes(`<h1>${FAQ_H1}</h1>`));
  assert.ok(html.includes(`name="description" content="${escapeHtml(FAQ_DESCRIPTION)}"`));
  assert.ok(html.includes('name="robots" content="index,follow"'));
  assert.ok(html.includes(`rel="canonical" href="${FAQ_CANONICAL}"`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.ok(!html.includes('src="/src/main.tsx"'));
  assert.ok(!/<script\b[^>]*type=["']module/.test(html));
  assert.ok(!html.includes('canonical" href="https://paygatedating.com/"'));
  const structuredScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(structuredScripts.length, 1);
  const data = JSON.parse(structuredScripts[0][1]);
  assert.equal(data["@type"], "FAQPage");
  assert.equal(data.url, FAQ_CANONICAL);
  assert.equal(data.mainEntity.length, FAQ_ITEMS.length);
  for (const [index, entry] of FAQ_ITEMS.entries()) {
    assert.ok(html.includes(escapeHtml(entry.question)));
    assert.ok(html.includes(escapeHtml(entry.answer)));
    assert.equal(data.mainEntity[index].name, entry.question);
    assert.equal(data.mainEntity[index].acceptedAnswer.text, entry.answer);
  }
  // Existing analytics survives the per-route document transformation unchanged.
  const googleTag = template.match(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+/)?.[0];
  assert.ok(googleTag && html.includes(googleTag));
  assert.notEqual(html, template);
});

test("FAQ chapter amounts match actual standard gate prices and the sitemap lists only the canonical FAQ", () => {
  const chapterAnswer = FAQ_ITEMS.find(item => item.question === "What do the five chapters cost?")!.answer;
  for (const [index, cost] of Object.values(GATE_COSTS).entries()) {
    assert.match(chapterAnswer, new RegExp(`Chapter ${index + 1}, [^:]+: \\$${cost}\\b`));
  }
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  assert.equal((sitemap.match(/<loc>https:\/\/paygatedating\.com\/faq<\/loc>/g) || []).length, 1);
  assert.ok(!/<loc>[^<]*\/(?:FAQ|help|support|questions)<\/loc>/.test(sitemap));
});

test("real FAQ middleware serves public GET/HEAD HTML and redirects all aliases, preserving query parameters", async () => {
  const app = express();
  registerFaqRoutes(app, () => template);
  app.get("/", (_req, res) => res.type("html").send(template));
  // Express's actual default 404: no generic app shell after FAQ middleware.
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/faq`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type")!, /text\/html/);
    const html = await response.text();
    assert.ok(html.includes(`<h1>${FAQ_H1}</h1>`));
    assert.ok(html.includes('"@type":"FAQPage"'));
    const head = await fetch(`${base}/faq`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    for (const alias of ["/FAQ", "/help", "/support", "/questions", "/faq/", "/HELP/"]) {
      const redirect = await fetch(`${base}${alias}?utm_source=test`, { redirect: "manual" });
      assert.equal(redirect.status, 301, alias);
      assert.equal(redirect.headers.get("location"), "/faq?utm_source=test", alias);
    }
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.notEqual((await home.text()).match(/<title>(.*?)<\/title>/)?.[1], FAQ_TITLE);
    const missing = await fetch(`${base}/not-a-real-page-xyz`);
    assert.equal(missing.status, 404);
    assert.ok(!(await missing.text()).includes('<div id="root">'));
    const post = await fetch(`${base}/faq`, { method: "POST" });
    assert.equal(post.status, 404);
  } finally {
    server.close();
    await once(server, "close");
  }
});