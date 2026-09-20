import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GateProgress } from "@/components/dashboard/gate-progress";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match, Profile, Wallet } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useLocation } from "wouter";
import { SKIP_SUCCESS } from "@shared/skip-copy";
import { isStaleSpendConfirmation, type ConfirmedSpend } from "@/lib/wallet-spend";

interface MatchWithProfile extends Match {
  otherProfile: Profile;
}

export default function Matches() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: matches, isLoading } = useQuery<MatchWithProfile[]>({
    queryKey: ["/api/matches"],
  });

  const { data: currentProfile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const advanceGateMutation = useMutation({
    mutationFn: async ({ matchId, confirmation }: { matchId: string; confirmation: ConfirmedSpend }) => {
      return await apiRequest("POST", `/api/matches/${matchId}/advance`, confirmation);
    },
    onSuccess: () => {
      toast({
        title: "Chapter Advanced!",
        description: "You've turned the page. Keep the story going!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (error: Error) => {
      if (isStaleSpendConfirmation(error)) {
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
        toast({
          title: "Confirmation expired",
          description: "The price or chapter changed. Reopen the confirmation and review the updated details.",
          variant: "destructive",
        });
        return;
      }
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to advance gate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const skipAheadMutation = useMutation({
    mutationFn: async ({ matchId, confirmation }: { matchId: string; confirmation: ConfirmedSpend }) => {
      return await apiRequest("POST", `/api/matches/${matchId}/skip`, confirmation);
    },
    onSuccess: () => {
      toast({
        title: "Skip Ahead Complete!",
        description: SKIP_SUCCESS,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (error: Error) => {
      if (isStaleSpendConfirmation(error)) {
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
        toast({
          title: "Confirmation expired",
          description: "The price or chapter changed. Reopen the confirmation and review the updated details.",
          variant: "destructive",
        });
        return;
      }
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to skip ahead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isMyTurn = (match: Match) => {
    if (!currentProfile) return false;
    const gateNum = parseInt(match.currentGate.replace("gate", ""));
    const isInitiator = match.initiatorId === currentProfile.userId;
    return isInitiator ? gateNum % 2 === 1 : gateNum % 2 === 0;
  };

  const activeMatches = matches?.filter((m) => m.status === "active") || [];
  const pendingMatches = matches?.filter((m) => m.status === "pending") || [];
  const completedMatches = matches?.filter((m) => m.status === "completed" || m.currentGate === "completed") || [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Matches</h1>
        <p className="text-muted-foreground">
          Track your connections and write new chapters together
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : !matches || matches.length === 0 ? (
        <EmptyState type="matches" onAction={() => setLocation("/discover")} />
      ) : (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeMatches.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeMatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No active matches. Check your pending requests or discover new profiles!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeMatches.map((match) => (
                  <GateProgress
                    key={match.id}
                    match={match}
                    otherProfile={match.otherProfile}
                    currentUserId={currentProfile?.userId}
                    isMyTurn={isMyTurn(match)}
                    onAdvanceGate={(confirmation) => advanceGateMutation.mutate({ matchId: match.id, confirmation })}
                    onSkipAhead={(confirmation) => skipAheadMutation.mutate({ matchId: match.id, confirmation })}
                    isPending={advanceGateMutation.isPending || skipAheadMutation.isPending}
                    wallet={wallet}
                    subscriptionTier={currentProfile?.subscriptionTier}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingMatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending requests. Send some interest requests to get started!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingMatches.map((match) => (
                  <GateProgress
                    key={match.id}
                    match={match}
                    otherProfile={match.otherProfile}
                    currentUserId={currentProfile?.userId}
                    isMyTurn={isMyTurn(match)}
                    onAdvanceGate={(confirmation) => advanceGateMutation.mutate({ matchId: match.id, confirmation })}
                    onSkipAhead={(confirmation) => skipAheadMutation.mutate({ matchId: match.id, confirmation })}
                    isPending={advanceGateMutation.isPending || skipAheadMutation.isPending}
                    wallet={wallet}
                    subscriptionTier={currentProfile?.subscriptionTier}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedMatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No completed stories yet. Keep writing new chapters!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedMatches.map((match) => (
                  <GateProgress
                    key={match.id}
                    match={match}
                    otherProfile={match.otherProfile}
                    currentUserId={currentProfile?.userId}
                    isMyTurn={false}
                    onAdvanceGate={() => {}}
                    onSkipAhead={() => {}}
                    wallet={wallet}
                    subscriptionTier={currentProfile?.subscriptionTier}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
