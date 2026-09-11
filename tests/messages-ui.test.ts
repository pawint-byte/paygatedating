import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("client/src/pages/messages.tsx", "utf8");

test("message sending uses a parent-owned synchronous match lock released after settlement", () => {
  assert.match(source, /const pendingMatchIdRef = useRef<string \| null>\(null\)/);
  assert.match(source, /const \[pendingMatchId, setPendingMatchId\]/);
  assert.match(source, /if \(pendingMatchIdRef\.current !== null\) return false/);
  assert.match(source, /pendingMatchIdRef\.current = matchId/);
  assert.match(source, /onSettled: \(_message, _error, variables\)/);
  assert.match(source, /pendingMatchIdRef\.current = null/);
  assert.match(source, /pendingMatchId=\{pendingMatchId\}/);
});

test("declined matches are excluded from every messages contact list", () => {
  assert.match(source, /const contactMatches = useMemo\(\(\) => matches\.filter\(\(match\) => match\.status !== "declined"\)/);
  assert.match(source, /contactMatches\.filter\(\(match\) => CHAT_GATES\.has\(match\.currentGate\)\)/);
  assert.match(source, /contactMatches\.filter\(\(match\) => !CHAT_GATES\.has\(match\.currentGate\)\)/);
  assert.match(source, /No active conversations/);
});
