import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import express from "express";
import { insertRegistryItemSchema } from "../shared/schema";
import { suggestWishlistPriceTier } from "../shared/wishlist-discovery";
import { createPreviewScraper, parseProductPage, productUrl, publicAddress, robotsPolicy } from "../server/lib/wishlist-preview";
import { amazonProductPreview, createWishlistSearch, parseCatalogResults, WishlistSearchError } from "../server/lib/wishlist-search";
import { registerWishlistDiscovery } from "../server/wishlist-discovery";
import { previewViator, searchViator } from "../server/lib/viator-wishlist";

const amazon = "https://www.amazon.com/dp/B0CGCMS31N";
const viator = "https://www.viator.com/tours/New-York-City/Jazz/d687-123P1";
const product = `<title>Fallback</title><meta content="Earbuds &amp; Case" property="og:title">
  <meta property="og:image" content="https://images.example.com/buds.jpg">
  <script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Earbuds","offers":{"@type":"Offer","price":"49.99","priceCurrency":"USD"}}]}</script>`;

test("price-tier suggestions use the exact 50 and 100 dollar boundaries", () => {
  assert.equal(suggestWishlistPriceTier("49.99"), "starter");
  assert.equal(suggestWishlistPriceTier("50.00"), "impressive");
  assert.equal(suggestWishlistPriceTier("99.99"), "impressive");
  assert.equal(suggestWishlistPriceTier("100.00"), "vip");
});
test("parser decodes OG attributes and nested JSON-LD offers without unrelated price guesses", () => {
  const result = parseProductPage(product + `<p>Shipping $2.00, recommended item $999.00</p>`, amazon);
  assert.equal(result.title, "Earbuds & Case");
  assert.equal(result.price, "49.99");
  assert.equal(result.currency, "USD");
  assert.equal(result.platform, "Amazon");
  assert.equal(result.priceTier, "starter");
  assert.equal(result.imageUrl, "https://images.example.com/buds.jpg");
});
test("experience parser accepts aggregate offers, image objects, and preserves foreign currency", () => {
  const result = parseProductPage(`<script type="application/ld+json">[{"@type":"TouristTrip","name":"Jazz Tour","image":{"url":"/jazz.jpg"},"offers":[{"@type":"AggregateOffer","lowPrice":100,"priceCurrency":"EUR"}]}]</script>`, viator);
  assert.equal(result.title, "Jazz Tour");
  assert.equal(result.imageUrl, "https://www.viator.com/jazz.jpg");
  assert.equal(result.price, "100.00");
  assert.equal(result.currency, "EUR");
  assert.equal(result.priceTier, "vip");
});
test("title fallback works; malformed JSON and CAPTCHA do not fabricate product prices", () => {
  const result = parseProductPage(`<title>Real &amp; Product</title><script type="application/ld+json">{oops}</script><p>$123 shipping</p>`, amazon);
  assert.equal(result.title, "Real & Product");
  assert.equal(result.price, "");
  assert.equal(parseProductPage("<title>Robot Check</title>", amazon).error, "unavailable");
});
test("URL and IP checks reject private, credentialed, insecure, and alternate-port destinations", () => {
  for (const input of ["http://example.com/product", "https://127.0.0.1/", "https://[::1]/", "https://user:pass@example.com/", "https://example.com:8443/", "https://metadata.internal/"]) {
    assert.throws(() => productUrl(input));
  }
  for (const address of ["127.0.0.1", "10.1.1.1", "169.254.169.254", "100.64.0.1", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1"]) assert.equal(publicAddress(address), false, address);
  assert.equal(publicAddress("8.8.8.8"), true);
  assert.equal(publicAddress("2606:4700:4700::1111"), true);
  assert.equal(productUrl(amazon).href, amazon);
});
test("robots policy honors exact agent, wildcard, allow precedence, and crawl delay", () => {
  const policy = "User-agent: *\nDisallow: /private\nAllow: /private/public$\nCrawl-delay: 3";
  assert.equal(robotsPolicy(policy, "/private/item").allowed, false);
  assert.equal(robotsPolicy(policy, "/private/public").allowed, true);
  assert.equal(robotsPolicy(policy, "/private/public/child").allowed, false);
  assert.equal(robotsPolicy(policy, "/open").delay, 3);
  assert.equal(robotsPolicy("User-agent: *\nDisallow: /\nUser-agent: PayGateWishlistBot\nAllow: /", "/product").allowed, true);
});
test("mock HTTP scraper caches results and coalesces concurrent requests", async () => {
  const calls: string[] = [];
  const scrape = createPreviewScraper(async url => {
    calls.push(url.pathname);
    return { status: 200, headers: { "content-type": "text/html" }, body: url.pathname === "/robots.txt" ? "User-agent: *\nAllow: /" : product };
  });
  const [first, second] = await Promise.all([scrape(amazon), scrape(amazon)]);
  assert.deepEqual(first, second);
  assert.equal(first.price, "49.99");
  await scrape(amazon);
  assert.deepEqual(calls, ["/robots.txt", "/dp/B0CGCMS31N"]);
});
test("mock HTTP scraper obeys robots, rejects unsafe redirects, and keeps failures editable", async () => {
  const blocked: string[] = [];
  const scrape = createPreviewScraper(async url => {
    blocked.push(url.pathname);
    return { status: 200, headers: {}, body: "User-agent: *\nDisallow: /" };
  });
  assert.equal((await scrape(viator)).error, "unavailable");
  assert.deepEqual(blocked, ["/robots.txt"]);
  const redirect = createPreviewScraper(async url => url.pathname === "/robots.txt"
    ? { status: 404, headers: {}, body: "" }
    : { status: 302, headers: { location: "https://127.0.0.1/" }, body: "" });
  assert.equal((await redirect(amazon)).error, "unavailable");
});
test("catalog normalizer filters counterfeit hosts, nonproducts, unsupported retailers, and duplicates", () => {
  const row = { title: "Earbuds", link: amazon, extracted_price: 50, thumbnail: "https://images.example.com/buds.jpg" };
  const results = parseCatalogResults({ organic_results: [row, row, { ...row, link: "https://amazon.com.evil.com/dp/B0CGCMS31N" }, { ...row, link: "https://www.amazon.com/" }] }, "gifts");
  assert.equal(results.length, 1);
  assert.equal(results[0].price, "50.00");
  assert.equal(results[0].priceTier, "impressive");
});
test("search uses mocked provider HTTP, caches queries, never exposes credentials or provider internals", async () => {
  const calls: URL[] = [];
  const search = createWishlistSearch({ key: "synthetic", fetch: (async (url: URL, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer synthetic");
    calls.push(url);
    return Response.json({ organic_results: [{ title: "Earbuds", link: amazon, extracted_price: 25, thumbnail: "https://images.example.com/buds.jpg" }], search_metadata: { html_url: "private provider page" } });
  }) as typeof fetch });
  const results = await search("earbuds", "gifts");
  assert.equal(calls[0].searchParams.get("engine"), "amazon_search");
  assert.equal(calls[0].searchParams.has("api_key"), false);
  assert.equal(results[0].price, "25.00");
  assert.equal(JSON.stringify(results).includes("private provider page"), false);
  await search("EARBUDS", "gifts");
  assert.equal(calls.length, 1);
  await assert.rejects(() => search("x", "gifts"), (error: any) => error.status === 400);
});
test("missing or failing search provider returns truthful failures, not fake catalog results", async () => {
  await assert.rejects(() => createWishlistSearch({ key: "", viatorKey: "" })("earbuds"), (error: any) => error.status === 503);
  await assert.rejects(() => createWishlistSearch({ key: "synthetic", fetch: (async () => new Response("no", { status: 429 })) as typeof fetch })("earbuds"), (error: any) => error.status === 502);
});
test("Amazon product provider requires the exact requested ASIN and uses current buybox amount", async () => {
  const fetcher = (async () => Response.json({ product: { asin: "B0CGCMS31N", title: "Phone case", main_image: "https://images.example.com/case.jpg", buybox: { price: { value: 23.56, currency: "USD" } } } })) as typeof fetch;
  const preview = await amazonProductPreview(amazon, { key: "synthetic", fetch: fetcher });
  assert.equal(preview?.price, "23.56");
  assert.equal(preview?.url, amazon);
  assert.equal(await amazonProductPreview("https://www.amazon.com/dp/B000000000", { key: "synthetic", fetch: fetcher }), undefined);
});
test("official Viator search uses USD pricing and resolves real product URLs without inventing links", async () => {
  const calls: string[] = [];
  const options = { key: "synthetic", fetch: (async (input: string, init: RequestInit) => {
    calls.push(input);
    assert.equal(new Headers(init.headers).get("exp-api-key"), "synthetic");
    if (input.endsWith("/search/freetext")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.searchTypes[0].searchType, "PRODUCTS");
      assert.equal(body.currency, "USD");
      return Response.json({ products: { results: [{ productCode: "123P1", title: "Jazz Tour", pricing: { currency: "USD", summary: { fromPrice: 100 } } }] } });
    }
    return Response.json({ productCode: "123P1", title: "Jazz Tour", productUrl: viator, images: [{ isCover: true, variants: [{ width: 800, url: "https://images.example.com/tour.jpg" }] }] });
  }) as typeof fetch };
  const results = await searchViator("jazz tour", options);
  assert.equal(calls.length, 2);
  assert.equal(results[0].url, viator);
  assert.equal(results[0].currency, "USD");
  assert.equal(results[0].price, "100.00");
  assert.equal(results[0].priceTier, "vip");
  assert.equal(results[0].imageUrl, "https://images.example.com/tour.jpg");
});
test("Viator preview matches product code, uses schedule fromPrice, and keeps currency explicit", async () => {
  const options = { key: "synthetic", fetch: (async (input: string) => Response.json(input.includes("/availability/")
    ? { productCode: "123P1", currency: "AUD", summary: { fromPrice: 76.22 } }
    : { productCode: "123P1", title: "Jazz Tour", images: [{ isCover: true, variants: [{ width: 800, url: "https://images.example.com/tour.jpg" }] }] })) as typeof fetch };
  const result = await previewViator(viator, options);
  assert.equal(result?.title, "Jazz Tour");
  assert.equal(result?.price, "76.22");
  assert.equal(result?.currency, "AUD");
  assert.equal(result?.url, viator);
  assert.equal(await previewViator("https://www.viator.com/tours/Sydney/Tour/d357-999P1", options), undefined);
});
test("connected native Viator catalog takes precedence without requiring generic search credentials", async () => {
  let calls = 0;
  const search = createWishlistSearch({ key: "", viatorKey: "synthetic", fetch: (async (input: string) => {
    assert.ok(input.startsWith("https://api.viator.com/partner/"));
    calls++;
    return Response.json({ products: { results: [{ productCode: "123P1", productUrl: viator, title: "Jazz Tour", pricing: { currency: "USD", summary: { fromPrice: 50 } } }] } });
  }) as typeof fetch });
  assert.equal((await search("jazz", "experiences"))[0].price, "50.00");
  assert.equal(calls, 1);
  await assert.rejects(() => search("earbuds", "gifts"), (error: any) => error.status === 503);
});
test("discovery endpoints enforce auth, validate queries, preserve response shape, and rate-limit", async () => {
  const app = express();
  app.use(express.json());
  registerWishlistDiscovery(app, (req: any, res, next) => {
    if (!req.headers["x-test-user"]) { res.sendStatus(401); return; }
    req.user = { claims: { sub: req.headers["x-test-user"] } }; next();
  }, {
    search: async (q, category) => {
      if (q === "blocked") throw new WishlistSearchError(503, "Product search is not connected yet.");
      assert.equal(category, "gifts"); return [parseProductPage(product, amazon)];
    },
    preview: async url => parseProductPage(product, url),
  });
  const server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const headers = { "x-test-user": "discovery-test", "Content-Type": "application/json" };
  try {
    assert.equal((await fetch(`${base}/api/wishlist/search?q=earbuds`)).status, 401);
    assert.equal((await fetch(`${base}/api/wishlist/search?q=x`, { headers })).status, 400);
    const search = await fetch(`${base}/api/wishlist/search?q=earbuds&category=gifts`, { headers });
    assert.equal(search.headers.get("Cache-Control"), "no-store");
    assert.equal((await search.json()).results[0].title, "Earbuds & Case");
    assert.equal((await fetch(`${base}/api/wishlist/search?q=blocked&category=gifts`, { headers })).status, 503);
    const preview = await fetch(`${base}/api/wishlist/preview`, { method: "POST", headers, body: JSON.stringify({ url: amazon }) });
    assert.equal((await preview.json()).price, "49.99");
    assert.equal((await fetch(`${base}/api/wishlist/preview`, { method: "POST", headers, body: JSON.stringify({ url: "https://127.0.0.1/" }) })).status, 400);
    for (let i = 0; i < 15; i++) await fetch(`${base}/api/wishlist/search?q=earbuds&category=gifts`, { headers });
    const limited = await fetch(`${base}/api/wishlist/search?q=earbuds&category=gifts`, { headers });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("Retry-After"));
  } finally { server.close(); await once(server, "close"); }
});

