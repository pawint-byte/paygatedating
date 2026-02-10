import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Send, ArrowDownLeft, ExternalLink, Clock, Sparkles, MapPin, ShoppingBag, CheckCircle2, XCircle, Loader2, Package, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GiftDeliveryModal, getPriceTier } from "@/components/3d/GiftDeliveryModal";
import type { GiftPurchase, RegistryItem } from "@shared/schema";

interface GiftWithItem extends GiftPurchase {
  item?: RegistryItem;
  senderName?: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  fee_paid: { label: "Fee Paid", variant: "outline" },
  address_provided: { label: "Address Shared", variant: "secondary" },
  link_clicked: { label: "Link Clicked", variant: "secondary" },
  purchase_confirmed: { label: "Purchased", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  refunded: { label: "Refunded", variant: "destructive" },
  pending: { label: "Pending", variant: "outline" },
};

const flowSteps = ["fee_paid", "address_provided", "link_clicked", "purchase_confirmed", "delivered"];

function getStepIndex(status: string): number {
  const idx = flowSteps.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function StepIndicator({ currentStatus }: { currentStatus: string }) {
  const currentStep = getStepIndex(currentStatus);
  const labels = ["Fee Paid", "Address", "Link Clicked", "Purchased", "Delivered"];

  return (
    <div className="flex items-center gap-1 w-full" data-testid="step-indicator">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border ${
                i <= currentStep
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-0.5 mt-[-14px] ${
                i < currentStep ? "bg-foreground" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function GiftHistory() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<{
    title: string;
    senderName: string;
    tier: "starter" | "impressive" | "vip";
    price?: number;
  } | null>(null);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressGiftId, setAddressGiftId] = useState<string | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressType, setDeliveryAddressType] = useState("home");
  const [trackingInfo, setTrackingInfo] = useState("");
  const [confirmPurchaseGiftId, setConfirmPurchaseGiftId] = useState<string | null>(null);

  const { data: sentGifts = [], isLoading: loadingSent } = useQuery<GiftWithItem[]>({
    queryKey: ["/api/gifts/sent"],
  });

  const { data: receivedGifts = [], isLoading: loadingReceived } = useQuery<GiftWithItem[]>({
    queryKey: ["/api/gifts/received"],
  });

  const invalidateGifts = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/gifts/sent"] });
    queryClient.invalidateQueries({ queryKey: ["/api/gifts/received"] });
  };

  const trackAffiliateMutation = useMutation({
    mutationFn: async (giftId: string) => {
      await apiRequest("POST", `/api/gifts/${giftId}/track-affiliate-click`);
    },
    onSuccess: () => {
      invalidateGifts();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const confirmPurchaseMutation = useMutation({
    mutationFn: async ({ giftId, trackingInfo }: { giftId: string; trackingInfo?: string }) => {
      await apiRequest("POST", `/api/gifts/${giftId}/confirm-purchase`, {
        orderTrackingInfo: trackingInfo || undefined,
      });
    },
    onSuccess: () => {
      invalidateGifts();
      setConfirmPurchaseGiftId(null);
      setTrackingInfo("");
      toast({ title: "Purchase confirmed", description: "Waiting for delivery confirmation from recipient." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async (giftId: string) => {
      await apiRequest("POST", `/api/gifts/${giftId}/confirm-delivery`);
    },
    onSuccess: () => {
      invalidateGifts();
      toast({ title: "Delivery confirmed", description: "Gates have been unlocked!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const provideAddressMutation = useMutation({
    mutationFn: async ({ giftId, name, address, addressType }: { giftId: string; name: string; address: string; addressType: string }) => {
      await apiRequest("POST", `/api/gifts/${giftId}/provide-address`, {
        deliveryName: name,
        deliveryAddress: address,
        deliveryAddressType: addressType,
      });
    },
    onSuccess: () => {
      invalidateGifts();
      setAddressDialogOpen(false);
      setAddressGiftId(null);
      setDeliveryName("");
      setDeliveryAddress("");
      setDeliveryAddressType("home");
      toast({ title: "Address provided", description: "Your match can now purchase your gift." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelGiftMutation = useMutation({
    mutationFn: async (giftId: string) => {
      await apiRequest("POST", `/api/gifts/${giftId}/revoke`);
    },
    onSuccess: () => {
      invalidateGifts();
      toast({ title: "Gift cancelled", description: "The gift has been revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenGift3D = (gift: GiftWithItem) => {
    setSelectedGift({
      title: gift.item?.title || `Gift worth $${gift.giftValue}`,
      senderName: gift.senderName || "Your Match",
      tier: getPriceTier(Number(gift.giftValue)),
      price: Number(gift.giftValue),
    });
    setModalOpen(true);
  };

  const handleAffiliateClick = (gift: GiftWithItem) => {
    trackAffiliateMutation.mutate(gift.id);
    if (gift.item?.affiliateUrl) {
      window.open(gift.item.affiliateUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenAddressForm = (giftId: string) => {
    setAddressGiftId(giftId);
    setDeliveryName("");
    setDeliveryAddress("");
    setDeliveryAddressType("home");
    setAddressDialogOpen(true);
  };

  const handleSubmitAddress = () => {
    if (!addressGiftId || !deliveryName.trim() || !deliveryAddress.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    provideAddressMutation.mutate({
      giftId: addressGiftId,
      name: deliveryName,
      address: deliveryAddress,
      addressType: deliveryAddressType,
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const SentGiftCard = ({ gift }: { gift: GiftWithItem }) => {
    const status = statusLabels[gift.status] || statusLabels.pending;
    const canCancel = ["fee_paid", "address_provided", "link_clicked", "purchase_confirmed"].includes(gift.status);

    return (
      <div className="border rounded-lg p-4 space-y-3" data-testid={`gift-sent-${gift.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{gift.item?.title || `Gift worth $${gift.giftValue}`}</p>
              <p className="text-xs text-muted-foreground">{formatDate(gift.createdAt)}</p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <StepIndicator currentStatus={gift.status} />

        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
          <span>Gift value: ${gift.giftValue}</span>
          <span>Service fee: ${gift.platformFee}</span>
          {gift.gatesUnlocked > 0 && (
            <span>Unlocked {gift.gatesUnlocked} gate{gift.gatesUnlocked > 1 ? "s" : ""}</span>
          )}
        </div>

        {gift.status === "fee_paid" && (
          <div className="bg-muted rounded-md p-3 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Waiting for recipient to provide delivery address</span>
          </div>
        )}

        {gift.status === "address_provided" && (
          <div className="space-y-2">
            <div className="bg-muted rounded-md p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="w-4 h-4 shrink-0" />
                Delivery Address
              </div>
              {gift.deliveryName && (
                <p className="text-sm" data-testid={`text-delivery-name-${gift.id}`}>{gift.deliveryName}</p>
              )}
              <p className="text-sm text-muted-foreground" data-testid={`text-delivery-address-${gift.id}`}>
                {gift.deliveryAddress}
              </p>
              {gift.deliveryAddressType && (
                <Badge variant="outline" className="text-xs">{gift.deliveryAddressType}</Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAffiliateClick(gift)}
                disabled={trackAffiliateMutation.isPending}
                data-testid={`button-open-affiliate-${gift.id}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Retailer Link
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmPurchaseGiftId(gift.id)}
                data-testid={`button-purchased-${gift.id}`}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                I've purchased this item
              </Button>
            </div>
          </div>
        )}

        {gift.status === "link_clicked" && (
          <div className="space-y-2">
            {gift.item?.affiliateUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAffiliateClick(gift)}
                data-testid={`button-reopen-affiliate-${gift.id}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Retailer Link Again
              </Button>
            )}
            {confirmPurchaseGiftId === gift.id ? (
              <div className="space-y-2 border rounded-md p-3">
                <p className="text-sm font-medium">Confirm your purchase</p>
                <Input
                  placeholder="Order tracking info (optional)"
                  value={trackingInfo}
                  onChange={(e) => setTrackingInfo(e.target.value)}
                  data-testid={`input-tracking-${gift.id}`}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => confirmPurchaseMutation.mutate({ giftId: gift.id, trackingInfo })}
                    disabled={confirmPurchaseMutation.isPending}
                    data-testid={`button-confirm-purchase-${gift.id}`}
                  >
                    {confirmPurchaseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirm Purchase
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setConfirmPurchaseGiftId(null); setTrackingInfo(""); }}
                    data-testid={`button-cancel-confirm-${gift.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => setConfirmPurchaseGiftId(gift.id)}
                data-testid={`button-confirm-purchase-start-${gift.id}`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Purchase
              </Button>
            )}
          </div>
        )}

        {gift.status === "purchase_confirmed" && (
          <div className="bg-muted rounded-md p-3 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-500 shrink-0" />
            <span>Waiting for recipient to confirm delivery</span>
            {gift.orderTrackingInfo && (
              <Badge variant="outline" className="text-xs ml-auto">Tracking: {gift.orderTrackingInfo}</Badge>
            )}
          </div>
        )}

        {gift.status === "delivered" && (
          <div className="bg-muted rounded-md p-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Complete - {gift.gatesUnlocked} gate{gift.gatesUnlocked > 1 ? "s" : ""} unlocked</span>
          </div>
        )}

        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => cancelGiftMutation.mutate(gift.id)}
            disabled={cancelGiftMutation.isPending}
            className="w-full"
            data-testid={`button-cancel-gift-${gift.id}`}
          >
            {cancelGiftMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Cancel / Revoke
          </Button>
        )}
      </div>
    );
  };

  const ReceivedGiftCard = ({ gift }: { gift: GiftWithItem }) => {
    const status = statusLabels[gift.status] || statusLabels.pending;

    return (
      <div className="border rounded-lg p-4 space-y-3" data-testid={`gift-received-${gift.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="font-medium">{gift.item?.title || `Gift worth $${gift.giftValue}`}</p>
              <p className="text-xs text-muted-foreground">
                From {gift.senderName || "an admirer"} - {formatDate(gift.createdAt)}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Gift value: ${gift.giftValue}
        </div>

        {gift.status === "fee_paid" && (
          <Button
            size="sm"
            onClick={() => handleOpenAddressForm(gift.id)}
            className="w-full"
            data-testid={`button-provide-address-${gift.id}`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Provide Delivery Address
          </Button>
        )}

        {(gift.status === "address_provided" || gift.status === "link_clicked") && (
          <div className="bg-muted rounded-md p-3 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Your match is preparing your gift</span>
          </div>
        )}

        {gift.status === "purchase_confirmed" && (
          <Button
            size="sm"
            onClick={() => confirmDeliveryMutation.mutate(gift.id)}
            disabled={confirmDeliveryMutation.isPending}
            className="w-full"
            data-testid={`button-confirm-delivery-${gift.id}`}
          >
            {confirmDeliveryMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Confirm Delivery
          </Button>
        )}

        {gift.status === "delivered" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleOpenGift3D(gift)}
            data-testid={`button-view-gift-3d-${gift.id}`}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            View Gift in 3D
          </Button>
        )}
      </div>
    );
  };

  const isLoading = loadingSent || loadingReceived;
  const hasGifts = sentGifts.length > 0 || receivedGifts.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <CardTitle>Gift History</CardTitle>
          </div>
          <CardDescription>Track gifts you've sent and received</CardDescription>
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
                  <p className="text-center py-4 text-muted-foreground text-sm">No gifts sent yet</p>
                ) : (
                  sentGifts.map((gift) => <SentGiftCard key={gift.id} gift={gift} />)
                )}
              </TabsContent>

              <TabsContent value="received" className="space-y-3 mt-4">
                {receivedGifts.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No gifts received yet</p>
                ) : (
                  receivedGifts.map((gift) => <ReceivedGiftCard key={gift.id} gift={gift} />)
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Provide Delivery Address
            </DialogTitle>
            <DialogDescription>
              Share where your gift should be delivered. This can be your home, workplace, or a pickup location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name for delivery</label>
              <Input
                placeholder="Full name"
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
                data-testid="input-delivery-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery address (home, work, Amazon locker, etc.)</label>
              <Textarea
                placeholder="Enter your delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                data-testid="input-delivery-address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address type</label>
              <Select value={deliveryAddressType} onValueChange={setDeliveryAddressType}>
                <SelectTrigger data-testid="select-address-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="pickup_location">Pickup Location</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSubmitAddress}
              disabled={provideAddressMutation.isPending || !deliveryName.trim() || !deliveryAddress.trim()}
              className="w-full"
              data-testid="button-submit-address"
            >
              {provideAddressMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              Submit Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GiftDeliveryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        gift={selectedGift}
      />
    </>
  );
}
