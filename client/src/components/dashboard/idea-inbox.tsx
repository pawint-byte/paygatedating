import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Gift, Clock, CheckCircle2, ShoppingBag, Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GiftPurchase, RegistryItem } from "@shared/schema";

interface GiftWithItem extends GiftPurchase {
  item?: RegistryItem;
  senderName?: string;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  pending: { icon: Clock, label: "Processing", color: "text-amber-500" },
  purchased: { icon: Gift, label: "Gift Purchased", color: "text-blue-500" },
  shipped: { icon: ShoppingBag, label: "On Its Way", color: "text-purple-500" },
  delivered: { icon: CheckCircle2, label: "Delivered", color: "text-emerald-500" },
  claimed: { icon: Sparkles, label: "Claimed", color: "text-primary" },
};

export function IdeaInbox() {
  const { data: receivedGifts = [], isLoading } = useQuery<GiftWithItem[]>({
    queryKey: ["/api/gifts/received"],
  });

  const { data: registryItems = [] } = useQuery<RegistryItem[]>({
    queryKey: ["/api/registry"],
  });

  const activeGifts = receivedGifts.filter(g => g.status !== "refunded");
  const pendingGifts = activeGifts.filter(g => ["pending", "purchased", "shipped"].includes(g.status));
  const completedGifts = activeGifts.filter(g => ["delivered", "claimed"].includes(g.status));

  const totalWishlistValue = registryItems
    .filter(i => !i.isPurchased)
    .reduce((sum, i) => sum + Number(i.price), 0);

  const totalGiftedValue = activeGifts.reduce((sum, g) => sum + Number(g.giftValue), 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="section-idea-inbox">
      <div className="flex items-center gap-2">
        <Inbox className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Idea Inbox</h2>
        {pendingGifts.length > 0 && (
          <Badge variant="default" className="text-xs">
            {pendingGifts.length} incoming
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold" data-testid="text-wishlist-value">${totalWishlistValue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Wishlist Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold" data-testid="text-gifted-value">${totalGiftedValue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Gifts Received</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold" data-testid="text-total-gifts">{activeGifts.length}</p>
            <p className="text-xs text-muted-foreground">Total Gifts</p>
          </CardContent>
        </Card>
      </div>

      {pendingGifts.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Incoming Gifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingGifts.map((gift) => {
              const config = statusConfig[gift.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div
                  key={gift.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`inbox-gift-${gift.id}`}
                >
                  <div className={`w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {gift.item?.title || `Gift worth $${gift.giftValue}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        From {gift.senderName || "an admirer"}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1">
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary flex-shrink-0">${gift.giftValue}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {completedGifts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Received ({completedGifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedGifts.slice(0, 5).map((gift) => {
              const config = statusConfig[gift.status] || statusConfig.claimed;
              const StatusIcon = config.icon;
              return (
                <div
                  key={gift.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`inbox-completed-${gift.id}`}
                >
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {gift.item?.title || `Gift worth $${gift.giftValue}`}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      From {gift.senderName || "an admirer"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">${gift.giftValue}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {activeGifts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-medium mb-1">Your Idea Inbox is empty</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              When admirers browse your wishlist and send gifts, they'll appear here. 
              Make sure your wishlist has items at different price points to encourage first moves.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
