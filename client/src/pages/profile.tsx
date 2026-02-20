import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProfileSetupForm } from "@/components/dashboard/profile-setup-form";
import { ShareProfileCard } from "@/components/dashboard/share-profile-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import type { Profile as ProfileType, Wallet } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useState } from "react";

interface ReferralInfo {
  referralCode: string;
  referralCount: number;
  totalBonusEarned: string;
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileType>({
    queryKey: ["/api/profile"],
  });

  const { data: referralInfo } = useQuery<ReferralInfo>({
    queryKey: ["/api/referral"],
  });

  const copyInviteLink = async () => {
    if (!referralInfo?.referralCode) return;
    
    const inviteUrl = `${window.location.origin}/invite/${referralInfo.referralCode}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Share this link to invite friends. You'll both earn bonus credits!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: inviteUrl,
        variant: "destructive",
      });
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (profile) {
        return await apiRequest("PATCH", "/api/profile", data);
      } else {
        // Include referral code from localStorage if present (from invite link)
        const referralCode = localStorage.getItem("referralCode");
        const profileData = referralCode ? { ...data, referralCode } : data;
        const result = await apiRequest("POST", "/api/profile", profileData);
        // Clear the referral code after successful signup
        if (referralCode) {
          localStorage.removeItem("referralCode");
        }
        return result;
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your dating profile and preferences
          </p>
        </div>
        <Button
          variant="outline"
          onClick={copyInviteLink}
          disabled={!referralInfo?.referralCode}
          data-testid="button-share-profile"
        >
          {copied ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Share2 className="w-4 h-4 mr-2" />
          )}
          {copied ? "Copied!" : "Share Profile"}
        </Button>
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
                      gender: profile.gender || "",
                      location: profile.location || "",
                      tagline: profile.tagline || "",
                      bio: profile.bio || "",
                      lookingFor: profile.lookingFor || "",
                      interests: profile.interests?.join(", ") || "",
                      hobbies: profile.hobbies?.join(", ") || "",
                      mustHaves: profile.mustHaves?.join(", ") || "",
                      dealBreakers: profile.dealBreakers?.join(", ") || "",
                      facetimeAvailable: profile.facetimeAvailable || false,
                      height: profile.height || "",
                      bodyType: profile.bodyType || "",
                      eyeColor: profile.eyeColor || "",
                      hairColor: profile.hairColor || "",
                      ethnicity: profile.ethnicity || "",
                      smoking: profile.smoking || "",
                      drinking: profile.drinking || "",
                      exercise: profile.exercise || "",
                      diet: profile.diet || "",
                      education: profile.education || "",
                      occupation: profile.occupation || "",
                      income: profile.income || "",
                      religion: profile.religion || "",
                      politics: profile.politics || "",
                      languages: profile.languages?.join(", ") || "",
                      relationshipStatus: profile.relationshipStatus || "",
                      hasKids: profile.hasKids || "",
                      wantsKids: profile.wantsKids || "",
                      zodiacSign: profile.zodiacSign || "",
                      photos: profile.photos || [],
                      videos: profile.videos || [],
                      showPhotoPublicly: profile.showPhotoPublicly,
                      showLocationPublicly: profile.showLocationPublicly,
                      showFirstNamePublicly: profile.showFirstNamePublicly,
                      showAgePublicly: profile.showAgePublicly,
                      showRegistryPublicly: profile.showRegistryPublicly,
                      showInterestsPublicly: profile.showInterestsPublicly,
                      instagramUsername: (profile.socialLinks as any)?.instagram || "",
                      tiktokUsername: (profile.socialLinks as any)?.tiktok || "",
                      twitterUsername: (profile.socialLinks as any)?.twitter || "",
                      snapchatUsername: (profile.socialLinks as any)?.snapchat || "",
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

      {profile && referralInfo && (
        <div className="mt-6">
          <ShareProfileCard 
            userId={profile.userId}
            displayName={profile.displayName}
            photoUrl={profile.photos?.[0]}
            referralCode={referralInfo.referralCode}
          />
        </div>
      )}
    </div>
  );
}
