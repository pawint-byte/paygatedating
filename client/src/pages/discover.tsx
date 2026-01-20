import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MatchCard } from "@/components/dashboard/match-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";

export default function Discover() {
  const { toast } = useToast();

  const { data: profiles, isLoading } = useQuery<Profile[]>({
    queryKey: ["/api/profiles/discover"],
  });

  const sendInterestMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("POST", "/api/matches", { recipientId });
    },
    onSuccess: () => {
      toast({
        title: "Interest Sent!",
        description: "Your interest request has been sent. $5 has been deducted from your wallet.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error: Error) => {
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
        description: error.message || "Failed to send interest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendInterest = (profile: Profile) => {
    sendInterestMutation.mutate(profile.userId);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <p className="text-muted-foreground">
          Find your next meaningful connection
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <EmptyState type="discover" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {profiles.map((profile) => (
            <MatchCard
              key={profile.id}
              profile={profile}
              onSendInterest={handleSendInterest}
              isPending={sendInterestMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
