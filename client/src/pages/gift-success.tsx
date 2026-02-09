import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Gift, CheckCircle, Lock, Info, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GiftSuccessResponse {
  purchase: {
    id: string;
    giftValue: string;
    platformFee: string;
    gatesUnlocked: number;
  };
  itemTitle: string;
  gatesUnlocked: number;
}

export default function GiftSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session_id");
    setSessionId(id);
  }, []);

  const { data, isLoading, error } = useQuery<GiftSuccessResponse>({
    queryKey: ["/api/gifts/checkout/success", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/gifts/checkout/success?session_id=${sessionId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to verify purchase");
      }
      return response.json();
    },
    enabled: !!sessionId,
    retry: false,
  });

  if (!sessionId) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-invalid-session">Invalid session. Please try again.</p>
            <Button className="mt-4" onClick={() => setLocation("/discover")} data-testid="button-back-discover">
              Back to Discover
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive" data-testid="text-purchase-error">Failed to verify your purchase. Please contact support.</p>
            <Button className="mt-4" onClick={() => setLocation("/discover")} data-testid="button-back-discover-error">
              Back to Discover
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-payment-success">Payment Successful!</CardTitle>
          <CardDescription data-testid="text-payment-confirmed">
            Your gift purchase has been confirmed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-muted-foreground">Gift Item</span>
              <span className="font-medium" data-testid="text-gift-item">{data.itemTitle}</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-muted-foreground">Gift Value</span>
              <span className="font-medium" data-testid="text-gift-value">${data.purchase.giftValue}</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-muted-foreground">Service Fee</span>
              <span className="text-sm" data-testid="text-service-fee">${data.purchase.platformFee}</span>
            </div>
            {data.gatesUnlocked > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-1 pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Gates Unlocked
                </span>
                <Badge variant="secondary" className="bg-primary/10 text-primary" data-testid="badge-gates-unlocked">
                  {data.gatesUnlocked} {data.gatesUnlocked === 1 ? "Gate" : "Gates"}
                </Badge>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium" data-testid="text-gift-sent-confirmation">Your gift is on its way!</p>
            <p className="text-sm text-muted-foreground" data-testid="text-recipient-notified">
              The recipient will be notified and can claim the gift to complete the purchase 
              with their own shipping details. Your address information stays private for both of you.
            </p>
          </div>

          <Alert>
            <Heart className="h-4 w-4" />
            <AlertTitle>What happens next?</AlertTitle>
            <AlertDescription>
              The recipient will see your gift in their inbox and can claim it at any time. 
              Once claimed, they'll purchase the item directly from the retailer and have it 
              shipped to their own address. No personal addresses are ever shared between users.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setLocation("/matches")}
              data-testid="button-back-to-matches"
            >
              <Info className="w-5 h-5 mr-2" />
              Back to Matches
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/discover")}
              data-testid="button-continue-discovering"
            >
              Continue Discovering
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
