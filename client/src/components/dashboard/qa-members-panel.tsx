import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QA_INITIAL_CREDIT, QA_MEMBER_HEADER, QA_MEMBERS } from "@shared/qa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
};

type Perspective = {
  wallet: { balance: string | number };
  matches: Match[];
};

const aliceId = "qa_track_a_alice";
const bobId = "qa_track_a_bob";

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
  const [wallet, matches] = await Promise.all([
    qaRequest<Perspective["wallet"]>("/api/wallet", memberId),
    qaRequest<Match[]>("/api/matches", memberId),
  ]);
  return { wallet, matches };
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
    if (perspectivesEnabled) {
      await Promise.all([alicePerspective.refetch(), bobPerspective.refetch()]);
      setNotice("Both QA member perspectives refreshed.");
    }
  };

  const setupMutation = useMutation({
    mutationFn: () => qaRequest<{ members: QaMember[]; grantAmount: number }>("/api/admin/qa-members/setup", undefined, "POST", {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
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

  const refreshAfterAction = async () => {
    setPerspectivesEnabled(true);
    await Promise.all([alicePerspective.refetch(), bobPerspective.refetch()]);
  };

  const interestMutation = useMutation({
    mutationFn: () => qaRequest<Match>("/api/matches", aliceId, "POST", {
      recipientId: bobId,
      message: "Track A QA wallet-credit check",
    }),
    onSuccess: async () => {
      const message = "Interest sent from Alice. Expected charge: $5.00.";
      setNotice(message);
      toast({ title: "Interest sent", description: message });
      await refreshAfterAction();
    },
    onError: (error: Error) => {
      setNotice(`Could not send interest: ${error.message}`);
      toast({ title: "Interest failed", description: error.message, variant: "destructive" });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: (matchId: string) => qaRequest<Match>(`/api/matches/${matchId}/advance`, bobId, "POST", {}),
    onSuccess: async () => {
      const message = "Chapter 1 unlocked by Bob. Expected charge: $5.00; the match should now be at gate2.";
      setNotice(message);
      toast({ title: "Chapter unlocked", description: message });
      await refreshAfterAction();
    },
    onError: (error: Error) => {
      setNotice(`Could not unlock Chapter 1: ${error.message}`);
      toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
    },
  });

  const aliceMatch = pairMatch(alicePerspective.data?.matches);
  const bobMatch = pairMatch(bobPerspective.data?.matches);
  const activeGateOne = bobMatch?.currentGate === "gate1" &&
    !["declined", "paused"].includes(bobMatch.status.toLowerCase());
  const refreshing = alicePerspective.isFetching || bobPerspective.isFetching;

  return (
    <Card data-testid="panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Track A QA members</CardTitle>
        <CardDescription>
          Admin-only wallet-credit check for exactly two fixtures. Setup grants Alice and Bob ${QA_INITIAL_CREDIT} once; reruns never top up and do not use Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button data-testid="setup" onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
            {setupMutation.isPending ? "Setting up…" : "Setup QA members"}
          </Button>
          <Button data-testid="refresh" variant="outline" onClick={refreshPerspectives} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh both perspectives"}
          </Button>
        </div>

        {notice && <p className="text-sm" role="status">{notice}</p>}

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
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="interest"
            variant="secondary"
            disabled={interestMutation.isPending || !alicePerspective.isSuccess || !!aliceMatch}
            onClick={() => {
              if (window.confirm("Send interest from Alice to Bob? Alice will be charged $5.00.")) {
                interestMutation.mutate();
              }
            }}
          >
            {interestMutation.isPending ? "Sending…" : "Send Interest"}
          </Button>
          <Button
            data-testid="advance"
            variant="secondary"
            disabled={advanceMutation.isPending || !activeGateOne}
            onClick={() => {
              if (bobMatch && window.confirm("Unlock Chapter 1 as Bob? Bob will be charged $5.00.")) {
                advanceMutation.mutate(bobMatch.id);
              }
            }}
          >
            {advanceMutation.isPending ? "Unlocking…" : "Unlock Chapter 1"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}