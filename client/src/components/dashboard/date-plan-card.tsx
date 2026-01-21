import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, CreditCard, Check, X, Clock, Sparkles } from "lucide-react";
import type { DatePlan } from "@shared/schema";

const statusConfig = {
  proposed: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
  accepted: { label: "Accepted", color: "bg-green-500/10 text-green-600", icon: Check },
  declined: { label: "Declined", color: "bg-red-500/10 text-red-600", icon: X },
  completed: { label: "Completed", color: "bg-blue-500/10 text-blue-600", icon: Sparkles },
  cancelled: { label: "Cancelled", color: "bg-gray-500/10 text-gray-600", icon: X },
};

const paymentLabels = {
  ill_pay: "They're paying",
  you_pay: "You're paying",
  split: "Splitting the bill",
};

interface DatePlanCardProps {
  datePlan: DatePlan;
  currentUserId: string;
  matchId: string;
}

export function DatePlanCard({ datePlan, currentUserId, matchId }: DatePlanCardProps) {
  const { toast } = useToast();
  const isProposer = datePlan.proposerId === currentUserId;
  const isPending = datePlan.status === "proposed";

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/date-plans/${datePlan.id}/status`, { status });
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "date-plans"] });
      toast({
        title: status === "accepted" ? "Date Accepted!" : "Date Declined",
        description: status === "accepted" 
          ? "Great! The date is confirmed." 
          : "The date proposal has been declined.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update date plan.",
        variant: "destructive",
      });
    },
  });

  const status = statusConfig[datePlan.status as keyof typeof statusConfig];
  const StatusIcon = status?.icon || Clock;
  
  const paymentDisplay = isProposer 
    ? (datePlan.paymentPreference === "ill_pay" ? "You're paying" : 
       datePlan.paymentPreference === "you_pay" ? "They're paying" : "Splitting the bill")
    : paymentLabels[datePlan.paymentPreference as keyof typeof paymentLabels];

  const proposedDate = new Date(datePlan.proposedDate);
  const formattedDate = proposedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = proposedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Card className="overflow-hidden" data-testid={`card-date-plan-${datePlan.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium">{datePlan.activity}</span>
            </div>
            {datePlan.activityType && (
              <Badge variant="outline" className="text-xs">
                {datePlan.activityType}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={status?.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status?.label}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate} at {formattedTime}</span>
          </div>
          
          {datePlan.placeName && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{datePlan.placeName}</span>
              {datePlan.placeAddress && (
                <span className="text-xs">({datePlan.placeAddress})</span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span>{paymentDisplay}</span>
          </div>
        </div>

        {datePlan.notes && (
          <p className="mt-3 text-sm text-muted-foreground italic">
            "{datePlan.notes}"
          </p>
        )}

        {isPending && !isProposer && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => updateStatusMutation.mutate("declined")}
              disabled={updateStatusMutation.isPending}
              data-testid="button-decline-date"
            >
              <X className="w-4 h-4 mr-1" />
              Decline
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => updateStatusMutation.mutate("accepted")}
              disabled={updateStatusMutation.isPending}
              data-testid="button-accept-date"
            >
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
          </div>
        )}

        {isPending && isProposer && (
          <p className="mt-3 text-xs text-center text-muted-foreground">
            Waiting for response...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
