import { useState } from "react";
import { Send, MessageCircle, Camera, Video, Phone, Check, Lock, Zap, Gift, Calendar, Pause, Play, ArrowDownToLine, Heart, Coffee, Users2, MessageSquare, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GATE_COSTS, SKIP_AHEAD_COST } from "@shared/schema";
import type { Match, Profile, DatePlan } from "@shared/schema";
import { GiftWishlist } from "./gift-wishlist";
import { DatePlanDialog } from "./date-plan-dialog";
import { DatePlanCard } from "./date-plan-card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const gateIcons = {
  gate1: Send,
  gate2: MessageCircle,
  gate3: Camera,
  gate4: Video,
  gate5: Phone,
  completed: Check,
};

const gateLabels = {
  gate1: "The Spark",
  gate2: "The Curiosity",
  gate3: "Getting Real",
  gate4: "Face to Face",
  gate5: "Beyond the Screen",
  completed: "Connected",
};

const gateNumbers = {
  gate1: 1,
  gate2: 2,
  gate3: 3,
  gate4: 4,
  gate5: 5,
  completed: 6,
};

const intentLabels: Record<string, { label: string; icon: typeof Heart }> = {
  serious_romance: { label: "Serious Romance", icon: Heart },
  casual_dating: { label: "Casual Dating", icon: Coffee },
  activity_partner: { label: "Activity Partner", icon: Users2 },
  just_chatting: { label: "Just Chatting", icon: MessageSquare },
};

interface ForecastData {
  matchId: string;
  initiatorId: string;
  recipientId: string;
  currentGate: string;
  gatePaused: boolean;
  gatePausedBy: string | null;
  initiatorIntent: string | null;
  recipientIntent: string | null;
  initiatorDisplayName: string;
  recipientDisplayName: string;
  paidSoFar: { initiator: number; recipient: number };
  gateHistory: Array<{ gate: number; paidBy: string | null; amount: number }>;
  remainingGates: Array<{ gate: number; defaultPayer: string; costForInitiator: number; costForRecipient: number }>;
  pendingPullRequest: any;
  pullRequestHistory: any[];
}

interface GateProgressProps {
  match: Match;
  otherProfile: Profile;
  currentUserId?: string;
  isMyTurn: boolean;
  onAdvanceGate: () => void;
  onSkipAhead: () => void;
  isPending?: boolean;
}

