import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Gift, Send, ArrowDownLeft, ExternalLink, Clock, Sparkles, ShoppingBag, CheckCircle2, XCircle, Loader2, Package, Truck, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GiftDeliveryModal, getPriceTier } from "@/components/3d/GiftDeliveryModal";
import { getRetailerShippingGuidance, PRIVATE_RETAILER_SHIPPING_COPY } from "@/lib/gift-shipping-privacy";
import type { GiftPurchase, RegistryItem } from "@shared/schema";

interface GiftWithItem extends GiftPurchase {
  item?: RegistryItem;
  senderName?: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  fee_paid: { label: "Fee Paid", variant: "outline" },
  address_provided: { label: "Shipping Setup Reported", variant: "secondary" },
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
  const labels = ["Fee Paid", "Retailer Setup", "Link Clicked", "Purchased", "Delivered"];

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
  const [addressGiftAffiliateUrl, setAddressGiftAffiliateUrl] = useState<string | null>(null);
  const [privateShippingConfirmed, setPrivateShippingConfirmed] = useState(false);
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
      toast({ title: "Delivery confirmed", description: "New chapters have been unlocked!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const provideAddressMutation = useMutation({
    mutationFn: async ({ giftId }: { giftId: string }) => {
      await apiRequest("POST", `/api/gifts/${giftId}/provide-address`, {
        shippingMethod: "retailer_managed",
        privateShippingConfirmed: true,
      });
    },
    onSuccess: () => {
      invalidateGifts();
      setAddressDialogOpen(false);
      setAddressGiftId(null);
      setAddressGiftAffiliateUrl(null);
      setPrivateShippingConfirmed(false);
      toast({ title: "Private shipping confirmed", description: "Your match can purchase through the retailer without seeing your address." });
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

  const handleOpenAddressForm = (gift: GiftWithItem) => {
    setAddressGiftId(gift.id);
    setAddressGiftAffiliateUrl(gift.item?.affiliateUrl || null);
    setPrivateShippingConfirmed(false);
    setAddressDialogOpen(true);
  };

  const handleSubmitAddress = () => {
    const guidance = getRetailerShippingGuidance(addressGiftAffiliateUrl);
    if (!addressGiftId || !guidance.retailerSupported || !privateShippingConfirmed) {
      toast({ title: "Confirm private retailer shipping", description: "Open the retailer link, configure private shipping, and check the confirmation box before continuing.", variant: "destructive" });
      return;
    }
    provideAddressMutation.mutate({
      giftId: addressGiftId,
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
            <span>Waiting for recipient to confirm private retailer shipping</span>
          </div>
        )}

        {gift.status === "address_provided" && (
          <div className="space-y-2">
            <div className="bg-muted rounded-md p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Retailer shipping setup reported
              </div>
              <p className="text-sm text-muted-foreground" data-testid={`text-shipping-privacy-${gift.id}`}>
                {PRIVATE_RETAILER_SHIPPING_COPY}
              </p>
              <p className="text-xs text-muted-foreground">
                Use the retailer's private gift-ship or recipient-managed delivery flow. This status is not independent verification of the retailer's privacy controls.
              </p>
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
            onClick={() => handleOpenAddressForm(gift)}
            className="w-full"
            data-testid={`button-provide-address-${gift.id}`}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Set Up Private Retailer Delivery
          </Button>
        )}

        {(gift.status === "address_provided" || gift.status === "link_clicked") && (
          <div className="bg-muted rounded-md p-3 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Retailer-managed shipping is ready. Your address stays private.</span>
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
  const addressGuidance = getRetailerShippingGuidance(addressGiftAffiliateUrl);

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
              <ShieldCheck className="w-5 h-5" />
              Set Up Private Retailer Delivery
            </DialogTitle>
            <DialogDescription>
              You manage delivery with the retailer. Your street address and delivery name are never sent to the buyer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant={addressGuidance.retailerSupported ? "default" : "destructive"}>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>{addressGuidance.title}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{PRIVATE_RETAILER_SHIPPING_COPY}</p>
                <p>{addressGuidance.description}</p>
                {addressGuidance.validatedUrl && (
                  <a
                    href={addressGuidance.validatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
                    data-testid="link-retailer-shipping-setup"
                  >
                    Open {addressGuidance.retailer} item to configure private shipping
                    <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </AlertDescription>
            </Alert>
            {addressGuidance.retailerSupported && (
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="confirm-private-retailer-shipping"
                  checked={privateShippingConfirmed}
                  onCheckedChange={(checked) => setPrivateShippingConfirmed(checked === true)}
                  aria-describedby="private-shipping-attestation"
                  data-testid="checkbox-private-shipping-confirmed"
                />
                <label
                  htmlFor="confirm-private-retailer-shipping"
                  id="private-shipping-attestation"
                  className="cursor-pointer text-sm leading-5"
                >
                  I have configured a retailer-supported private shipping option for this gift; the buyer will not need my street address.
                </label>
              </div>
            )}
            <Button
              onClick={handleSubmitAddress}
              disabled={provideAddressMutation.isPending || !addressGuidance.retailerSupported || !privateShippingConfirmed}
              className="w-full"
              data-testid="button-confirm-retailer-shipping"
            >
              {provideAddressMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Confirm retailer-managed shipping
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
