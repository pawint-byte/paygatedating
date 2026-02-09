import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Gift, ExternalLink, CheckCircle, Lock, Info, Copy, Check, MapPin, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface RecipientShipping {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

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
  recipientShipping: RecipientShipping | null;
}

export default function GiftSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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

  const handleCopyAddress = () => {
    if (!data?.recipientShipping) return;
    const { street, city, state, zip, country } = data.recipientShipping;
    const fullAddress = [street, city, state, zip, country].filter(Boolean).join(", ");
    navigator.clipboard.writeText(fullAddress).then(() => {
      setCopied(true);
      toast({ title: "Address copied", description: "Paste it at checkout on the retailer site." });
      setTimeout(() => setCopied(false), 3000);
    });
  };

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

          {data.recipientShipping ? (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-medium" data-testid="text-shipping-label">Ship To</span>
              </div>
              <div className="bg-muted rounded-md p-3 text-sm space-y-1" data-testid="section-shipping-address">
                <p data-testid="text-shipping-street">{data.recipientShipping.street}</p>
                <p data-testid="text-shipping-city-state">
                  {data.recipientShipping.city}{data.recipientShipping.state ? `, ${data.recipientShipping.state}` : ""} {data.recipientShipping.zip}
                </p>
                {data.recipientShipping.country && (
                  <p className="text-muted-foreground" data-testid="text-shipping-country">{data.recipientShipping.country}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAddress}
                className="w-full"
                data-testid="button-copy-address"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address for Checkout
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Use this address when completing your purchase on the retailer site.
              </p>
            </div>
          ) : (
            <Alert data-testid="alert-no-address">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Shipping Address Not Available</AlertTitle>
              <AlertDescription>
                The recipient hasn't added a shipping address yet. They'll be notified about your gift
                and can update their address in their profile settings. You can return here later or
                reach out through your match conversation to coordinate delivery.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Complete Your Gift Purchase</AlertTitle>
            <AlertDescription>
              Click the button below to purchase the item from our retail partner.
              {data.recipientShipping ? " Use the shipping address above at checkout." : ""}
              {" "}Your match will be notified of your thoughtful gift!
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
