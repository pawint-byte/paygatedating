import { Send, MessageCircle, Camera, Video, Phone, Check, Lock, Zap, Gift, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { GATE_COSTS, SKIP_AHEAD_COST } from "@shared/schema";
import type { Match, Profile, DatePlan } from "@shared/schema";
import { GiftWishlist } from "./gift-wishlist";
import { DatePlanDialog } from "./date-plan-dialog";
import { DatePlanCard } from "./date-plan-card";

const gateIcons = {
  gate1: Send,
  gate2: MessageCircle,
  gate3: Camera,
  gate4: Video,
  gate5: Phone,
  completed: Check,
};

const gateLabels = {
  gate1: "Reach-Out",
  gate2: "Response",
  gate3: "Multimedia",
  gate4: "Video Date",
  gate5: "Contact",
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
  const currentGateNum = gateNumbers[match.currentGate];
  const progressPercent = ((currentGateNum - 1) / 5) * 100;
  const isCompleted = match.currentGate === "completed";
  const canPlanDate = currentGateNum >= 3 || isCompleted;

  const { data: datePlans } = useQuery<DatePlan[]>({
    queryKey: ["/api/matches", match.id, "date-plans"],
    enabled: canPlanDate,
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

  return (
    <div
      className="bg-card border border-card-border rounded-lg p-4"
      data-testid={`gate-progress-${match.id}`}
    >
      <div className="flex items-center gap-3 mb-4">
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
              : `Gate ${currentGateNum} - Either of you can pay to advance`}
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

        {!isCompleted && (
          <div className="space-y-2 mt-2">
            <Button
              onClick={onAdvanceGate}
              disabled={isPending}
              className="w-full"
              data-testid={`button-advance-gate-${match.id}`}
            >
              Pay ${currentCost} to Advance
            </Button>
            <div className="flex items-center justify-center gap-2">
              <GiftWishlist 
                recipientProfile={otherProfile} 
                matchId={match.id}
              />
            </div>
            {!isMyTurn && (
              <p className="text-center text-xs text-muted-foreground">
                It's {otherProfile.displayName}'s turn, but you can pay to move things forward
              </p>
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
