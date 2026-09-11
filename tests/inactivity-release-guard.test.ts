import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the real scheduler with fake storage, mail, clocks, and timers.
// Importing server/routes would initialize live application dependencies.
function scheduler(paused?: string) {
  const source = readFileSync("server/routes.ts", "utf8");
  const start = source.indexOf("  let lastInactivityCheck = 0;");
  const end = source.indexOf("  return httpServer;", start);
  assert.ok(start > 0 && end > start);
  const javascript = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const env: Record<string, string | undefined> = { INACTIVITY_EMAILS_PAUSED: paused };
  const timers: { callback: () => Promise<void>; delay: number }[] = [];
  const calls = { queries: 0, users: 0, emails: 0 };
  let now = Date.UTC(2026, 8, 11);
  class Clock extends Date {
    static now() { return now; }
  }
  const context = {
    process: { env },
    Date: Clock,
    console: { log() {}, error() {} },
    storage: {
      async getInactiveProfiles(days: number) {
        assert.equal(days, 7);
        calls.queries++;
        return [{ userId: "synthetic-member", displayName: "Test Member", lastActiveAt: new Date(now - 8 * 86400000) }];
      },
    },
    authStorage: {
      async getUser() { calls.users++; return { email: "synthetic@example.invalid" }; },
    },
    emailService: {
      async sendInactivityReminder() { calls.emails++; },
    },
    setInterval: (callback: () => Promise<void>, delay: number) => timers.push({ callback, delay }),
    setTimeout: (callback: () => Promise<void>, delay: number) => timers.push({ callback, delay }),
  };
  vm.runInNewContext(javascript, context, { timeout: 1000 });
  assert.equal(timers.length, 2);
  assert.deepEqual(timers.map(timer => timer.delay), [3600000, 30000]);
  return { env, calls, timers, advance: (duration: number) => { now += duration; } };
}

test("release pause prevents both startup and periodic reminders before any member lookup", async () => {
  const run = scheduler("true");
  await run.timers[1].callback();
  run.advance(2 * 86400000);
  await run.timers[0].callback();
  assert.deepEqual(run.calls, { queries: 0, users: 0, emails: 0 });
});

test("normal-mode inactivity messaging and daily throttling remain unchanged", async () => {
  for (const value of [undefined, "false"]) {
    const run = scheduler(value);
    await run.timers[1].callback();
    await run.timers[0].callback();
    assert.deepEqual(run.calls, { queries: 1, users: 1, emails: 1 });
    run.advance(86400000);
    await run.timers[0].callback();
    assert.deepEqual(run.calls, { queries: 2, users: 2, emails: 2 });
  }
});

test("pausing does not consume the daily check and each callback rechecks the guard", async () => {
  const run = scheduler("true");
  await run.timers[1].callback();
  run.env.INACTIVITY_EMAILS_PAUSED = "false";
  await run.timers[0].callback();
  assert.equal(run.calls.emails, 1);
  run.advance(86400000);
  run.env.INACTIVITY_EMAILS_PAUSED = "true";
  await run.timers[0].callback();
  assert.equal(run.calls.emails, 1);
});