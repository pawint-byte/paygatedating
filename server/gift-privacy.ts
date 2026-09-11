import type { GiftPurchase, RegistryItem } from "@shared/schema";

/**
 * The storage representation of a gift purchase contains the recipient's
 * delivery details.  Never spread that representation into an API response:
 * a purchase can be returned from several buyer-facing mutation handlers as
 * well as from the list/detail endpoints.
 */
export type GiftViewerRole = "buyer" | "recipient";

export function serializeGiftPurchase(
  purchase: GiftPurchase,
  role: GiftViewerRole,
): Record<string, unknown> {
  // Keep this an explicit allowlist.  In particular, stripeSessionId and the
  // delivery fields are intentionally not part of the buyer DTO.
  const safePurchase: Record<string, unknown> = {
    id: purchase.id,
    buyerUserId: purchase.buyerUserId,
    recipientUserId: purchase.recipientUserId,
    registryItemId: purchase.registryItemId,
    matchId: purchase.matchId,
    giftValue: purchase.giftValue,
    platformFee: purchase.platformFee,
    affiliateCommission: purchase.affiliateCommission,
    status: purchase.status,
    gatesUnlocked: purchase.gatesUnlocked,
    claimDeadline: purchase.claimDeadline,
    affiliateLinkClicked: purchase.affiliateLinkClicked,
    affiliateClickedAt: purchase.affiliateClickedAt,
    purchaseConfirmedAt: purchase.purchaseConfirmedAt,
    orderTrackingInfo: purchase.orderTrackingInfo,
    deliveryConfirmedAt: purchase.deliveryConfirmedAt,
    createdAt: purchase.createdAt,
  };

  if (role === "recipient") {
    safePurchase.deliveryAddress = purchase.deliveryAddress;
    safePurchase.deliveryAddressType = purchase.deliveryAddressType;
    safePurchase.deliveryName = purchase.deliveryName;
    // There is no shipping-method column in the existing schema.  An empty
    // address after an explicit recipient readiness transition represents the
    // retailer-managed path; an existing address represents the legacy path.
    safePurchase.shippingMethod = purchase.deliveryAddress
      ? "recipient_address"
      : "retailer_managed";
  }

  return safePurchase;
}

export function serializeGiftRegistryItem(
  item: RegistryItem | undefined,
  includeAffiliateUrl: boolean,
): Record<string, unknown> | null {
  if (!item) return null;

  const safeItem: Record<string, unknown> = {
    id: item.id,
    title: item.title,
    price: item.price,
    imageUrl: item.imageUrl,
  };
  if (includeAffiliateUrl) {
    safeItem.affiliateUrl = item.affiliateUrl;
  }
  return safeItem;
}