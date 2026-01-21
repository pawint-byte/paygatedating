import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gift, ExternalLink, Lock, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RegistryItem, Profile } from "@shared/schema";
import { GIFT_PLATFORM_FEE_PERCENT } from "@shared/schema";
import { useState } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";

interface GiftWishlistProps {
  recipientProfile: Profile;
  matchId?: string;
}

const priceTierLabels = {
  starter: { label: "Starter", description: "Under $50" },
  impressive: { label: "Impressive", description: "$50-$100" },
  vip: { label: "VIP", description: "$100+" },
};

export function GiftWishlist({ recipientProfile, matchId }: GiftWishlistProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RegistryItem | null>(null);

  const { data: items = [], isLoading } = useQuery<RegistryItem[]>({
    queryKey: ["/api/registry", recipientProfile.userId],
    queryFn: async () => {
      const response = await fetch(`/api/registry/${recipientProfile.userId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch wishlist");
      }
      return response.json();
    },
    enabled: isOpen,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (item: RegistryItem) => {
      const response = await apiRequest("POST", "/api/gifts/checkout", {
        registryItemId: item.id,
        recipientUserId: recipientProfile.userId,
        matchId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", variant: "destructive" });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (item: RegistryItem) => {
    setSelectedItem(item);
    purchaseMutation.mutate(item);
  };

  const availableItems = items.filter(item => !item.isPurchased && !item.isReserved);

  const calculateTotal = (price: string) => {
    const giftValue = parseFloat(price);
    const fee = giftValue * GIFT_PLATFORM_FEE_PERCENT / 100;
    return (giftValue + fee).toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-view-wishlist">
          <Gift className="w-4 h-4 mr-2" />
          View Wishlist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {recipientProfile.displayName}'s Wishlist
          </DialogTitle>
          <DialogDescription>
            Purchase a gift to show genuine interest and unlock gates faster. 
            A {GIFT_PLATFORM_FEE_PERCENT}% service fee applies to all purchases.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items available in their wishlist</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableItems.map((item) => (
              <Card key={item.id} data-testid={`gift-item-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium truncate">{item.title}</h4>
                          <p className="text-lg font-bold text-primary">${item.price}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {priceTierLabels[item.priceTier as keyof typeof priceTierLabels]?.label || item.priceTier}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-muted-foreground">
                          Total with fee: <span className="font-medium">${calculateTotal(item.price)}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePurchase(item)}
                          disabled={purchaseMutation.isPending}
                          data-testid={`button-buy-gift-${item.id}`}
                        >
                          {purchaseMutation.isPending && selectedItem?.id === item.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              Buy Gift
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Gifts unlock gates automatically based on value: $25+ unlocks 1 gate, $50+ unlocks 2 gates, $100+ unlocks 3 gates.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
