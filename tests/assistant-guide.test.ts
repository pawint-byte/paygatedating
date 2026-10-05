import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { FAQ_ITEMS, faqStructuredData } from "../shared/faq-content";
import { renderFaqBody } from "../shared/faq-html";

test("shared FAQ and structured data explain both sides and the private pilot boundaries", () => {
  const aiQuestions = FAQ_ITEMS.filter(item => /connect the AI|set up the connection|my AI do|stop the AI connection/.test(item.question));
  assert.equal(aiQuestions.length, 4);
  const text = aiQuestions.map(item => item.answer).join("\n");
  for (const phrase of ["development pilot", "Settings → Assistant access", "Bearer", "private", "human-first", "Renew", "seven", "cannot publish"]) {
    assert.ok(text.includes(phrase), phrase);
  }
  const html = renderFaqBody();
  assert.ok(html.includes('href="/assistant-guide"'));
  const schema = faqStructuredData();
  for (const item of aiQuestions) {
    assert.ok(html.includes(item.question.replace(/&/g, "&amp;")));
    const entry = schema.mainEntity.find(entry => entry.name === item.question);
    assert.equal(entry?.acceptedAnswer.text, item.answer);
  }
});

test("guide is routable and linked from the member console and public site", () => {
  const app = fs.readFileSync("client/src/App.tsx", "utf8");
  const guide = fs.readFileSync("client/src/pages/assistant-guide.tsx", "utf8");
  const consolePage = fs.readFileSync("client/src/pages/assistant-access.tsx", "utf8");
  const footer = fs.readFileSync("client/src/components/landing/footer.tsx", "utf8");
  assert.ok(app.includes('path="/assistant-guide"'));
  assert.ok(consolePage.includes("/assistant-guide"));
  assert.ok(footer.includes("/assistant-guide"));
  assert.ok(guide.includes("window.location.origin"), "use the actual test origin rather than a guessed production API");
  for (const phrase of ["ChatGPT", "Claude", "MCP", "requestId", "Bearer"]) {
    assert.ok(guide.includes(phrase), phrase);
  }
});
