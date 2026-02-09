import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Gift, ExternalLink, CheckCircle, Clock, ShoppingBag, Info, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReceivedGift {
  id: string;
  buyerUserId: string;
  recipientUserId: string;
  registryItemId: string;
  giftValue: string;
  platformFee: string;
  status: string;
  gatesUnlocked: number;
  createdAt: string;
  senderName: string;
  item: {
    id: string;
    title: string;
    price: string;
    imageUrl: string;
    affiliateUrl: string;
    source: string;
  } | null;
}

interface ClaimResponse {
  purchase: ReceivedGift;
  affiliateUrl: string;
  itemTitle: string;
}

export default function GiftClaim() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: gifts, isLoading } = useQuery<ReceivedGift[]>({
    queryKey: ["/api/gifts/received"],
  });

  const claimMutation = useMutation({
    mutationFn: async (giftId: string) => {
      const res = await apiRequest("POST", `/api/gifts/${giftId}/claim`);
      return res.json() as Promise<ClaimResponse>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/received"] });
      if (data.affiliateUrl) {
        window.open(data.affiliateUrl, "_blank", "noopener,noreferrer");
        toast({
          title: "Gift claimed!",
          description: "The retailer site is open in a new tab. Complete your purchase and ship to your own address.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Could not claim gift",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const unclaimedGifts = gifts?.filter((g) => g.status === "purchased" || g.status === "shipped" || g.status === "delivered") || [];
  const claimedGifts = gifts?.filter((g) => g.status === "claimed") || [];

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!gifts || gifts.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Gift className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2" data-testid="text-no-gifts">No gifts yet</p>
            <p className="text-muted-foreground mb-6">
              When someone sends you a gift, it will appear here for you to claim.
            </p>
            <Button onClick={() => setLocation("/discover")} data-testid="button-go-discover">
              Discover People
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-gifts-heading">Your Gifts</h1>
        <p className="text-muted-foreground">Claim gifts and have them shipped to your address — privately.</p>
      </div>

      {unclaimedGifts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Ready to Claim
          </h2>
          {unclaimedGifts.map((gift) => (
            <Card key={gift.id} data-testid={`card-gift-unclaimed-${gift.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {gift.item?.imageUrl && (
                    <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={gift.item.imageUrl}
                        alt={gift.item?.title || "Gift"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-medium truncate" data-testid={`text-gift-title-${gift.id}`}>
                          {gift.item?.title || "Gift"}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-gift-sender-${gift.id}`}>
                          From {gift.senderName}
                        </p>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-gift-value-${gift.id}`}>
                        ${gift.giftValue}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Received {new Date(gift.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => claimMutation.mutate(gift.id)}
                      disabled={claimMutation.isPending}
                      data-testid={`button-claim-gift-${gift.id}`}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {claimMutation.isPending ? "Claiming..." : "Claim & Purchase"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How claiming works</AlertTitle>
            <AlertDescription>
              When you claim a gift, you'll be taken to the retailer's website to complete the purchase. 
              Ship the item to your own address — your address is never shared with the sender.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {claimedGifts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            Claimed
          </h2>
          {claimedGifts.map((gift) => (
            <Card key={gift.id} className="opacity-80" data-testid={`card-gift-claimed-${gift.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {gift.item?.imageUrl && (
                    <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={gift.item.imageUrl}
                        alt={gift.item?.title || "Gift"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-medium truncate" data-testid={`text-gift-title-${gift.id}`}>
                          {gift.item?.title || "Gift"}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-gift-sender-${gift.id}`}>
                          From {gift.senderName}
                        </p>
                      </div>
                      <Badge variant="outline" data-testid={`badge-gift-claimed-${gift.id}`}>
                        Claimed
                      </Badge>
                    </div>
                    {gift.item?.affiliateUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(gift.item!.affiliateUrl, "_blank", "noopener,noreferrer")}
                        data-testid={`button-reopen-retailer-${gift.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Retailer Site Again
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
}