export function GateProgress({
  match,
  otherProfile,
  currentUserId,
  isMyTurn,
  onAdvanceGate,
  onSkipAhead,
  isPending,
}: GateProgressProps) {
  const { toast } = useToast();
  const [showForecast, setShowForecast] = useState(false);
  const currentGateNum = gateNumbers[match.currentGate];
  const progressPercent = ((currentGateNum - 1) / 5) * 100;
  const isCompleted = match.currentGate === "completed";
  const canPlanDate = currentGateNum >= 3 || isCompleted;
  const isInitiator = currentUserId === match.initiatorId;

  const matchAny = match as any;
  const myIntent = isInitiator ? matchAny.initiatorIntent : matchAny.recipientIntent;
  const theirIntent = isInitiator ? matchAny.recipientIntent : matchAny.initiatorIntent;

  const { data: datePlans } = useQuery<DatePlan[]>({
    queryKey: ["/api/matches", match.id, "date-plans"],
    enabled: canPlanDate,
  });

  const { data: forecast } = useQuery<ForecastData>({
    queryKey: ["/api/matches", match.id, "forecast"],
    enabled: !isCompleted && match.status === "active",
  });

  const intentMutation = useMutation({
    mutationFn: async (intent: string) => {
      return await apiRequest("PUT", `/api/matches/${match.id}/intent`, { intent });
    },
    onSuccess: () => {
      toast({ title: "Intent Updated", description: "Your connection intent has been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${match.id}/pause`);
    },
    onSuccess: () => {
      toast({ title: "Chapter Paused", description: "You've signaled you're happy at this chapter. Either of you can resume anytime." });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", match.id, "forecast"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${match.id}/resume`);
    },
    onSuccess: () => {
      toast({ title: "Chapter Resumed", description: "Your story continues. You can now turn the next page." });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", match.id, "forecast"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pullRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${match.id}/pull-request`);
    },
    onSuccess: () => {
      toast({ title: "Request Sent", description: `You've asked ${otherProfile.displayName} to pay this gate.` });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", match.id, "forecast"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const respondPullMutation = useMutation({
    mutationFn: async ({ pullId, action }: { pullId: string; action: string }) => {
      return await apiRequest("POST", `/api/matches/${match.id}/pull-request/${pullId}/respond`, { action });
    },
    onSuccess: (_, variables) => {
      if (variables.action === "accept") {
        toast({ title: "Chapter Advanced!", description: "You accepted the request and turned the page." });
      } else {
        toast({ title: "Request Declined", description: `${otherProfile.displayName} will need to lead their own chapter.` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", match.id, "forecast"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const initials = otherProfile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentCost = match.currentGate !== "completed" 
    ? GATE_COSTS[match.currentGate as keyof typeof GATE_COSTS] 
    : 0;

  const gatePaused = matchAny.gatePaused;
  const pendingPull = forecast?.pendingPullRequest;
  const isPullForMe = pendingPull && pendingPull.requestedFrom === currentUserId;
  const isPullByMe = pendingPull && pendingPull.requestedBy === currentUserId;

  return (
    <div
      className="bg-card border border-card-border rounded-lg p-4"
      data-testid={`gate-progress-${match.id}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar>
          <AvatarImage src={otherProfile.photos?.[0]} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{otherProfile.displayName}</h4>
          <p className="text-sm text-muted-foreground">
            {isCompleted
              ? "Connection complete!"
              : gatePaused
              ? "Chapter paused — enjoying where you are"
              : `Chapter ${currentGateNum} — Either of you can turn the page`}
          </p>
        </div>
        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkipAhead}
            disabled={isPending}
            className="gap-1 flex-shrink-0"
            data-testid={`button-skip-ahead-${match.id}`}
          >
            <Zap className="w-3 h-3" />
            Skip ${SKIP_AHEAD_COST}
          </Button>
        )}
      </div>

      {/* Intent badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {myIntent && intentLabels[myIntent] && (
          <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-my-intent-${match.id}`}>
            {(() => { const Icon = intentLabels[myIntent].icon; return <Icon className="w-3 h-3" />; })()}
            You: {intentLabels[myIntent].label}
          </Badge>
        )}
        {theirIntent && intentLabels[theirIntent] && (
          <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-their-intent-${match.id}`}>
            {(() => { const Icon = intentLabels[theirIntent].icon; return <Icon className="w-3 h-3" />; })()}
            {otherProfile.displayName.split(" ")[0]}: {intentLabels[theirIntent].label}
          </Badge>
        )}
        {gatePaused && (
          <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
            <Pause className="w-3 h-3" />
            Paused
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            Gate {Math.min(currentGateNum, 5)} of 5
          </span>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <div className="flex justify-between">
          {Object.entries(gateIcons).slice(0, 5).map(([gate, Icon]) => {
            const gateNum = gateNumbers[gate as keyof typeof gateNumbers];
            const isActive = gate === match.currentGate;
            const isPassed = gateNum < currentGateNum;

            return (
              <div
                key={gate}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? "text-primary" : isPassed ? "text-primary/60" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isPassed
                      ? "bg-primary/20"
                      : "bg-muted"
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                </div>
                <span className="text-[10px]">{gateLabels[gate as keyof typeof gateLabels]}</span>
              </div>
            );
          })}
        </div>

        {/* Pending Pull Request notification */}
        {isPullForMe && pendingPull && (
          <Card className="p-3 border-primary/30 bg-primary/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">
                  {otherProfile.displayName} is asking you to pay Gate {pendingPull.gateNumber} (${GATE_COSTS[`gate${pendingPull.gateNumber}` as keyof typeof GATE_COSTS]})
                </p>
              </div>

              {/* Forecast preview for the receiver */}
              {forecast && (
                <div className="text-xs space-y-1 bg-muted/50 rounded-md p-2">
                  <p className="font-medium text-muted-foreground">If you accept, here's the projected breakdown:</p>
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-muted-foreground">You've paid so far</p>
                      <p className="font-semibold">${isInitiator ? forecast.paidSoFar.initiator : forecast.paidSoFar.recipient}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">They've paid so far</p>
                      <p className="font-semibold">${isInitiator ? forecast.paidSoFar.recipient : forecast.paidSoFar.initiator}</p>
                    </div>
                  </div>
                  {forecast.remainingGates.length > 0 && (
                    <div className="pt-1">
                      <p className="text-muted-foreground mb-1">Remaining gates (default turns):</p>
                      {forecast.remainingGates.map((g) => (
                        <div key={g.gate} className="flex justify-between">
                          <span>Gate {g.gate}: ${GATE_COSTS[`gate${g.gate}` as keyof typeof GATE_COSTS]}</span>
                          <span className="text-muted-foreground">
                            {g.defaultPayer === currentUserId ? "Your turn" : `${otherProfile.displayName.split(" ")[0]}'s turn`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground pt-1">Either side can send further requests that change who pays.</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => respondPullMutation.mutate({ pullId: pendingPull.id, action: "accept" })}
                  disabled={respondPullMutation.isPending}
                  className="flex-1"
                  data-testid={`button-accept-pull-${match.id}`}
                >
                  Accept & Pay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondPullMutation.mutate({ pullId: pendingPull.id, action: "decline" })}
                  disabled={respondPullMutation.isPending}
                  className="flex-1"
                  data-testid={`button-decline-pull-${match.id}`}
                >
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        )}

        {isPullByMe && pendingPull && (
          <Card className="p-3 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-amber-500" />
              <p className="text-sm">
                Waiting for {otherProfile.displayName} to respond to your payment request for Gate {pendingPull.gateNumber}
              </p>
            </div>
          </Card>
        )}

        {!isCompleted && !pendingPull && (
          <div className="space-y-2 mt-2">
            {gatePaused ? (
              <Button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                variant="outline"
                className="w-full gap-2"
                data-testid={`button-resume-gate-${match.id}`}
              >
                <Play className="w-4 h-4" />
                Resume Gate Progression
              </Button>
            ) : (
              <>
                <Button
                  onClick={onAdvanceGate}
                  disabled={isPending}
                  className="w-full"
                  data-testid={`button-advance-gate-${match.id}`}
                >
                  Pay ${currentCost} to Advance
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pullRequestMutation.mutate()}
                    disabled={pullRequestMutation.isPending || isPending}
                    className="flex-1 gap-1"
                    data-testid={`button-pull-request-${match.id}`}
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    Ask Them to Pay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pauseMutation.mutate()}
                    disabled={pauseMutation.isPending || isPending}
                    className="flex-1 gap-1"
                    data-testid={`button-pause-gate-${match.id}`}
                  >
                    <Pause className="w-3 h-3" />
                    Stay Here
                  </Button>
                </div>
              </>
            )}
            <div className="flex items-center justify-center gap-2">
              <GiftWishlist 
                recipientProfile={otherProfile} 
                matchId={match.id}
              />
            </div>
            {!isMyTurn && !gatePaused && (
              <p className="text-center text-xs text-muted-foreground">
                It's {otherProfile.displayName}'s turn, but you can pay to move things forward
              </p>
            )}
          </div>
        )}

        {/* Match Intent Selector */}
        {!isCompleted && match.status === "active" && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">What are you looking for?</span>
              <Select
                value={myIntent || ""}
                onValueChange={(value) => intentMutation.mutate(value)}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-intent-${match.id}`}>
                  <SelectValue placeholder="Set intent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serious_romance">Serious Romance</SelectItem>
                  <SelectItem value="casual_dating">Casual Dating</SelectItem>
                  <SelectItem value="activity_partner">Activity Partner</SelectItem>
                  <SelectItem value="just_chatting">Just Chatting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Forecast Toggle */}
        {!isCompleted && match.status === "active" && (
          <button
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground py-1 rounded-md hover-elevate"
            onClick={() => setShowForecast(!showForecast)}
            data-testid={`button-toggle-forecast-${match.id}`}
          >
            <DollarSign className="w-3 h-3" />
            {showForecast ? "Hide" : "View"} Payment Forecast
            {showForecast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {showForecast && forecast && (
          <div className="text-xs space-y-2 bg-muted/30 rounded-md p-3">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-muted-foreground">You've paid</p>
                <p className="font-semibold text-sm">${isInitiator ? forecast.paidSoFar.initiator : forecast.paidSoFar.recipient}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">{otherProfile.displayName.split(" ")[0]} paid</p>
                <p className="font-semibold text-sm">${isInitiator ? forecast.paidSoFar.recipient : forecast.paidSoFar.initiator}</p>
              </div>
            </div>
            {forecast.remainingGates.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <p className="font-medium text-muted-foreground">Upcoming gates:</p>
                {forecast.remainingGates.map((g) => (
                  <div key={g.gate} className="flex justify-between items-center">
                    <span>Gate {g.gate}</span>
                    <span className="text-muted-foreground">${GATE_COSTS[`gate${g.gate}` as keyof typeof GATE_COSTS]}</span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {g.defaultPayer === currentUserId ? "Your turn" : `${otherProfile.displayName.split(" ")[0]}'s turn`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {forecast.pullRequestHistory.length > 0 && (
              <div className="pt-1 border-t">
                <p className="font-medium text-muted-foreground mb-1">Payment request history:</p>
                {forecast.pullRequestHistory.slice(0, 3).map((pr: any) => (
                  <div key={pr.id} className="flex justify-between text-[10px]">
                    <span>Gate {pr.gateNumber}: {pr.requestedBy === currentUserId ? "You asked" : "They asked"}</span>
                    <Badge variant={pr.status === "accepted" ? "default" : pr.status === "declined" ? "destructive" : "secondary"} className="text-[10px] py-0">
                      {pr.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-primary font-medium text-center">
              You can now exchange contact details!
            </p>
            
            {currentUserId && (
              <DatePlanDialog
                matchId={match.id}
                recipientId={otherProfile.userId}
                recipientName={otherProfile.displayName}
                trigger={
                  <Button variant="outline" className="w-full" data-testid="button-plan-date">
                    <Calendar className="w-4 h-4 mr-2" />
                    Plan a Date
                  </Button>
                }
              />
            )}
          </div>
        )}

        {canPlanDate && datePlans && datePlans.length > 0 && currentUserId && (
          <div className="space-y-2 pt-3 border-t mt-3">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Plans
            </h5>
            {datePlans.slice(0, 2).map((plan) => (
              <DatePlanCard 
                key={plan.id} 
                datePlan={plan} 
                currentUserId={currentUserId}
                matchId={match.id}
              />
            ))}
            {datePlans.length > 2 && (
              <p className="text-xs text-center text-muted-foreground">
                +{datePlans.length - 2} more plans
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
