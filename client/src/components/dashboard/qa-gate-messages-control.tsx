import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, Send } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Match, Message } from "@shared/schema";
import { QA_MEMBER_HEADER, QA_MEMBERS } from "@shared/qa";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";

type GateValue = "gate1" | "gate2" | "gate3" | "gate4" | "gate5" | "completed";
type QaMemberId = typeof QA_MEMBERS[number]["userId"];
type Feedback = { kind: "pending" | "success" | "error"; text: string };

const GATES: Array<{ value: GateValue; label: string }> = [
  { value: "gate1", label: "Gate 1" },
  { value: "gate2", label: "Gate 2" },
  { value: "gate3", label: "Gate 3" },
  { value: "gate4", label: "Gate 4" },
  { value: "gate5", label: "Gate 5" },
  { value: "completed", label: "Connected" },
];
const CHAT_GATES = new Set<GateValue>(["gate3", "gate4", "gate5", "completed"]);
const MESSAGE_LIMIT = 2000;
const aliceId = QA_MEMBERS[0].userId;
const bobId = QA_MEMBERS[1].userId;
const messagesQueryKey = (matchId: string, memberId: QaMemberId) =>
  ["/api/qa-members/messages", matchId, memberId] as const;

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function qaMemberName(userId: string) {
  return QA_MEMBERS.find((member) => member.userId === userId)?.displayName || "Unknown QA member";
}

function gateLabel(gate: string) {
  return GATES.find((item) => item.value === gate)?.label || gate;
}

function isFixturePair(match: Match) {
  return [aliceId, bobId].includes(match.initiatorId as QaMemberId) &&
    [aliceId, bobId].includes(match.recipientId as QaMemberId) &&
    match.initiatorId !== match.recipientId;
}

function isGate(value: string): value is GateValue {
  return GATES.some((gate) => gate.value === value);
}

function messageTime(value: Message["createdAt"]) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function messageIsoTime(value: Message["createdAt"]) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isQaMemberId(value: string): value is QaMemberId {
  return QA_MEMBERS.some((member) => member.userId === value);
}

async function qaRequest<T>(url: string, memberId?: QaMemberId, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      ...(memberId ? { [QA_MEMBER_HEADER]: memberId } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed.message || message;
    } catch {
      // Keep a useful text response when the server did not return JSON.
    }
    throw new Error(`${response.status}: ${message}`);
  }

  return await response.json() as T;
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p
      className={`flex items-start gap-2 text-sm ${feedback.kind === "error" ? "text-destructive" : feedback.kind === "pending" ? "text-muted-foreground" : "text-green-700 dark:text-green-400"}`}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.kind === "error"
        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        : feedback.kind === "pending"
          ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{feedback.text}</span>
    </p>
  );
}

