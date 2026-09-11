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