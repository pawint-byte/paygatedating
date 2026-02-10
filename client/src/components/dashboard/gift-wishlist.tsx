import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gift, Lock, Loader2, Info, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RegistryItem, Profile } from "@shared/schema";
import { calculateGiftPlatformFee, GIFT_PLATFORM_FEE_PERCENT, GIFT_PLATFORM_FEE_MINIMUM } from "@shared/schema";
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

  const calculateServiceFee = (price: string) => {
    const giftValue = parseFloat(price);
    return calculateGiftPlatformFee(giftValue).toFixed(2);
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
            <Gift className="w-5 h-5" />
            {recipientProfile.displayName}'s Wishlist
          </DialogTitle>
          <DialogDescription>
            Pay a small service fee, then purchase the gift directly from the retailer via our link.
            Service fee is {GIFT_PLATFORM_FEE_PERCENT}% (${GIFT_PLATFORM_FEE_MINIMUM} minimum).
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
                          <p className="text-lg font-bold">${item.price}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {priceTierLabels[item.priceTier as keyof typeof priceTierLabels]?.label || item.priceTier}
                          </Badge>
                          {(item as any).platform && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {(item as any).platform}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-muted-foreground">
                          Service fee: <span className="font-medium">${calculateServiceFee(item.price)}</span>
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
                              Pay Fee
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
              <div>
                <p className="font-medium mb-1">How it works</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Pay the service fee to reserve the gift</li>
                  <li>Your match provides a delivery address</li>
                  <li>Purchase the gift directly from the retailer using our link</li>
                  <li>Confirm your purchase and your match confirms delivery</li>
                  <li>Gates unlock based on gift value: $25+ = 1 gate, $50+ = 2, $100+ = 3</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
