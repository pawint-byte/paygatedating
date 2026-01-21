import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Crown, Bell, Eye, Shield, CreditCard, MapPin } from "lucide-react";
import type { Profile } from "@shared/schema";
import { PREMIUM_MONTHLY_COST, PREMIUM_YEARLY_COST } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { WishlistManager } from "@/components/dashboard/wishlist-manager";
import { LocationCapture } from "@/components/dashboard/location-capture";
import { GiftHistory } from "@/components/dashboard/gift-history";
import { DatePreferences } from "@/components/dashboard/date-preferences";

export default function Settings() {
  const { toast } = useToast();

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (isVisible: boolean) => {
      return await apiRequest("PATCH", "/api/profile", { isVisible });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your visibility settings have been updated.",
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
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const isPremium = profile?.subscriptionTier === "premium";

  const createSubscriptionMutation = useMutation({
    mutationFn: async (plan: "monthly" | "yearly") => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout", { plan });
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
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
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>
            Manage your premium membership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-muted-foreground">
                {isPremium ? "Premium Member" : "Free Plan"}
              </p>
            </div>
            <Badge variant={isPremium ? "default" : "secondary"}>
              {isPremium ? "Premium" : "Free"}
            </Badge>
          </div>

          {!isPremium && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="font-medium mb-2">Upgrade to Premium</p>
              <p className="text-sm text-muted-foreground mb-4">
                Unlock likes, requests, and wallet funding for just ${PREMIUM_MONTHLY_COST}/month or ${PREMIUM_YEARLY_COST}/year.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => createSubscriptionMutation.mutate("monthly")}
                  disabled={createSubscriptionMutation.isPending}
                  data-testid="button-upgrade-monthly"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {createSubscriptionMutation.isPending ? "Loading..." : `$${PREMIUM_MONTHLY_COST}/month`}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => createSubscriptionMutation.mutate("yearly")}
                  disabled={createSubscriptionMutation.isPending}
                  data-testid="button-upgrade-yearly"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {createSubscriptionMutation.isPending ? "Loading..." : `$${PREMIUM_YEARLY_COST}/year (Save 17%)`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle>Visibility</CardTitle>
          </div>
          <CardDescription>
            Control who can see your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="profile-visible">Show My Profile</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, your profile won't appear in search results
              </p>
            </div>
            <Switch
              id="profile-visible"
              checked={profile?.isVisible ?? true}
              onCheckedChange={(checked) => toggleVisibilityMutation.mutate(checked)}
              disabled={toggleVisibilityMutation.isPending}
              data-testid="switch-visibility"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <CardTitle>Location</CardTitle>
          </div>
          <CardDescription>
            Set your location for better match suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationCapture currentCity={profile?.city} />
        </CardContent>
      </Card>

      <DatePreferences />

      <ReferralCard />

      <WishlistManager />

      <GiftHistory />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates about new matches and messages
              </p>
            </div>
            <Switch id="email-notifications" defaultChecked data-testid="switch-email-notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive tips, updates, and special offers
              </p>
            </div>
            <Switch id="marketing-emails" data-testid="switch-marketing-emails" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>
            Manage your account security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Log Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <a href="/api/logout">
              <Button variant="outline" data-testid="button-logout-settings">Log Out</Button>
            </a>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" data-testid="button-delete-account">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
