import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import vm from "node:vm";
import express from "express";
import ts from "typescript";
import { z } from "zod";

async function contactRouteHandler(emailService: {
  sendContactForm: (...args: string[]) => Promise<{ success: boolean; error?: string }>;
}) {
  const fileName = new URL("../server/routes.ts", import.meta.url).pathname;
  const source = await readFile(fileName, "utf8");
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const found: ts.Expression[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(tree) === "app"
      && node.expression.name.text === "post"
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === "/api/contact"
    ) {
      found.push(node.arguments[node.arguments.length - 1]);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);

  assert.equal(found.length, 1);
  const javascript = ts.transpileModule(`handler = (${found[0].getText(tree)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName,
  }).outputText;
  const context = vm.createContext({ console, emailService, handler: undefined, z });
  new vm.Script(javascript, { filename: `${fileName}:/api/contact` }).runInContext(context);
  assert.equal(typeof context.handler, "function");
  return context.handler as express.RequestHandler;
}

async function listen(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post("/api/contact", handler);
  const server: Server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return { server, base: `http://127.0.0.1:${address.port}` };
}

test("anonymous contact submission delivers all four fields to the support inbox", async () => {
  const calls: string[][] = [];
  const handler = await contactRouteHandler({
    sendContactForm: async (...args) => {
      calls.push(args);
      return { success: true };
    },
  });
  const { server, base } = await listen(handler);

  try {
    const response = await fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "  Site Visitor  ",
        email: "visitor@example.com",
        page: "  /discover  ",
        message: "  The filter button does not respond.  ",
      }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true });
    assert.deepEqual(calls, [[
      "pawint@pawint-app.com",
      "Site Visitor",
      "visitor@example.com",
      "/discover",
      "The filter button does not respond.",
    ]]);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("contact route rejects incomplete input without attempting delivery", async () => {
  let deliveries = 0;
  const handler = await contactRouteHandler({
    sendContactForm: async () => {
      deliveries += 1;
      return { success: true };
    },
  });
  const { server, base } = await listen(handler);

  try {
    const response = await fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Site Visitor",
        email: "visitor@example.com",
        message: "Missing the page field",
      }),
    });
    assert.equal(response.status, 400);
    assert.equal(deliveries, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("contact route does not claim success when mocked delivery fails", async () => {
  const handler = await contactRouteHandler({
    sendContactForm: async () => ({ success: false, error: "connector unavailable" }),
  });
  const { server, base } = await listen(handler);

  try {
    const response = await fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Site Visitor",
        email: "visitor@example.com",
        page: "/contact",
        message: "A test report that must not be sent externally.",
      }),
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /could not deliver/i);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("contact page exposes the required fields and a persistent success state", async () => {
  const source = await readFile(
    new URL("../client/src/pages/contact.tsx", import.meta.url),
    "utf8",
  );
  for (const testId of [
    "input-contact-name",
    "input-contact-email",
    "input-contact-page",
    "input-contact-message",
    "contact-success",
  ]) {
    assert.match(source, new RegExp(`data-testid="${testId}"`));
  }
  assert.doesNotMatch(source, /input-contact-subject/);
});