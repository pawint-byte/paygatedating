import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { shouldLogApiResponseBody } from "../server/api-log-privacy";

test("gift response bodies are excluded for every gift route and role", () => {
  for (const path of [
    "/api/gifts", "/api/gifts/sent", "/api/gifts/received",
    "/api/gifts/checkout/success", "/api/gifts/sample/details",
    "/api/gifts/sample/provide-address", "/api/gifts/sample/confirm-purchase",
    "/api/gifts/sample/confirm-delivery", "/api/gifts/sample/revoke",
    "/api/GIFTS/sample/details", "/api/gifts/sent?status=delivered",
  ]) assert.equal(shouldLogApiResponseBody(path), false, path);
  assert.equal(shouldLogApiResponseBody("/api/unrelated"), true);
});

test("actual API logger keeps status/timing but never records recipient or nested gift addresses", () => {
  const source = readFileSync("server/index.ts", "utf8");
  const ast = ts.createSourceFile("index.ts", source, ts.ScriptTarget.Latest, true);
  const middleware = ast.statements.find(statement =>
    ts.isExpressionStatement(statement) &&
    statement.getText(ast).startsWith("app.use(") &&
    statement.getText(ast).includes("capturedJsonResponse"));
  assert.ok(middleware);
  const output = ts.transpileModule(middleware.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let logger: any;
  const logs: string[] = [];
  vm.runInNewContext(output, {
    app: { use: (handler: unknown) => { logger = handler; } },
    log: (value: string) => logs.push(value),
    shouldLogApiResponseBody,
  });
  for (const path of ["/api/gifts/sent", "/api/gifts/received", "/api/gifts/gift/provide-address"]) {
    let finish = () => {};
    const res = {
      statusCode: 200,
      json: (body: unknown) => body,
      on: (_name: string, callback: () => void) => { finish = callback; },
    };
    const body = { purchase: { deliveryAddress: "123 SYNTHETIC PRIVATE STREET", deliveryName: "PRIVATE NAME" } };
    logger({ path, method: "POST" }, res, () => {});
    assert.equal(res.json(body), body, "logging must not alter the recipient response");
    finish();
  }
  assert.equal(logs.length, 3);
  assert.ok(logs.every(line => /200 in \d+ms$/.test(line)));
  assert.ok(logs.every(line => !line.includes("PRIVATE") && !line.includes("deliveryAddress")));
});

test("global gift errors redact malformed bodies, response messages, and forwarded errors", () => {
  const source = readFileSync("server/index.ts", "utf8");
  const ast = ts.createSourceFile("index.ts", source, ts.ScriptTarget.Latest, true);
  let middleware: ts.ExpressionStatement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isExpressionStatement(node) && node.getText(ast).startsWith("app.use((err:")) middleware = node;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(middleware);
  const output = ts.transpileModule(middleware.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let handler: any;
  const logs: unknown[][] = [];
  vm.runInNewContext(output, {
    app: { use: (callback: unknown) => { handler = callback; } },
    console: { error: (...args: unknown[]) => logs.push(args) },
    shouldLogApiResponseBody,
  });
  const sentinel = "123 SYNTHETIC PRIVATE STREET";
  const error = Object.assign(new Error(`Bad JSON containing ${sentinel}`), { status: 400, body: sentinel });
  let body: any;
  let status: number | undefined;
  const res = {
    headersSent: false,
    status: (value: number) => { status = value; return res; },
    json: (value: unknown) => { body = value; },
  };
  handler(error, { path: "/api/gifts/gift/provide-address" }, res, () => assert.fail("should respond"));
  assert.equal(status, 400);
  assert.equal(body.message, "Invalid gift request");
  assert.ok(!JSON.stringify(logs).includes(sentinel));
  res.headersSent = true;
  let forwarded: any;
  handler(error, { path: "/api/gifts/gift/provide-address" }, res, (nextError: unknown) => { forwarded = nextError; });
  assert.equal(forwarded.message, "Invalid gift request");
  assert.equal(forwarded.body, undefined);
  assert.ok(!String(forwarded.stack).includes(sentinel));
});