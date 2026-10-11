import { suggestWishlistPriceTier, type WishlistCategory, type WishlistPreview, type WishlistDiscoveryCapabilities } from "../../shared/wishlist-discovery";
import { platformFor, productUrl } from "./wishlist-preview";
import { searchViator } from "./viator-wishlist";

export class WishlistSearchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type SearchOptions = { key?: string; viatorKey?: string; fetch?: typeof fetch };
const CACHE_TTL = 300000;

export function wishlistDiscoveryCapabilities(options: SearchOptions = {}): WishlistDiscoveryCapabilities {
  const giftsSearchAvailable = !!(options.key ?? process.env.SEARCHAPI_API_KEY);
  return {
    giftsSearchAvailable,
    experiencesSearchAvailable: giftsSearchAvailable || !!(options.viatorKey ?? process.env.VIATOR_API_KEY),
  };
}

function cleanPrice(value: unknown): string {
  const input = typeof value === "number" ? value : typeof value === "string" ? value.replace(/[$,\s]/g, "") : NaN;
  const price = Number(input);
  return input !== "" && Number.isFinite(price) && price > 0 && price < 1000000 ? price.toFixed(2) : "";
}
function imageUrl(input: unknown): string {
  try { const url = new URL(String(input)); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
}

export function parseCatalogResults(body: any, category: WishlistCategory): WishlistPreview[] {
  if (!Array.isArray(body?.organic_results)) return [];
  const seen = new Set<string>();
  return body.organic_results.flatMap((row: any) => {
    try {
      const url = productUrl(row.link);
      const platform = platformFor(url.href);
      if (!["Amazon", "Viator", "Klook"].includes(platform) ||
          (category === "gifts" && platform !== "Amazon") ||
          (category === "experiences" && platform === "Amazon") ||
          (platform === "Amazon" && !/\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:[/?]|$)/i.test(url.pathname)) ||
          (platform === "Viator" && !/\/tours\//i.test(url.pathname)) ||
          (platform === "Klook" && !/\/activity\//i.test(url.pathname)) ||
          !row.title || seen.has(url.href)) return [];
      seen.add(url.href);
      const detected = row.rich_snippet?.top?.detected_extensions ?? row.rich_snippet?.bottom?.detected_extensions;
      const currency = String(row.currency ?? detected?.price_currency ?? detected?.currency ??
        (platform === "Amazon" ? "USD" : "")).toUpperCase();
      const price = cleanPrice(row.extracted_price ?? detected?.price);
      return [{
        title: String(row.title).slice(0, 200), price, currency: price ? currency : "",
        imageUrl: imageUrl(row.thumbnail), platform, url: url.href,
        priceTier: suggestWishlistPriceTier(price),
      }];
    } catch { return []; }
  }).slice(0, 12);
}

// Use the official Viator partner catalog when connected; SearchAPI supplies
// product-search fallback for catalogs without partner credentials.
export function createWishlistSearch(options: SearchOptions = {}) {
  const cache = new Map<string, { expires: number; results: WishlistPreview[] }>();
  const pending = new Map<string, Promise<WishlistPreview[]>>();
  async function provider(query: string, category: "gifts" | "experiences") {
    const key = options.key ?? process.env.SEARCHAPI_API_KEY;
    const viatorKey = options.viatorKey ?? process.env.VIATOR_API_KEY;
    if (category === "experiences" && viatorKey) {
      try { return await searchViator(query, { key: viatorKey, fetch: options.fetch }); }
      catch {
        if (!key) throw new WishlistSearchError(502, "Experience search is temporarily unavailable. You can still paste a link.");
      }
    }
    if (!key) throw new WishlistSearchError(503, "Product search is not connected yet. You can still paste a product link or enter its details.");
    const url = new URL("https://www.searchapi.io/api/v1/search");
    url.searchParams.set("engine", category === "gifts" ? "amazon_search" : "google");
    url.searchParams.set("q", category === "gifts" ? query : `${query} (site:viator.com/tours/ OR site:klook.com/activity/)`);
    if (category === "gifts") {
      url.searchParams.set("amazon_domain", "amazon.com");
      url.searchParams.set("currency", "USD");
    } else {
      url.searchParams.set("gl", "us");
      url.searchParams.set("hl", "en");
    }
    try {
      const response = await (options.fetch ?? fetch)(url, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Provider unavailable.");
      const data = await response.json();
      if (data.error || data.search_metadata?.status === "Error") throw new Error("Provider unavailable.");
      return parseCatalogResults(data, category);
    } catch {
      throw new WishlistSearchError(502, "Search is temporarily unavailable. Try again or paste a product link.");
    }
  }
  return async (query: string, category: WishlistCategory = "all"): Promise<WishlistPreview[]> => {
    const q = query.trim().replace(/\s+/g, " ");
    if (q.length < 2 || q.length > 120) throw new WishlistSearchError(400, "Enter between 2 and 120 characters.");
    if (!["all", "gifts", "experiences"].includes(category)) throw new WishlistSearchError(400, "Invalid category.");
    // Configuration is checked before reading the cache: removed credentials
    // must not make a disconnected provider look healthy.
    const availability = wishlistDiscoveryCapabilities(options);
    const hasSearch = availability.giftsSearchAvailable;
    if (!hasSearch && (category === "gifts" || !availability.experiencesSearchAvailable)) throw new WishlistSearchError(503, "Product search is not connected yet. You can still paste a product link or enter its details.");
    const cacheKey = `${category}:${q.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.results.map(result => ({ ...result }));
    const existing = pending.get(cacheKey);
    if (existing) return (await existing).map(result => ({ ...result }));
    const task = (async () => {
      const results = category === "all" && !hasSearch
        ? await provider(q, "experiences")
        : category === "all"
        ? (await Promise.all([provider(q, "gifts"), provider(q, "experiences")])).flat()
        : await provider(q, category);
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(cacheKey, { expires: Date.now() + CACHE_TTL, results });
      return results;
    })();
    pending.set(cacheKey, task);
    try { return (await task).map(result => ({ ...result })); } finally { pending.delete(cacheKey); }
  };
}

export async function amazonProductPreview(input: string, options: SearchOptions = {}): Promise<WishlistPreview | undefined> {
  const key = options.key ?? process.env.SEARCHAPI_API_KEY;
  const original = productUrl(input);
  if (!key || platformFor(original.href) !== "Amazon") return undefined;
  const asin = original.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]?.toUpperCase();
  if (!asin) return undefined;
  try {
    const url = new URL("https://www.searchapi.io/api/v1/search");
    url.searchParams.set("engine", "amazon_product");
    url.searchParams.set("asin", asin);
    url.searchParams.set("amazon_domain", "amazon.com");
    const response = await (options.fetch ?? fetch)(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return undefined;
    const product = (await response.json()).product;
    if (!product?.title || product.asin?.toUpperCase() !== asin) return undefined;
    const price = cleanPrice(product.buybox?.price?.value);
    return {
      title: String(product.title).slice(0, 200), price,
      currency: product.buybox?.price?.currency || "", imageUrl: imageUrl(product.main_image),
      platform: "Amazon", url: original.href, priceTier: suggestWishlistPriceTier(price),
    };
  } catch { return undefined; }
}
