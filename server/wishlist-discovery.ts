import type { Express, RequestHandler } from "express";
import type { WishlistCategory, WishlistPreview } from "../shared/wishlist-discovery";
import { createPreviewScraper, productUrl } from "./lib/wishlist-preview";
import { amazonProductPreview, createWishlistSearch, WishlistSearchError } from "./lib/wishlist-search";
import { previewViator } from "./lib/viator-wishlist";

type Dependencies = {
  search?: (query: string, category: WishlistCategory) => Promise<WishlistPreview[]>;
  preview?: (url: string) => Promise<WishlistPreview>;
};
export function registerWishlistDiscovery(app: Express, authenticated: RequestHandler, dependencies: Dependencies = {}) {
  const scrape = createPreviewScraper();
  const search = dependencies.search ?? createWishlistSearch();
  const previews = new Map<string, { expires: number; data: WishlistPreview }>();
  const preview = dependencies.preview ?? (async (url: string) => {
    const cached = previews.get(url);
    if (cached && cached.expires > Date.now()) return { ...cached.data };
    const viator = process.env.VIATOR_API_KEY
      ? await previewViator(url, { key: process.env.VIATOR_API_KEY }) : undefined;
    const data = viator ?? await amazonProductPreview(url) ?? await scrape(url);
    if (previews.size >= 500) previews.delete(previews.keys().next().value!);
    previews.set(url, { expires: Date.now() + (data.error ? 60000 : 900000), data });
    return data;
  });
  const requests = new Map<string, { start: number; count: number }>();
  const limit: RequestHandler = (req: any, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const identity = req.user?.claims?.sub;
    if (!identity) { res.sendStatus(401); return; }
    const key = `${identity}:${req.path}`;
    const now = Date.now();
    let record = requests.get(key);
    if (!record || now - record.start >= 60000) {
      if (requests.size >= 10000) {
        requests.forEach((value, entry) => { if (now - value.start >= 60000) requests.delete(entry); });
        if (requests.size >= 10000) { res.status(503).json({ message: "Please try again shortly." }); return; }
      }
      record = { start: now, count: 0 }; requests.set(key, record);
    }
    if (++record.count > 15) {
      res.setHeader("Retry-After", String(Math.ceil((record.start + 60000 - now) / 1000)));
      res.status(429).json({ message: "Please wait a minute before trying again." }); return;
    }
    next();
  };
  app.get("/api/wishlist/search", authenticated, limit, async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category : "all";
    if (query.length < 2 || query.length > 120 || !["all", "gifts", "experiences"].includes(category)) {
      res.status(400).json({ message: "Enter a valid category and a search between 2 and 120 characters." }); return;
    }
    try {
      res.json({
        results: await search(query, category as WishlistCategory),
        ...(category === "all" && !dependencies.search && process.env.VIATOR_API_KEY && !process.env.SEARCHAPI_API_KEY
          ? { message: "Experience results are available. Gift search is not connected yet." } : {}),
      });
    }
    catch (error) {
      res.status(error instanceof WishlistSearchError ? error.status : 502).json({
        message: error instanceof WishlistSearchError ? error.message : "Search is temporarily unavailable. You can still paste a product link.",
      });
    }
  });
  app.post("/api/wishlist/preview", authenticated, limit, async (req, res) => {
    let url: string;
    try {
      if (typeof req.body?.url !== "string") throw new Error("Missing URL.");
      url = productUrl(req.body.url).href;
    } catch {
      res.status(400).json({ message: "Enter a public HTTPS product link." }); return;
    }
    try { res.json(await preview(url)); }
    catch { res.status(502).json({ message: "Could not load this item. You can enter the details manually." }); }
  });
}
