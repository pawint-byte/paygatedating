import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QA_INITIAL_CREDIT, QA_MEMBER_HEADER, QA_MEMBERS } from "@shared/qa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QaTestRewardsControl } from "./qa-test-rewards-control";

type QaMember = {
  userId: string;
  displayName: string;
  balance: string | number;
  credited: boolean;
};

type Match = {
  id: string;
  initiatorId: string;
  recipientId: string;
  currentGate: string;
  status: string;
  gate1PaidBy: string | null;
  gatePaused?: boolean;
};

type Perspective = {
  wallet: { balance: string | number };
  matches: Match[];
  transactions: Array<{
    id: string;
    type: string;
    amount: string;
    description: string | null;
    relatedMatchId: string | null;
  }>;
};

const aliceId = "qa_track_a_alice";
const bobId = "qa_track_a_bob";
const memberName = (id: string) => QA_MEMBERS.find(member => member.userId === id)?.displayName || id;

async function qaRequest<T>(url: string, memberId?: string, method = "GET", body?: unknown): Promise<T> {
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
      // The response body is not JSON; retain its useful text.
    }
    throw new Error(`${response.status}: ${message}`);
  }

  return await response.json() as T;
}

async function getPerspective(memberId: string): Promise<Perspective> {
  const [wallet, matches, transactions] = await Promise.all([
    qaRequest<Perspective["wallet"]>("/api/wallet", memberId),
    qaRequest<Match[]>("/api/matches", memberId),
    qaRequest<Perspective["transactions"]>("/api/wallet/transactions", memberId),
  ]);
  return { wallet, matches, transactions };
}

function pairMatch(matches: Match[] | undefined) {
  return matches?.find((match) =>
    (match.initiatorId === aliceId && match.recipientId === bobId) ||
    (match.initiatorId === bobId && match.recipientId === aliceId),
  );
}

function displayBalance(balance: string | number | undefined) {
  const value = Number(balance);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "Unavailable";
}

function MatchState({ match, testId }: { match: Match | undefined; testId: string }) {
  if (!match) {
    return <p className="text-sm text-muted-foreground" data-testid={testId}>No Track A pair match yet.</p>;
  }

  return (
    <p className="text-sm text-muted-foreground" data-testid={testId}>
      {match.status} · {match.currentGate}
      {match.gate1PaidBy ? ` · Gate 1 paid by ${match.gate1PaidBy}` : ""}
    </p>
  );
}

