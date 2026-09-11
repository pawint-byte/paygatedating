import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const file = "client/src/components/dashboard/qa-gate-messages-control.tsx";
const source = readFileSync(file, "utf8");

test("QA control selectors are locked during operations and refreshes", () => {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length, 0, "QA controls should remain valid TSX");
  assert.match(
    source,
    /const controlsBusy = disabled \|\| matchLoading \|\| messagesLoading \|\| refreshingMatches \|\| refreshingMessages/,
  );

  for (const testId of ["qa-gate-match", "qa-gate-value", "qa-message-match", "qa-message-acting-member"]) {
    const marker = `data-testid="${testId}"`;
    const markerIndex = source.indexOf(marker);
    assert.notEqual(markerIndex, -1, `missing ${testId}`);
    const selectStart = source.lastIndexOf("<select", markerIndex);
    const selectEnd = source.indexOf("</select>", markerIndex);
    assert.ok(selectStart >= 0 && selectEnd > selectStart, `could not isolate ${testId}`);
    assert.match(source.slice(selectStart, selectEnd), /disabled=\{controlsBusy/);
  }
});

test("QA match empty state creates only the fixed pair and refreshes both QA views", () => {
  assert.match(source, /type CreateMatchResult = \{ match: Match; created: boolean \}/);
  assert.match(
    source,
    /qaRequest<CreateMatchResult>\("\/api\/admin\/qa-members\/matches", undefined, "POST", \{\}\)/,
  );
  assert.match(
    source,
    /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/admin\/qa-members\/matches"\] \}\)/,
  );
  assert.match(
    source,
    /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/qa-members"\] \}\)/,
  );
  assert.match(source, /const existingGate = match\.currentGate/);
  assert.match(source, /setSelectedGate\(existingGate\)/);
  assert.match(source, /created \? "created" : "reused"/);
  assert.match(source, /without a wallet charge or Stripe activity/);
  assert.match(source, /Set Gate 3, then send as QA Alice and read as QA Bob/);

  const emptyStart = source.indexOf('data-testid="qa-gate-empty"');
  assert.ok(emptyStart >= 0, "missing QA match empty state");
  const emptyEnd = source.indexOf("</div>", emptyStart);
  assert.ok(emptyEnd > emptyStart, "could not isolate QA match empty state");
  const emptyState = source.slice(source.lastIndexOf("<div", emptyStart), emptyEnd);
  assert.match(emptyState, /Create QA Alice ↔ QA Bob match/);
  assert.match(emptyState, /data-testid="qa-create-match"/);
  assert.doesNotMatch(emptyState, /<input/);
});

test("QA match creation participates in the controls busy state", () => {
  assert.match(
    source,
    /const controlsBusy = disabled \|\| matchLoading \|\| messagesLoading \|\| refreshingMatches \|\| refreshingMessages \|\|\s+createMatchMutation\.isPending/,
  );
  assert.match(source, /const createMatchDisabled = createDisabled \|\| matchLoading/);
});

test("QA message callbacks use captured variables and guarded readback", () => {
  const sendStart = source.indexOf("const sendMutation");
  const readStart = source.indexOf("const readMutation");
  assert.ok(sendStart >= 0 && readStart > sendStart);
  const messageCallbacks = source.slice(sendStart, source.indexOf("const matchLoading", readStart));

  assert.match(messageCallbacks, /onSuccess: async \(_message, variables\)/);
  assert.match(messageCallbacks, /onSuccess: async \(_data, variables\)/);
  assert.match(messageCallbacks, /refetchMessagesFor\(variables\.matchId, variables\.memberId\)/);
  assert.match(messageCallbacks, /qaMemberName\(variables\.memberId\)/);
  assert.match(messageCallbacks, /isCurrentMessageSelection\(variables\)/);
  assert.doesNotMatch(messageCallbacks, /messagesQuery\.refetch/);
  assert.doesNotMatch(messageCallbacks, /qaMemberName\(actingMemberId\)/);

  const selectionEffectStart = source.indexOf("useEffect(() => {\n    setMessageFeedback(null);");
  const selectionEffectEnd = source.indexOf("}, [selectedMatchId, actingMemberId]);", selectionEffectStart);
  assert.ok(selectionEffectStart >= 0 && selectionEffectEnd > selectionEffectStart);
  assert.doesNotMatch(source.slice(selectionEffectStart, selectionEffectEnd), /setDraft/);
  assert.match(
    messageCallbacks,
    /if \(isCurrentMessageSelection\(variables\)\) \{\s+setDraft\(""\);\s+setMessageFeedback/,
  );
});