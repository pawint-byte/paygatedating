# PayGate Dating — Wishlist "Scrape & Save" Build Spec

Date: 2026-10-11
Owner: Peter Andrew Wint
Status: Approved for development only. Nothing to production without Peter's explicit approval.

## Problem
Adding a wishlist item today forces the member to leave paygatedating.com, browse Amazon/Viator/Klook in another tab, copy a URL, come back, and paste it. Too much friction — members won't build wishlists, and empty wishlists kill the gifting loop.

Peter's directive: **"Kinda like Amazon scrape and save"** — the member searches or browses, picks what they want, and the URL/details save automatically.

## Feature A — In-dialog search (primary)
In the "Add Wishlist Item" dialog, add a search field at the top:

1. Member types a query ("wireless earbuds", "jazz club NYC", "city pass").
2. Server-side endpoint (e.g. `GET /api/wishlist/search?q=...`) searches partner catalogs and returns results: image, name, price, source, product URL.
3. Member clicks "Add" on a result → item is created with name, price, image, and URL auto-filled. Member can edit name/price/description and set visibility before confirming.
4. Price Tier auto-suggests from the price (Starter < $50, Impressive $50–$100, VIP $100+).

Data sources (in priority order):
- Existing affiliate/partner feeds first: Amazon (Product Advertising API), Viator, Klook.
- If partner APIs aren't available, use a server-side product search API as fallback.
- Keep the current partner browse buttons ("Shopping", "Travel Experiences", etc.) as a secondary path.

## Feature B — Paste-URL scrape & save (robust)
Keep the "paste a URL" path, but make the auto-fill actually work:

1. Member pastes any product/experience URL.
2. Server fetches the page and extracts: Open Graph tags (`og:title`, `og:image`), JSON-LD `offers` (price, currency), and `<title>` as fallback.
3. Show a preview card (image, title, price) for the member to confirm or edit before saving.
4. If scraping fails, fall back to the current manual-entry fields — never a dead end.
5. Respect robots/rate limits; cache scrapes server-side; never expose scraping internals to the client.

## Requirements
- Additive-only. Do not change the existing wishlist item schema in a breaking way; extend it if needed (e.g. `source`, `scrapedAt`).
- Works for both Gifts and Experiences categories.
- Existing items (including the 8 already on Peter's wishlist) must keep rendering exactly as before.
- `npm run check` clean; add unit tests for the search endpoint and the scraper's parsers (mock HTTP).
- Test end-to-end in the Replit preview: search → add → item appears on wishlist; paste URL → preview → save.
- No production publish without Peter's explicit approval.

## Acceptance
1. From the wishlist, a member can search, pick a result, and save it without ever leaving the site or touching a URL.
2. Pasting a real Amazon and a real Viator URL both produce a correct preview (name, image, price).
3. A URL that can't be scraped still saves via manual fields.
4. Price Tier pre-selects correctly from scraped/searched prices.
5. All existing wishlist tests still pass; new tests cover search + scraper.
