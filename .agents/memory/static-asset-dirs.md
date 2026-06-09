---
name: Static asset directories
description: Where static/SEO files live and how they are served, to avoid editing the wrong public dir
---

# Two separate public directories

This project serves static files from TWO distinct locations — editing the wrong one means changes never appear.

- `public/` (repo root) — served by Express `express.static(process.cwd()/"public")` in both dev and prod. Holds SEO/runtime files: `robots.txt`, `sitemap.xml`, `manifest.json`, `og-image.png`, `sw.js`, `maintenance.html`.
- `client/public/` — served by Vite (dev) and copied into the build output (prod). Holds front-end assets: logos/icons, the Google verification HTML, etc.

**Why:** an explore subagent once reported `robots.txt`/`sitemap.xml`/`manifest.json` as living in `client/public` — they don't; they're in root `public/`. Verify with `curl localhost:5000/<file>` (checks actual served content, not SPA fallback) before assuming a file is missing.

**How to apply:** SEO/crawler files → root `public/`. Icons/images referenced by `/path` → either works at runtime since both dirs map to `/`, but keep front-end assets in `client/public` and put a copy in root `public/` if a root-served file (e.g. manifest.json) references them.

# Canonical domain
Canonical/OG/sitemap base URL is hard-coded to `https://paygatedating.com` (in `client/index.html` and `client/src/components/seo.tsx` SITE_URL). This is the intended public brand domain (Google Search Console verified). If the deploy is NOT reachable at that domain, canonical tags will point off-host and suppress indexing — confirm the custom domain is connected before relying on it.
