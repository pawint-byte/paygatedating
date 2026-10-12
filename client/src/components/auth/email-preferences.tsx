import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface EmailPreferencesValue {
  email_notifications: boolean;
  marketing_emails: boolean;
}

const preferencesKey = ["/api/email-preferences"];

export function EmailPreferences() {
  const preferencesQuery = useQuery<EmailPreferencesValue>({
    queryKey: preferencesKey,
  });

  const saveMutation = useMutation({
    mutationFn: async (next: EmailPreferencesValue) => {
      const response = await apiRequest("PATCH", "/api/email-preferences", next);
      return (await response.json()) as EmailPreferencesValue;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(preferencesKey, saved);
      queryClient.invalidateQueries({ queryKey: preferencesKey });
    },
  });

  const preferences = preferencesQuery.data;
  const locked = !preferences || preferencesQuery.isFetching || saveMutation.isPending;

  const setPreference = (key: keyof EmailPreferencesValue, checked: boolean) => {
    if (!preferences || locked) return;
    saveMutation.mutate({ ...preferences, [key]: checked });
  };

  if (preferencesQuery.isLoading) {
    return (
      <div className="space-y-4" aria-label="Loading email preferences">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-64" /></div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56" /></div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    );
  }

  if (preferencesQuery.isError || !preferences) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Email preferences could not be loaded</p>
            <p className="text-muted-foreground">{preferencesQuery.error?.message || "Your saved choices are unknown. Retry before changing them."}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => preferencesQuery.refetch()} disabled={preferencesQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${preferencesQuery.isFetching ? "animate-spin" : ""}`} />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {saveMutation.isError && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          The save could not be confirmed. The switches show the last confirmed choices; reload preferences to verify the saved state before making another change.
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications">Email Notifications</Label>
          <p className="text-sm text-muted-foreground">Receive email updates about new matches and messages</p>
        </div>
        <Switch
          id="email-notifications"
          checked={preferences.email_notifications}
          onCheckedChange={(checked) => setPreference("email_notifications", checked)}
          disabled={locked}
          data-testid="switch-email-notifications"
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="marketing-emails">Marketing Emails</Label>
          <p className="text-sm text-muted-foreground">Receive tips, updates, and special offers</p>
        </div>
        <Switch
          id="marketing-emails"
          checked={preferences.marketing_emails}
          onCheckedChange={(checked) => setPreference("marketing_emails", checked)}
          disabled={locked}
          data-testid="switch-marketing-emails"
        />
      </div>
    </div>
  );
}
