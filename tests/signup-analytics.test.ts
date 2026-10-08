import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { trackConfirmedSignUp, type SignUpAnalyticsEnvironment } from "../client/src/lib/signup-analytics";
import { newSignUpReceipt, addSignUpAnalyticsHeader, registerSignUpAnalyticsAck } from "../server/signup-analytics";
import { parseSignUpReceipt, PAYGATE_GA4_ID, SIGNUP_ANALYTICS_HEADER } from "../shared/signup-analytics";

test("configured Google tag and event destination use the same PayGate measurement ID", async () => {
  const html = await readFile(new URL("../client/index.html", import.meta.url), "utf8");
  assert.ok(html.includes(`gtag/js?id=${PAYGATE_GA4_ID}`));
  assert.ok(html.includes(`gtag('config', '${PAYGATE_GA4_ID}')`));
});

function harness(hostname = "preview.replit.dev") {
  const storage = new Map<string, string>();
  const events: unknown[][] = [];
  const acknowledged: string[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  const env: SignUpAnalyticsEnvironment = {
    hostname,
    storage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); },
    },
    gtag: (...args) => { events.push(args); },
    lock: (_name, emit) => {
      const result = queue.then(emit);
      queue = result.catch(() => {});
      return result;
    },
    acknowledge: async receipt => { acknowledged.push(receipt); },
  };
  return { env, events, storage, acknowledged };
}

test("new-account receipt emits once on the correct stream with real method and no PII", async () => {
  const h = harness();
  const marker = JSON.stringify(newSignUpReceipt());
  assert.equal(await trackConfirmedSignUp(marker, h.env), true);
  assert.equal(await trackConfirmedSignUp(marker, h.env), false);
  assert.deepEqual(h.events, [["event", "sign_up", {
    method: "replit", send_to: PAYGATE_GA4_ID, debug_mode: true,
  }]]);
  assert.equal(h.acknowledged.length, 2);
});

test("concurrent tabs/queries and a reload cannot duplicate the same receipt", async () => {
  const h = harness();
  const marker = JSON.stringify(newSignUpReceipt());
  await Promise.all(Array.from({ length: 12 }, () => trackConfirmedSignUp(marker, { ...h.env })));
  await trackConfirmedSignUp(marker, { ...h.env });
  assert.equal(h.events.length, 1);
});

test("returning logins, invalid receipts, and unauthenticated requests emit nothing", async () => {
  const h = harness();
  for (const marker of [null, "", "bad JSON", "{}", JSON.stringify({ receipt: randomUUID(), method: "email" })]) {
    assert.equal(await trackConfirmedSignUp(marker, h.env), false);
  }
  assert.equal(h.events.length, 0);
  assert.equal(h.acknowledged.length, 0);
});

test("production signup does not enable preview DebugView mode", async () => {
  const h = harness("pay-gate-dating--pawint.replit.app");
  await trackConfirmedSignUp(JSON.stringify(newSignUpReceipt()), h.env);
  assert.deepEqual(h.events[0], ["event", "sign_up", { method: "replit", send_to: "G-ZQDRXT3L0B" }]);
});

test("analytics/tag/storage failures do not falsely acknowledge delivery", async () => {
  const marker = JSON.stringify(newSignUpReceipt());
  const h = harness();
  assert.equal(await trackConfirmedSignUp(marker, { ...h.env, gtag: undefined }), false);
  await assert.rejects(trackConfirmedSignUp(marker, {
    ...h.env, gtag: () => { throw new Error("tag failure"); },
  }));
  assert.equal(h.storage.size, 0);
  assert.equal(h.acknowledged.length, 0);
  await assert.rejects(trackConfirmedSignUp(marker, {
    ...h.env, storage: { ...h.env.storage, getItem: () => { throw new Error("storage disabled"); } },
  }));
  assert.equal(h.events.length, 0);
});

test("header is exposed only for a saved account with a new-account session receipt", () => {
  const headers = new Map<string, unknown>();
  const res = { setHeader: (name: string, value: unknown) => { headers.set(name, value); } } as any;
  const receipt = newSignUpReceipt();
  addSignUpAnalyticsHeader(res, { analyticsSignUp: receipt }, false);
  addSignUpAnalyticsHeader(res, {}, true);
  assert.equal(headers.size, 0);
  addSignUpAnalyticsHeader(res, { analyticsSignUp: receipt }, true);
  assert.deepEqual(parseSignUpReceipt(headers.get(SIGNUP_ANALYTICS_HEADER) as string), receipt);
  assert.equal(headers.get("Cache-Control"), "no-store");
});

test("atomic upsert metadata observes inserts only, preserves User shape, and never fires on DB failure", async () => {
  const source = await readFile(new URL("../server/replit_integrations/auth/storage.ts", import.meta.url), "utf8");
  const javascript = ts.transpileModule(source.replace(/^import .*;\n/gm, ""), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let inserted = true;
  let failed = false;
  let completed = false;
  let observed = 0;
  const builder: any = {
    values() { return builder; },
    onConflictDoUpdate() { return builder; },
    async returning(selection: any) {
      assert.ok(selection.__analyticsInserted);
      if (failed) throw new Error("DB insert failed");
      completed = true;
      return [{ id: "test-only", __analyticsInserted: inserted }];
    },
  };
  const context = vm.createContext({
    exports: {}, console, Date,
    db: { insert: () => builder },
    users: { id: "id" },
    getTableColumns: () => ({ id: "id" }),
    sql: (parts: TemplateStringsArray) => {
      assert.equal(parts[0], "xmax = 0");
      return "atomic insert metadata";
    },
  });
  new vm.Script(javascript).runInContext(context);
  const storage = context.exports.authStorage;
  const callback = () => { assert.equal(completed, true); observed++; };
  const user = await storage.upsertUser({ id: "test-only" }, callback);
  assert.equal(JSON.stringify(user), JSON.stringify({ id: "test-only" }));
  assert.equal(observed, 1);
  inserted = false;
  await storage.upsertUser({ id: "test-only" }, callback);
  assert.equal(observed, 1);
  failed = true;
  await assert.rejects(storage.upsertUser({ id: "test-only" }, callback));
  assert.equal(observed, 1);
  failed = false;
  inserted = true;
  await storage.upsertUser({ id: "test-only" }, () => { throw new Error("analytics failed"); });
});

test("analytics acknowledgement retires only the matching receipt; session failure is retryable", () => {
  let handler: any;
  const authenticated = () => {};
  const app = { post(path: string, middleware: unknown, callback: unknown) {
    assert.equal(path, "/api/analytics/sign-up/ack");
    assert.equal(middleware, authenticated);
    handler = callback;
  } } as any;
  registerSignUpAnalyticsAck(app, authenticated);
  let status: number | undefined;
  const res = { sendStatus: (value: number) => { status = value; } };
  const receipt = newSignUpReceipt();
  const req: any = {
    body: { receipt: randomUUID() },
    user: { analyticsSignUp: receipt },
    session: { save: (callback: (error: unknown) => void) => callback(null) },
  };
  handler(req, res);
  assert.equal(status, 400);
  assert.deepEqual(req.user.analyticsSignUp, receipt);
  req.body.receipt = receipt.receipt;
  req.session.save = (callback: (error: unknown) => void) => callback(new Error("session failure"));
  handler(req, res);
  assert.equal(status, 503);
  assert.deepEqual(req.user.analyticsSignUp, receipt);
  req.session.save = (callback: (error: unknown) => void) => callback(null);
  handler(req, res);
  assert.equal(status, 204);
  assert.equal(req.user.analyticsSignUp, undefined);
  handler(req, res);
  assert.equal(status, 204);
});
