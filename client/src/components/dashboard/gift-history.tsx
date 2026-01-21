import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Send, ArrowDownLeft, ExternalLink, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { GiftPurchase, RegistryItem } from "@shared/schema";

interface GiftWithItem extends GiftPurchase {
  item?: RegistryItem;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  purchased: { label: "Purchased", variant: "default" },
  shipped: { label: "Shipped", variant: "secondary" },
  delivered: { label: "Delivered", variant: "secondary" },
  claimed: { label: "Claimed", variant: "default" },
  refunded: { label: "Refunded", variant: "destructive" },
};

export function GiftHistory() {
  const { data: sentGifts = [], isLoading: loadingSent } = useQuery<GiftWithItem[]>({
    queryKey: ["/api/gifts/sent"],
  });

  const { data: receivedGifts = [], isLoading: loadingReceived } = useQuery<GiftWithItem[]>({
    queryKey: ["/api/gifts/received"],
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const GiftCard = ({ gift, type }: { gift: GiftWithItem; type: "sent" | "received" }) => {
    const status = statusLabels[gift.status] || statusLabels.pending;
    
    return (
      <div 
        className="border rounded-lg p-4 space-y-2"
        data-testid={`gift-${type}-${gift.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {type === "sent" ? (
              <Send className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 text-primary" />
            )}
            <div>
              <p className="font-medium">${gift.giftValue}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(gift.createdAt)}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        
        {gift.gatesUnlocked > 0 && (
          <div className="text-xs text-muted-foreground">
            Unlocked {gift.gatesUnlocked} gate{gift.gatesUnlocked > 1 ? "s" : ""}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Service fee: ${gift.platformFee}</span>
          {gift.claimDeadline && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Claim by {formatDate(gift.claimDeadline)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const isLoading = loadingSent || loadingReceived;
  const hasGifts = sentGifts.length > 0 || receivedGifts.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <CardTitle>Gift History</CardTitle>
        </div>
        <CardDescription>
          Track gifts you've sent and received
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !hasGifts ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No gift history yet</p>
            <p className="text-sm">Gifts you send or receive will appear here</p>
          </div>
        ) : (
          <Tabs defaultValue="sent">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sent" data-testid="tab-gifts-sent">
                Sent ({sentGifts.length})
              </TabsTrigger>
              <TabsTrigger value="received" data-testid="tab-gifts-received">
                Received ({receivedGifts.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sent" className="space-y-3 mt-4">
              {sentGifts.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No gifts sent yet
                </p>
              ) : (
                sentGifts.map((gift) => (
                  <GiftCard key={gift.id} gift={gift} type="sent" />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="received" className="space-y-3 mt-4">
              {receivedGifts.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No gifts received yet
                </p>
              ) : (
                receivedGifts.map((gift) => (
                  <GiftCard key={gift.id} gift={gift} type="received" />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
