export type WishlistCategory = "all" | "gifts" | "experiences";
export type WishlistPriceTier = "starter" | "impressive" | "vip";

export interface WishlistPreview {
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  platform: string;
  url: string;
  priceTier: WishlistPriceTier;
  error?: "unavailable";
}

export interface WishlistSearchResponse {
  results: WishlistPreview[];
  message?: string;
}

export function suggestWishlistPriceTier(price: string | number): WishlistPriceTier {
  const amount = Number(price);
  if (Number.isFinite(amount) && amount >= 100) return "vip";
  if (Number.isFinite(amount) && amount >= 50) return "impressive";
  return "starter";
}
