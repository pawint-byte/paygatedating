import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import { test } from "node:test";
import express from "express";
import { registerFaqRoutes, renderFaqDocument } from "../server/faq";
import { FAQ_CANONICAL, FAQ_DESCRIPTION, FAQ_H1, FAQ_ITEMS, FAQ_TITLE } from "../shared/faq-content";
import { escapeHtml } from "../shared/faq-html";
import { GATE_COSTS } from "../shared/schema";

const template = fs.readFileSync("client/index.html", "utf8");

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