test("actual registry handler saves manual public links but rejects unsafe URLs and ignores submitted ownership", async () => {
  const content = readFileSync("server/routes.ts", "utf8");
  const source = ts.createSourceFile("routes.ts", content, ts.ScriptTarget.ES2020, true);
  let expression: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "app.post" &&
        ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "/api/registry") {
      expression = node.arguments[node.arguments.length - 1];
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(expression);
  const writes: any[] = [];
  const handler = vm.runInNewContext(ts.transpileModule(`(${expression!.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    productUrl, URL, console, insertRegistryItemSchema,
    addAffiliateTag: (url: string) => url,
    convertViatorToAffiliate: async (url: string) => url,
    storage: { createRegistryItem: async (data: any) => { writes.push(data); return { ...data, id: "qa-isolated-item" }; } },
  });
  const app = express();
  app.use(express.json());
  app.post("/api/registry", (req: any, _res, next) => { req.user = { claims: { sub: "qa-isolated-owner" } }; next(); }, handler);
  const server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const item = { title: "Manual public product", affiliateUrl: "https://example.com/product/qa", price: "25.00", priceTier: "starter", visibility: "matches_only", userId: "not-the-owner" };
  const post = (body: any) => fetch(`${base}/api/registry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    const saved = await post(item);
    assert.equal(saved.status, 201);
    assert.equal((await saved.json()).affiliateUrl, item.affiliateUrl);
    assert.equal(writes[0].userId, "qa-isolated-owner");
    assert.equal(writes[0].visibility, "matches_only");
    for (const affiliateUrl of ["http://example.com/", "https://127.0.0.1/", "https://user:pass@example.com/"]) {
      assert.equal((await post({ ...item, affiliateUrl })).status, 400);
    }
    assert.equal(writes.length, 1);
  } finally { server.close(); await once(server, "close"); }
});
