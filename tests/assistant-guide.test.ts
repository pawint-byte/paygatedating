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
  const guidePage = fs.readFileSync("client/src/pages/assistant-guide.tsx", "utf8");
  const guide = guidePage + fs.readdirSync("client/src/components/assistant-guide")
    .filter(file => file.endsWith(".tsx"))
    .map(file => fs.readFileSync(`client/src/components/assistant-guide/${file}`, "utf8")).join("\n");
  const consolePage = fs.readFileSync("client/src/pages/assistant-access.tsx", "utf8");
  const footer = fs.readFileSync("client/src/components/landing/footer.tsx", "utf8");
  assert.ok(app.includes('path="/assistant-guide"'));
  assert.ok(consolePage.includes("/assistant-guide"));
  assert.ok(footer.includes("/assistant-guide"));
  assert.ok(guide.includes("window.location.origin"), "use the actual test origin rather than a guessed production API");
  assert.ok(guide.includes("/assistant-openapi.json"));
  assert.ok(guide.includes("/api/agent/openapi.json"));
  assert.ok(guidePage.includes("<AssistantToolSchemaLink"));
  assert.doesNotMatch(guide, /\{\{\s*docsUrl\s*\}\}/);
  for (const phrase of ["ChatGPT", "Claude", "MCP", "requestId", "Bearer"]) {
    assert.ok(guide.includes(phrase), phrase);
  }
});

test("member task submission and scope choices are real UI, not a hosted or auto-executing model", () => {
  const queue = fs.readFileSync("client/src/components/assistant-access/assistant-task-queue.tsx", "utf8");
  const manager = fs.readFileSync("client/src/components/assistant-access/connector-manager.tsx", "utf8");
  assert.ok(queue.includes("/api/assistant/tasks"));
  assert.match(queue, /apiRequest\("POST"/);
  assert.doesNotMatch(queue, /apiRequest\("PATCH"/);
  const page = fs.readFileSync("client/src/pages/assistant-access.tsx", "utf8");
  assert.match(queue, /queryKey: \[\.\.\.taskQueryPrefix, memberId/);
  assert.ok(page.includes('memberId={user?.id ?? ""}'));
  assert.ok(page.includes("key={user?.id}"), "clear the member's task form on account switch");
  assert.match(page, /refetchInterval: 30000/, "discover external drafts while the member waits");
  assert.ok(page.includes("refetchIntervalInBackground: false"), "pause background network polling without disabling its timer");
  assert.ok(queue.includes("queryKey: [...ASSISTANT_ACCESS_QUERY_KEY, memberId]"), "queue refresh also refreshes this member's private drafts");
  for (const scope of ["tasks_read", "tasks_write"]) assert.ok(manager.includes(scope), scope);
});
