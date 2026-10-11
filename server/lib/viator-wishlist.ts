import type { WishlistPreview } from "../../shared/wishlist-discovery";
import { suggestWishlistPriceTier } from "../../shared/wishlist-discovery";
import { platformFor, productUrl } from "./wishlist-preview";

type Options = { key: string; fetch?: typeof fetch };
async function viatorRequest(path: string, options: Options, body?: unknown): Promise<any> {
  const response = await (options.fetch ?? fetch)(`https://api.viator.com/partner${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "exp-api-key": options.key,
      Accept: "application/json;version=2.0",
      "Accept-Language": "en-US",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Experience catalog unavailable.");
  return response.json();
}
function normalize(product: any, pricing: any, originalUrl?: string): WishlistPreview | undefined {
  if (!product?.title || product.status === "INACTIVE") return undefined;
  let url: string;
  try {
    url = productUrl(originalUrl || product.productUrl).href;
    if (platformFor(url) !== "Viator") return undefined;
  } catch { return undefined; }
  const images = Array.isArray(product.images) ? product.images : [];
  const image = images.find((entry: any) => entry.isCover) ?? images[0];
  const variants = Array.isArray(image?.variants) ? image.variants : [];
  const variant = variants.find((entry: any) => entry.width >= 400 && entry.width <= 1200) ?? variants[0];
  let imageUrl = "";
  try { imageUrl = productUrl(variant?.url).href; } catch { /* Member can supply an image. */ }
  const value = Number(pricing?.summary?.fromPrice);
  const price = Number.isFinite(value) && value > 0 && value < 1000000 ? value.toFixed(2) : "";
  return {
    title: String(product.title).slice(0, 200), imageUrl, price,
    currency: price ? String(pricing.currency || "").toUpperCase() : "",
    url, platform: "Viator", priceTier: suggestWishlistPriceTier(price),
  };
}

// Official partner data takes precedence over generic search/page extraction.
export async function searchViator(query: string, options: Options): Promise<WishlistPreview[]> {
  const response = await viatorRequest("/search/freetext", options, {
    searchTerm: query,
    searchTypes: [{ searchType: "PRODUCTS", pagination: { start: 1, count: 8 } }],
    currency: "USD",
  });
  const products = Array.isArray(response?.products?.results) ? response.products.results : [];
  const results = await Promise.all(products.map(async (summary: any) => {
    try {
      // Some search responses omit the booking URL. Resolve it through the
      // product endpoint instead of inventing an affiliate/product link.
      const product = summary.productUrl ? summary :
        await viatorRequest(`/products/${encodeURIComponent(summary.productCode)}`, options);
      return normalize({ ...summary, ...product }, summary.pricing);
    } catch { return undefined; }
  }));
  return results.filter((result): result is WishlistPreview => !!result);
}
export async function previewViator(input: string, options: Options): Promise<WishlistPreview | undefined> {
  const url = productUrl(input);
  if (platformFor(url.href) !== "Viator") return undefined;
  const code = url.pathname.match(/\/d\d+-([A-Z0-9]{1,50})\/?$/i)?.[1];
  if (!code) return undefined;
  try {
    const [product, schedule] = await Promise.all([
      viatorRequest(`/products/${encodeURIComponent(code)}`, options),
      viatorRequest(`/availability/schedules/${encodeURIComponent(code)}`, options),
    ]);
    if (product?.productCode?.toUpperCase() !== code.toUpperCase() ||
        schedule?.productCode?.toUpperCase() !== code.toUpperCase()) return undefined;
    return normalize(product, schedule, url.href);
  } catch { return undefined; }
}
