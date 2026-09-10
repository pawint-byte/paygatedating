# Public FAQ delivery

`GET /faq` and `HEAD /faq` return HTTP 200 server-rendered HTML. Its body contains
the heading and all answers before any JavaScript runs. The server uses the current
application document for existing fonts, styles, icons, and analytics, replaces
homepage metadata/structured data, and removes the SPA module entry.

- Title: `FAQ | PayGate Dating`
- H1: `PayGate Dating FAQ`
- Canonical: `https://paygatedating.com/faq`
- Robots: `index,follow`
- JSON-LD: `FAQPage`, with exactly the same nine questions and answers as the body
- Sitemap: `public/sitemap.xml`
- `/FAQ`, `/help`, `/support`, `/questions`, and trailing-slash variants: HTTP 301 to `/faq`
- Signed-in operational feedback form: `/feedback` (previously `/help`)
- Unknown routes and missing assets: actual HTTP 404, no SPA homepage shell

## Copy sources and limits

The curated shared content in `shared/faq-content.ts` uses the existing
`client/src/components/landing/faq-section.tsx` and `pricing-section.tsx` copy.
The five standard chapter amounts are checked against `GATE_COSTS`.

The monthly-subscription answer describes the published pay-as-you-go journey,
not the removal of legacy subscription code. Stripe verification refers to
payment confirmation (the wallet verification route and signed webhooks), not
member identity or intentions. No new product capability or guaranteed relationship
outcome is asserted. Chapter fees and gift service charges explain sustainability.

## Verification

```sh
node --import tsx --test tests/*.test.ts
npm run check
npm run build
npx tsx script/verify-faq-seo.ts https://paygatedating.com
```

The last command runs only `curl` GET requests, reports status/title/canonical/H1
and JSON-LD evidence, and exits nonzero if any expectation fails. It also compares
homepage versus FAQ, checks the nonexistent-path 404, sitemap and all aliases.
Supply a development or isolated production-test base URL to check the same
contract before publishing. Such a pass does not prove that production has updated.

Existing legitimate browser routes are enumerated in `shared/app-paths.ts`; a test
compares them with `client/src/App.tsx` so new deep links do not silently become 404.
Static file middleware must stay before the route-aware SPA fallback.

No publishing or search indexing outcome should be inferred from a successful
local build. Confirm the Publish action, then rerun the live-domain command.