export function QaGateMessagesControl({ disabled = false }: { disabled?: boolean }) {
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedGate, setSelectedGate] = useState<GateValue>("gate1");
  const [actingMemberId, setActingMemberId] = useState<QaMemberId>(aliceId);
  const [gateFeedback, setGateFeedback] = useState<Feedback | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Feedback | null>(null);
  const [draft, setDraft] = useState("");
  const [refreshingMatches, setRefreshingMatches] = useState(false);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const selectedMatchIdRef = useRef(selectedMatchId);
  const actingMemberIdRef = useRef(actingMemberId);
  selectedMatchIdRef.current = selectedMatchId;
  actingMemberIdRef.current = actingMemberId;

  const matchesQuery = useQuery<Match[]>({
    queryKey: ["/api/admin/qa-members/matches"],
    queryFn: () => qaRequest<Match[]>("/api/admin/qa-members/matches"),
  });
  const matches = useMemo(
    () => (Array.isArray(matchesQuery.data) ? matchesQuery.data : []).filter(isFixturePair),
    [matchesQuery.data],
  );
  const selectedMatch = matches.find((match) => match.id === selectedMatchId);
  const chatAvailable = !!selectedMatch &&
    selectedMatch.status !== "declined" &&
    CHAT_GATES.has(selectedMatch.currentGate as GateValue);
  const messagesQuery = useQuery<Message[]>({
    queryKey: messagesQueryKey(selectedMatchId, actingMemberId),
    queryFn: () => qaRequest<Message[]>(`/api/matches/${encodeURIComponent(selectedMatchId)}/messages`, actingMemberId),
    enabled: chatAvailable,
  });

  useEffect(() => {
    if (!selectedMatchId || !matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0]?.id || "");
    }
  }, [matches, selectedMatchId]);

  useEffect(() => {
    if (selectedMatch && isGate(selectedMatch.currentGate)) {
      setSelectedGate(selectedMatch.currentGate);
    }
  }, [selectedMatch?.id, selectedMatch?.currentGate]);

  useEffect(() => {
    setMessageFeedback(null);
  }, [selectedMatchId, actingMemberId]);

  const refetchMessagesFor = async (matchId: string, memberId: QaMemberId) => {
    await queryClient.refetchQueries({
      queryKey: messagesQueryKey(matchId, memberId),
      exact: true,
    }, { throwOnError: true });
  };

  const refreshMatches = async () => {
    if (refreshingMatches) return;
    const expectedMatchId = selectedMatchIdRef.current;
    const expectedMemberId = actingMemberIdRef.current;
    setGateFeedback(null);
    setRefreshingMatches(true);
    try {
      await matchesQuery.refetch({ throwOnError: true });
      if (expectedMatchId && chatAvailable &&
        selectedMatchIdRef.current === expectedMatchId &&
        actingMemberIdRef.current === expectedMemberId) {
        setRefreshingMessages(true);
        try {
          await refetchMessagesFor(expectedMatchId, expectedMemberId);
        } finally {
          setRefreshingMessages(false);
        }
      }
    } catch (error) {
      setGateFeedback({ kind: "error", text: `Refresh failed: ${errorText(error, "Could not refresh QA matches.")}` });
    } finally {
      setRefreshingMatches(false);
    }
  };

  const refreshMessages = async () => {
    const expectedMatchId = selectedMatchIdRef.current;
    const expectedMemberId = actingMemberIdRef.current;
    if (!expectedMatchId || refreshingMessages) return;
    setMessageFeedback(null);
    setRefreshingMessages(true);
    try {
      await refetchMessagesFor(expectedMatchId, expectedMemberId);
      if (selectedMatchIdRef.current === expectedMatchId && actingMemberIdRef.current === expectedMemberId) {
        setMessageFeedback({ kind: "success", text: `Thread refreshed as ${qaMemberName(expectedMemberId)}.` });
      }
    } catch (error) {
      if (selectedMatchIdRef.current === expectedMatchId && actingMemberIdRef.current === expectedMemberId) {
        setMessageFeedback({ kind: "error", text: `Thread refresh failed: ${errorText(error, "Could not refresh the thread.")}` });
      }
    } finally {
      setRefreshingMessages(false);
    }
  };

  const isCurrentMessageSelection = (variables: { matchId: string; memberId: QaMemberId }) =>
    selectedMatchIdRef.current === variables.matchId && actingMemberIdRef.current === variables.memberId;

  const gateMutation = useMutation<Match, Error, { matchId: string; gate: GateValue }>({
    mutationFn: ({ matchId, gate }) => qaRequest<Match>(
      `/api/admin/qa-members/matches/${encodeURIComponent(matchId)}/gate`,
      undefined,
      "POST",
      { gate },
    ),
    onMutate: ({ matchId }) => {
      if (selectedMatchIdRef.current === matchId) {
        setGateFeedback({ kind: "pending", text: "Setting QA gate…" });
      }
    },
    onSuccess: async (match, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa-members"] });
      try {
        await matchesQuery.refetch({ throwOnError: true });
      } catch (error) {
        if (selectedMatchIdRef.current === variables.matchId) {
          setGateFeedback({ kind: "error", text: `Gate set, but refresh failed: ${errorText(error, "Could not refresh the QA match.")}` });
        }
        return;
      }
      if (selectedMatchIdRef.current === variables.matchId) {
        setGateFeedback({
          kind: "success",
          text: `${qaMemberName(match.initiatorId)} / ${qaMemberName(match.recipientId)} is now at ${gateLabel(match.currentGate)}. Direct QA override completed without a wallet charge or Stripe activity.`,
        });
      }
    },
    onError: (error, variables) => {
      if (selectedMatchIdRef.current === variables.matchId) {
        setGateFeedback({ kind: "error", text: `Could not set QA gate: ${errorText(error, "Request failed.")}` });
      }
    },
  });

  const sendMutation = useMutation<Message, Error, { matchId: string; memberId: QaMemberId; content: string }>({
    mutationFn: ({ matchId, memberId, content }) => qaRequest<Message>(
      `/api/matches/${encodeURIComponent(matchId)}/messages`,
      memberId,
      "POST",
      { content },
    ),
    onMutate: ({ matchId, memberId }) => {
      if (isCurrentMessageSelection({ matchId, memberId })) {
        setMessageFeedback({ kind: "pending", text: `Sending API-level QA message as ${qaMemberName(memberId)}…` });
      }
    },
    onSuccess: async (_message, variables) => {
      try {
        setRefreshingMessages(true);
        try {
          await refetchMessagesFor(variables.matchId, variables.memberId);
        } finally {
          setRefreshingMessages(false);
        }
      } catch (error) {
        if (isCurrentMessageSelection(variables)) {
          setMessageFeedback({ kind: "error", text: `Message sent, but readback failed: ${errorText(error, "Could not refresh the thread.")}` });
        }
        return;
      }
      if (isCurrentMessageSelection(variables)) {
        setDraft("");
        setMessageFeedback({ kind: "success", text: `Message sent and read back as ${qaMemberName(variables.memberId)}.` });
      }
    },
    onError: (error, variables) => {
      if (isCurrentMessageSelection(variables)) {
        setMessageFeedback({ kind: "error", text: `Could not send message as ${qaMemberName(variables.memberId)}: ${errorText(error, "Request failed.")}` });
      }
    },
  });

  const readMutation = useMutation<{ success: boolean }, Error, { matchId: string; memberId: QaMemberId }>({
    mutationFn: ({ matchId, memberId }) => qaRequest<{ success: boolean }>(
      `/api/matches/${encodeURIComponent(matchId)}/messages/read`,
      memberId,
      "POST",
    ),
    onMutate: ({ matchId, memberId }) => {
      if (isCurrentMessageSelection({ matchId, memberId })) {
        setMessageFeedback({ kind: "pending", text: `Marking messages read as ${qaMemberName(memberId)}…` });
      }
    },
    onSuccess: async (_data, variables) => {
      try {
        setRefreshingMessages(true);
        try {
          await refetchMessagesFor(variables.matchId, variables.memberId);
        } finally {
          setRefreshingMessages(false);
        }
      } catch (error) {
        if (isCurrentMessageSelection(variables)) {
          setMessageFeedback({ kind: "error", text: `Read action completed, but refresh failed: ${errorText(error, "Could not refresh the thread.")}` });
        }
        return;
      }
      if (isCurrentMessageSelection(variables)) {
        setMessageFeedback({ kind: "success", text: `Read action completed and thread refreshed as ${qaMemberName(variables.memberId)}.` });
      }
    },
    onError: (error, variables) => {
      if (isCurrentMessageSelection(variables)) {
        setMessageFeedback({ kind: "error", text: `Could not mark messages read as ${qaMemberName(variables.memberId)}: ${errorText(error, "Request failed.")}` });
      }
    },
  });

  const matchLoading = matchesQuery.isLoading || matchesQuery.isFetching;
  const messagesLoading = messagesQuery.isLoading || messagesQuery.isFetching;
  const controlsBusy = disabled || matchLoading || messagesLoading || refreshingMatches || refreshingMessages ||
    gateMutation.isPending || sendMutation.isPending || readMutation.isPending;
  const sendDisabled = controlsBusy || !chatAvailable || messagesQuery.isLoading || messagesQuery.isError || !draft.trim();
  const readDisabled = controlsBusy || !chatAvailable || messagesQuery.isError;

  return (
    <Card data-testid="qa-gate-messages-control">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Track A QA gate and Messages controls</CardTitle>
        <CardDescription>
          QA/testing-only controls for the returned QA Alice / QA Bob fixture pairs. The direct gate override never charges wallets or calls Stripe; it runs under this authenticated Admin session and never logs in a fixture.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-3" aria-labelledby="qa-gate-control-heading">
          <div>
            <h3 id="qa-gate-control-heading" className="font-medium">Direct QA gate override</h3>
            <p className="text-xs text-muted-foreground">Select a match returned by the Admin QA endpoint. No arbitrary real-user selection is available.</p>
          </div>
          {matchesQuery.isError ? (
            <Alert variant="destructive" data-testid="qa-gate-matches-error">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Could not load QA matches</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{errorText(matchesQuery.error, "The QA match list could not be loaded.")}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void refreshMatches()} disabled={matchLoading} data-testid="qa-refresh-matches-error">
                  <RefreshCw className={`mr-2 h-4 w-4 ${matchLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                  Refresh
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-[14rem] flex-1 gap-1 text-sm">
                QA match
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={selectedMatchId}
                  disabled={controlsBusy || matches.length === 0}
                  onChange={(event) => setSelectedMatchId(event.target.value)}
                  data-testid="qa-gate-match"
                >
                  {!matches.length && <option value="">{matchLoading ? "Loading QA matches…" : "No returned QA fixture pairs"}</option>}
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {qaMemberName(match.initiatorId)} / {qaMemberName(match.recipientId)} · {gateLabel(match.currentGate)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-[8rem] gap-1 text-sm">
                Set gate
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={selectedGate}
                  disabled={controlsBusy || !selectedMatch}
                  onChange={(event) => {
                    if (isGate(event.target.value)) setSelectedGate(event.target.value);
                  }}
                  data-testid="qa-gate-value"
                >
                  {GATES.map((gate) => <option key={gate.value} value={gate.value}>{gate.label}</option>)}
                </select>
              </label>
              <Button
                type="button"
                onClick={() => selectedMatch && gateMutation.mutate({ matchId: selectedMatch.id, gate: selectedGate })}
                disabled={controlsBusy || !selectedMatch}
                data-testid="qa-set-gate"
              >
                {gateMutation.isPending ? "Setting…" : "Set gate"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void refreshMatches()} disabled={controlsBusy} data-testid="qa-refresh-matches">
                <RefreshCw className={`mr-2 h-4 w-4 ${matchLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          )}
          {!matchesQuery.isError && !matches.length && !matchLoading && (
            <p className="text-sm text-muted-foreground" data-testid="qa-gate-empty">No valid QA Alice / QA Bob fixture pair matches were returned.</p>
          )}
          <FeedbackMessage feedback={gateFeedback} />
        </section>

        <section className="space-y-3 border-t pt-4" aria-labelledby="qa-messages-control-heading">
          <div>
            <h3 id="qa-messages-control-heading" className="font-medium">Messages API QA test</h3>
            <p className="text-xs text-muted-foreground">
              API-level test only—not fixture login and not normal <code>/messages</code> full UI E2E. Requests use <code>{QA_MEMBER_HEADER}</code> while the Admin session stays intact.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-[14rem] flex-1 gap-1 text-sm">
              QA match
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={selectedMatchId}
                disabled={controlsBusy || matches.length === 0}
                onChange={(event) => setSelectedMatchId(event.target.value)}
                data-testid="qa-message-match"
              >
                {!matches.length && <option value="">{matchLoading ? "Loading QA matches…" : "No returned QA fixture pairs"}</option>}
                {matches.map((match) => <option key={match.id} value={match.id}>{qaMemberName(match.initiatorId)} / {qaMemberName(match.recipientId)}</option>)}
              </select>
            </label>
            <label className="grid min-w-[9rem] gap-1 text-sm">
              Acting QA member
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={actingMemberId}
                disabled={controlsBusy || !selectedMatch}
                onChange={(event) => {
                  if (isQaMemberId(event.target.value)) setActingMemberId(event.target.value);
                }}
                data-testid="qa-message-acting-member"
              >
                {QA_MEMBERS.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}
              </select>
            </label>
            <Button type="button" variant="outline" onClick={() => void refreshMessages()} disabled={controlsBusy || !chatAvailable} data-testid="qa-refresh-messages">
              <RefreshCw className={`mr-2 h-4 w-4 ${messagesLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh thread
            </Button>
          </div>

          {selectedMatch && (
            <p className="text-xs text-muted-foreground" data-testid="qa-message-perspective">
              Readback perspective: <strong>{qaMemberName(actingMemberId)}</strong> · {gateLabel(selectedMatch.currentGate)} · {selectedMatch.status}
            </p>
          )}

          {!selectedMatch ? (
            <p className="text-sm text-muted-foreground" data-testid="qa-message-empty">Select a returned QA fixture pair to test Messages.</p>
          ) : !chatAvailable ? (
            <div className="space-y-3 rounded-md border border-dashed p-3" data-testid="qa-message-locked">
              <p className="text-sm text-muted-foreground">
                Messages API read/send/read actions are disabled below Gate 3 and for declined matches. Set this QA pair to Gate 3 or higher to test both perspectives.
              </p>
              <div className="flex gap-2">
                <Button type="button" disabled data-testid="qa-send-message">
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Send
                </Button>
                <Button type="button" variant="outline" disabled data-testid="qa-mark-messages-read">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" /> Mark read
                </Button>
              </div>
            </div>
          ) : messagesQuery.isError ? (
            <Alert variant="destructive" data-testid="qa-message-error">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Could not load the Messages thread</AlertTitle>
              <AlertDescription>{errorText(messagesQuery.error, "The Messages API returned an error.")}</AlertDescription>
            </Alert>
          ) : messagesLoading ? (
            <p className="text-sm text-muted-foreground" role="status" data-testid="qa-message-loading">Loading thread readback…</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3" data-testid="qa-message-thread" aria-live="polite">
                {messagesQuery.data?.length ? messagesQuery.data.map((message) => (
                  <article key={message.id} className="rounded-md bg-muted/50 p-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="font-medium">{qaMemberName(message.senderId)}</span>
                      <time className="text-xs text-muted-foreground" dateTime={messageIsoTime(message.createdAt)}>{messageTime(message.createdAt)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
                  </article>
                )) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">No messages yet. Send one from either QA perspective.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setMessageFeedback(null);
                  }}
                  placeholder={`Send as ${qaMemberName(actingMemberId)}…`}
                  maxLength={MESSAGE_LIMIT}
                  rows={2}
                  disabled={controlsBusy}
                  data-testid="qa-message-content"
                  className="min-w-[14rem] flex-1 resize-y"
                />
                <div className="flex items-end gap-2">
                  <Button type="button" onClick={() => {
                    if (selectedMatch && draft.trim()) {
                      sendMutation.mutate({ matchId: selectedMatch.id, memberId: actingMemberId, content: draft.trim() });
                    }
                  }} disabled={sendDisabled} data-testid="qa-send-message">
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    {sendMutation.isPending ? "Sending…" : "Send"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    if (selectedMatch) readMutation.mutate({ matchId: selectedMatch.id, memberId: actingMemberId });
                  }} disabled={readDisabled} data-testid="qa-mark-messages-read">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    Mark read
                  </Button>
                </div>
              </div>
              <p className="text-right text-xs text-muted-foreground" aria-live="polite">{draft.length}/{MESSAGE_LIMIT}</p>
            </div>
          )}
          <FeedbackMessage feedback={messageFeedback} />
        </section>
      </CardContent>
    </Card>
  );
}