export function QaMembersPanel() {
  const { toast } = useToast();
  const [perspectivesEnabled, setPerspectivesEnabled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [senderId, setSenderId] = useState(aliceId);

  const alicePerspective = useQuery({
    queryKey: ["/api/qa-members", aliceId, "perspective"],
    queryFn: () => getPerspective(aliceId),
    enabled: perspectivesEnabled,
  });
  const bobPerspective = useQuery({
    queryKey: ["/api/qa-members", bobId, "perspective"],
    queryFn: () => getPerspective(bobId),
    enabled: perspectivesEnabled,
  });

  const refreshPerspectives = async () => {
    setPerspectivesEnabled(true);
    setNotice("Refreshing Alice and Bob's wallet and match perspectives…");
    try {
      await Promise.all([
        alicePerspective.refetch({ throwOnError: true }),
        bobPerspective.refetch({ throwOnError: true }),
      ]);
      setNotice("Both QA member perspectives refreshed.");
    } catch (error) {
      setNotice(`Could not verify both perspectives: ${(error as Error).message}`);
    }
  };

  const setupMutation = useMutation({
    mutationFn: () => qaRequest<{ members: QaMember[]; grantAmount: number }>("/api/admin/qa-members/setup", undefined, "POST", {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa-members"] });
      setPerspectivesEnabled(true);
      const credited = data.members.filter((member) => member.credited).length;
      const message = `${credited > 0 ? `${credited} member${credited === 1 ? "" : "s"} credited` : "Members already credited"}; $${data.grantAmount || QA_INITIAL_CREDIT} is one-time only.`;
      setNotice(message);
      toast({ title: "QA members ready", description: message });
    },
    onError: (error: Error) => {
      setNotice(`Setup failed: ${error.message}`);
      toast({ title: "QA setup failed", description: error.message, variant: "destructive" });
    },
  });

  const refreshAfterAction = async (completedAction: string) => {
    setPerspectivesEnabled(true);
    try {
      await Promise.all([
        alicePerspective.refetch({ throwOnError: true }),
        bobPerspective.refetch({ throwOnError: true }),
      ]);
    } catch (error) {
      setNotice(`${completedAction} Verification could not refresh: ${(error as Error).message}. Refresh before taking another action.`);
    }
  };

  const interestMutation = useMutation({
    mutationFn: (initiatorId: string) => qaRequest<Match & { chargedAmount: number; paymentType: string }>("/api/matches", initiatorId, "POST", {
      recipientId: initiatorId === aliceId ? bobId : aliceId,
      message: "Track A QA wallet-credit check",
    }),
    onSuccess: async (data, initiatorId) => {
      const message = data.paymentType === "wallet" && Number(data.chargedAmount) === 5
        ? `Interest sent from ${memberName(initiatorId)}. Server confirmed $5.00 charged to wallet.`
        : `Interest sent, but this did not confirm the expected $5 wallet charge (type: ${data.paymentType}, amount: ${data.chargedAmount}). Check the ledger.`;
      setNotice(message);
      toast({ title: "Interest sent", description: message });
      await refreshAfterAction(message);
    },
    onError: (error: Error) => {
      setNotice(`Could not send interest: ${error.message}`);
      toast({ title: "Interest failed", description: error.message, variant: "destructive" });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: (match: Match) => qaRequest<Match>(`/api/matches/${match.id}/advance`, match.recipientId, "POST", {}),
    onSuccess: async (data, match) => {
      const message = data.currentGate === "gate2" && data.gate1PaidBy === match.recipientId
        ? `Chapter 1 accepted by ${memberName(match.recipientId)}. Checking both members' state and $5 wallet ledger entries.`
        : "Acceptance returned an unexpected state. Refresh both perspectives and inspect the ledger.";
      setNotice(message);
      toast({ title: "Chapter unlocked", description: message });
      await refreshAfterAction(message);
    },
    onError: (error: Error) => {
      setNotice(`Could not unlock Chapter 1: ${error.message}`);
      toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
    },
  });

  const aliceMatch = pairMatch(alicePerspective.data?.matches);
  const bobMatch = pairMatch(bobPerspective.data?.matches);
  const activeGateOne = bobMatch?.currentGate === "gate1" &&
    !bobMatch.gatePaused && !["declined", "paused"].includes(bobMatch.status.toLowerCase());
  const refreshing = alicePerspective.isFetching || bobPerspective.isFetching;
  const busy = refreshing || setupMutation.isPending || interestMutation.isPending || advanceMutation.isPending;
  const bothLoaded = alicePerspective.isSuccess && bobPerspective.isSuccess && !refreshing;
  const sameMatch = !!aliceMatch && !!bobMatch && aliceMatch.id === bobMatch.id &&
    aliceMatch.status === bobMatch.status && aliceMatch.currentGate === bobMatch.currentGate &&
    aliceMatch.initiatorId === bobMatch.initiatorId && aliceMatch.recipientId === bobMatch.recipientId &&
    aliceMatch.gate1PaidBy === bobMatch.gate1PaidBy;
  const ledgerVerified = !!aliceMatch && [alicePerspective.data, bobPerspective.data].every((perspective, index) =>
    perspective?.transactions.some(transaction => transaction.type === "gate_payment" &&
      Number(transaction.amount) === -5 &&
      ((index === 0 ? aliceId : bobId) === aliceMatch.initiatorId
        ? transaction.description === "Gate 1: Interest request sent"
        : transaction.relatedMatchId === aliceMatch.id)),
  );
  const chapterVerified = bothLoaded && sameMatch && aliceMatch?.currentGate === "gate2" &&
    aliceMatch.status === "active" && aliceMatch.gate1PaidBy === aliceMatch.recipientId && ledgerVerified;

  return (
    <Card data-testid="panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Track A QA members</CardTitle>
        <CardDescription>
          Admin-only wallet-credit check for exactly two fixtures. Setup grants Alice and Bob ${QA_INITIAL_CREDIT} once; reruns never top up and do not use Stripe. Either member can initiate; the counterpart accepts. Your Admin login never changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button data-testid="setup" onClick={() => setupMutation.mutate()} disabled={busy}>
            {setupMutation.isPending ? "Setting up…" : "Setup QA members"}
          </Button>
          <Button data-testid="refresh" variant="outline" onClick={refreshPerspectives} disabled={busy}>
            {refreshing ? "Refreshing…" : "Refresh both perspectives"}
          </Button>
        </div>

        <QaTestRewardsControl disabled={busy} onGranted={refreshPerspectives} />
        {notice && <p className="text-sm" role="status">{notice}</p>}
        {bothLoaded && (aliceMatch || bobMatch) && (
          <p className="rounded-md border p-3 text-sm" role="status" data-testid="counterpart-verification">
            {chapterVerified
              ? "Verified: both members see Chapter 1 unlocked (active, gate2), and each has a $5 wallet debit."
              : sameMatch && aliceMatch?.currentGate === "gate1"
                ? `Both members see the same Interest. Waiting for ${memberName(aliceMatch.recipientId)} to accept Chapter 1.`
                : "Not yet verified: check both match states and wallet ledgers below."}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {[
            { id: aliceId, fallbackName: QA_MEMBERS.find((member) => member.userId === aliceId)?.displayName || "Alice", perspective: alicePerspective, match: aliceMatch, balanceTestId: "alice-balance", matchTestId: "alice-match" },
            { id: bobId, fallbackName: QA_MEMBERS.find((member) => member.userId === bobId)?.displayName || "Bob", perspective: bobPerspective, match: bobMatch, balanceTestId: "bob-balance", matchTestId: "bob-match" },
          ].map(({ id, fallbackName, perspective, match, balanceTestId, matchTestId }) => (
            <div key={id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{fallbackName}</p>
                <p className="text-sm font-semibold" data-testid={balanceTestId}>
                  {perspective.isLoading ? "Loading…" : displayBalance(perspective.data?.wallet.balance)}
                </p>
              </div>
              {perspective.isError ? (
                <p className="text-sm text-destructive" data-testid={matchTestId}>Could not load: {perspective.error.message}</p>
              ) : (
                <MatchState match={match} testId={matchTestId} />
              )}
              {perspective.data && (
                <ul className="space-y-1 text-xs text-muted-foreground" aria-label={`${fallbackName} wallet ledger`}>
                  {perspective.data.transactions.slice(0, 4).map(transaction => (
                    <li key={transaction.id}>
                      {Number(transaction.amount) >= 0 ? "+" : "−"}${Math.abs(Number(transaction.amount)).toFixed(2)} · {transaction.description || transaction.type}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm">
            Initiate as
            <select
              aria-label="QA Interest sender"
              data-testid="qa-sender"
              className="rounded-md border bg-background px-3 py-2"
              value={aliceMatch?.initiatorId || senderId}
              disabled={busy || !!aliceMatch || !!bobMatch}
              onChange={event => setSenderId(event.target.value)}
            >
              {QA_MEMBERS.map(member => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}
            </select>
          </label>
          <Button
            data-testid="interest"
            variant="secondary"
            disabled={busy || !bothLoaded || !!aliceMatch || !!bobMatch}
            onClick={() => {
              if (window.confirm(`Send interest from ${memberName(senderId)} to ${memberName(senderId === aliceId ? bobId : aliceId)}? The sender will use $5.00 of test wallet credit.`)) {
                interestMutation.mutate(senderId);
              }
            }}
          >
            {interestMutation.isPending ? "Sending…" : "Send Interest"}
          </Button>
          <Button
            data-testid="advance"
            variant="secondary"
            disabled={busy || !bothLoaded || !sameMatch || !activeGateOne}
            onClick={() => {
              if (bobMatch && window.confirm(`Accept Interest and unlock Chapter 1 as ${memberName(bobMatch.recipientId)}? The recipient will use $5.00 of test wallet credit.`)) {
                advanceMutation.mutate(bobMatch);
              }
            }}
          >
            {advanceMutation.isPending ? "Unlocking…" : `Accept & Unlock Chapter 1${bobMatch ? ` as ${memberName(bobMatch.recipientId)}` : ""}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}