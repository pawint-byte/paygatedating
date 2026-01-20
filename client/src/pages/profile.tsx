import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProfileSetupForm } from "@/components/dashboard/profile-setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import type { Profile as ProfileType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<ProfileType>({
    queryKey: ["/api/profile"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (profile) {
        return await apiRequest("PATCH", "/api/profile", data);
      } else {
        return await apiRequest("POST", "/api/profile", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated!",
        description: "Your profile has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
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
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your dating profile and preferences
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  This information will be visible to other members
                </CardDescription>
              </div>
              {profile?.subscriptionTier === "premium" && (
                <Badge className="gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ProfileSetupForm
              onSubmit={(data) => updateProfileMutation.mutate(data)}
              isPending={updateProfileMutation.isPending}
              defaultValues={
                profile
                  ? {
                      displayName: profile.displayName,
                      age: profile.age,
                      location: profile.location || "",
                      tagline: profile.tagline || "",
                      bio: profile.bio || "",
                      lookingFor: profile.lookingFor || "",
                      interests: profile.interests?.join(", ") || "",
                    }
                  : user
                  ? {
                      displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "New Member",
                      age: 25,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
