import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Wallet, Bell, Eye, Shield, MapPin } from "lucide-react";
import type { Profile } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { WishlistManager } from "@/components/dashboard/wishlist-manager";
import { LocationCapture } from "@/components/dashboard/location-capture";
import { GiftHistory } from "@/components/dashboard/gift-history";
import { DatePreferences } from "@/components/dashboard/date-preferences";
import { MyQRCode } from "@/components/dashboard/my-qr-code";

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

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle>Your Plan</CardTitle>
          </div>
          <CardDescription>
            Pay-as-you-go — no subscriptions, no monthly fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Pay As You Go</p>
              <p className="text-sm text-muted-foreground">
                You only pay when you connect with someone
              </p>
            </div>
            <Badge variant="default" data-testid="badge-plan-type">
              Free to Join
            </Badge>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Gate fees start at $5 and alternate between you and your match. Add funds to your wallet anytime from your dashboard to start connecting.
            </p>
          </div>
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

      {profile && (
        <MyQRCode 
          userId={profile.userId} 
          displayName={profile.displayName} 
        />
      )}

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
