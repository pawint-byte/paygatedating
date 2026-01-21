import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Gift, ExternalLink, CheckCircle, Lock, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GiftSuccessResponse {
  purchase: {
    id: string;
    giftValue: string;
    platformFee: string;
    gatesUnlocked: number;
  };
  affiliateUrl: string;
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
            <p className="text-muted-foreground">Invalid session. Please try again.</p>
            <Button className="mt-4" onClick={() => setLocation("/discover")}>
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
            <p className="text-destructive">Failed to verify your purchase. Please contact support.</p>
            <Button className="mt-4" onClick={() => setLocation("/discover")}>
              Back to Discover
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePurchaseProduct = () => {
    window.open(data.affiliateUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your gift purchase has been confirmed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gift Item</span>
              <span className="font-medium">{data.itemTitle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gift Value</span>
              <span className="font-medium">${data.purchase.giftValue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Service Fee</span>
              <span className="text-sm">${data.purchase.platformFee}</span>
            </div>
            {data.gatesUnlocked > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Gates Unlocked
                </span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {data.gatesUnlocked} {data.gatesUnlocked === 1 ? "Gate" : "Gates"}
                </Badge>
              </div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Complete Your Gift Purchase</AlertTitle>
            <AlertDescription>
              Click the button below to purchase the item from our retail partner. 
              Your match will be notified of your thoughtful gift!
            </AlertDescription>
          </Alert>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handlePurchaseProduct}
            data-testid="button-purchase-product"
          >
            <Gift className="w-5 h-5 mr-2" />
            Purchase Gift on Retailer Site
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You'll be redirected to complete the purchase. PayGate earns a small commission from our retail partners.
          </p>

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/matches")}
              data-testid="button-back-to-matches"
            >
              Back to Matches
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
