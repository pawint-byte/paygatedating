import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import express from "express";

import {
  createAmazonWishlistPreviewHandler,
  createPinnedLookup,
  isPublicIpAddress,
  normalizeAmazonProductUrl,
  normalizeAmazonWishlistUrl,
  parseAmazonWishlistHtml,
  previewAmazonWishlist,
  sameOriginAmazonWishlistRequest,
} from "../server/amazon-wishlist-import.ts";

test("pinned DNS supports Node's automatic-family and single-address lookups", async () => {
  const addresses = [
    { address: "54.239.28.85", family: 4 },
    { address: "2600:9000:2000::1", family: 6 },
  ];
  const lookup = createPinnedLookup(async () => addresses);
  const all = await new Promise((resolve, reject) => {
    lookup("www.amazon.com", { all: true }, (error, result) =>
      error ? reject(error) : resolve(result));
  });
  assert.deepEqual(all, addresses);
  const single = await new Promise((resolve, reject) => {
    lookup("www.amazon.com", {}, (error, address, family) =>
      error ? reject(error) : resolve({ address, family }));
  });
  assert.deepEqual(single, addresses[0]);
  const unsafe = createPinnedLookup(async () => [{ address: "127.0.0.1", family: 4 }]);
  await assert.rejects(new Promise((resolve, reject) => {
    unsafe("www.amazon.com", { all: true }, (error, result) =>
      error ? reject(error) : resolve(result));
  }), /non-public address/);
});

const SOURCE = "https://www.amazon.com/hz/wishlist/ls/SYNTHETIC123";
test("footer promotions and recommendations are never wishlist candidates", () => {
  const promotions = `<footer><a href="/dp/B012345678">Amazon Devices</a></footer>
    <aside data-asin="B012345679"><a href="/dp/B012345679">Recommended item</a></aside>`;
  assert.deepEqual(parseAmazonWishlistHtml(promotions).candidates, []);
  const listAndPromotions = `<div id="item_actual"><a href="/dp/B012345670">Actual item</a></div>${promotions}`;
  assert.deepEqual(parseAmazonWishlistHtml(listAndPromotions).candidates.map(item => item.id), ["B012345670"]);
});

const HTML = `
  <main>
    <div id="item_1">
      <a href="/dp/b012345678">
        <span id="itemName_1">Tea &amp; Mug <strong>with markup</strong></span>
        <img data-src="https://images-na.ssl-images-amazon.com/images/I/one.jpg?tag=ignored" alt="mug">
      </a>
      <span class="a-price">
        <span class="a-price-symbol">$</span>
        <span class="a-price-whole">12.</span>
        <span class="a-price-fraction">00</span>
        <span class="a-offscreen">$12.00</span>
      </span>
    </div>
    <div id="item_2">
      <a href="https://www.amazon.com/gp/product/B012345678?ref=duplicate">Duplicate</a>
      <span id="itemPrice_2">$12.00</span>
    </div>
    <a rel="next" href="/hz/wishlist/ls/SYNTHETIC123?page=2">Next</a>
  </main>
`;

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 as const }];

function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

test("Amazon contract normalizes only the two public Amazon.com wishlist paths", () => {
  assert.equal(
    normalizeAmazonWishlistUrl("https://www.amazon.com/hz/wishlist/ls/SYNTHETIC123?ref=share#items"),
    SOURCE,
  );
  assert.equal(
    normalizeAmazonWishlistUrl("https://amazon.com/gp/registry/wishlist/ABC_123"),
    "https://amazon.com/gp/registry/wishlist/ABC_123",
  );

  for (const value of [
    "http://www.amazon.com/hz/wishlist/ls/ABC",
    "https://amazon.com.evil.example/hz/wishlist/ls/ABC",
    "https://www.amazon.com:443/hz/wishlist/ls/ABC",
    "https://www.amazon.com@evil.example/hz/wishlist/ls/ABC",
    "https://www.amazon.com/hz/wishlist/ls/ABC/other",
    "https://www.amazon.com/dp/B012345678",
    "https://127.0.0.1/hz/wishlist/ls/ABC",
    "https://www.amazon.com/hz/wishlist/ls/A%2FB",
  ]) {
    assert.throws(() => normalizeAmazonWishlistUrl(value), /Amazon\.com wishlist URLs/);
  }
});

test("product and IP helpers reject unsafe destinations and canonicalize safe products", () => {
  assert.equal(
    normalizeAmazonProductUrl("https://www.amazon.com/gp/product/b012345678?tag=tracking"),
    "https://www.amazon.com/dp/B012345678",
  );
  assert.equal(normalizeAmazonProductUrl("https://evil.example/dp/B012345678"), "");
  assert.equal(normalizeAmazonProductUrl("http://www.amazon.com/dp/B012345678"), "");
  assert.equal(normalizeAmazonProductUrl("https://www.amazon.com/dp/B012345678:443"), "");

  assert.equal(isPublicIpAddress("93.184.216.34"), true);
  for (const ip of ["127.0.0.1", "10.0.0.4", "169.254.169.254", "192.168.1.10", "::1", "fd00::1"]) {
    assert.equal(isPublicIpAddress(ip), false, ip);
  }
});

test("parser handles entities, malformed markup, safe images, duplicates, and loaded-only warnings", () => {
  const parsed = parseAmazonWishlistHtml(HTML);
  assert.equal(parsed.candidates.length, 1);
  assert.deepEqual(parsed.candidates[0], {
    id: "B012345678",
    title: "Tea & Mug with markup",
    price: "12.00",
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/one.jpg",
    productUrl: "https://www.amazon.com/dp/B012345678",
  });
  assert.match(parsed.warnings.join(" "), /HTML.*pagination.*JavaScript/i);
  assert.match(parsed.warnings.join(" "), /Duplicate/i);

  const incomplete = parseAmazonWishlistHtml(`
    <div class="wishlist-item" data-item-id="local-entry">
      <span class="item-title">Visible title</span>
      <img src="https://not-amazon.example/item.jpg">
    </div>
  `);
  assert.deepEqual(incomplete.candidates[0], {
    id: "local-entry",
    title: "Visible title",
    price: "",
    imageUrl: "",
    productUrl: "",
  });
  assert.match(incomplete.warnings.join(" "), /complete title, price, image, and product URL/i);

  const nonUsd = parseAmazonWishlistHtml(`
    <div id="item_eur">
      <a href="/dp/C012345678"><span class="item-title">Imported item</span></a>
      <span class="a-price">
        <span class="a-price-symbol">€</span>
        <span class="a-price-whole">12.</span>
        <span class="a-price-fraction">00</span>
        <span class="a-offscreen">€12.00</span>
      </span>
    </div>
  `);
  assert.equal(nonUsd.candidates[0]?.price, "");
  assert.match(nonUsd.warnings.join(" "), /complete title, price, image, and product URL/i);
});

test("preview validates DNS, redirects, status, type, size, timeout, and no-items without live Amazon access", async () => {
  let fetchCalls = 0;
  const fetchOptions = { lookup: publicLookup, timeoutMs: 25 };
  const preview = await previewAmazonWishlist(SOURCE, {
    ...fetchOptions,
    fetch: async () => {
      fetchCalls += 1;
      return htmlResponse(HTML);
    },
  });
  assert.equal(preview.sourceUrl, SOURCE);
  assert.equal(preview.candidates.length, 1);
  assert.equal(fetchCalls, 1);

  fetchCalls = 0;
  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      lookup: async () => [{ address: "127.0.0.1", family: 4 as const }],
      fetch: async () => {
        fetchCalls += 1;
        return htmlResponse(HTML);
      },
    }),
    /non-public address/i,
  );
  assert.equal(fetchCalls, 0);

  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      fetch: async () => new Response("", {
        status: 302,
        headers: { location: "https://evil.example/hz/wishlist/ls/ABC" },
      }),
    }),
    /redirect was not allowed/i,
  );
  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      fetch: async () => new Response("forbidden", {
        status: 403,
        headers: { "content-type": "text/html" },
      }),
    }),
    /private or requires CAPTCHA/i,
  );
  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      fetch: async () => new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    }),
    /did not return HTML/i,
  );
  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      maxResponseBytes: 10,
      fetch: async () => htmlResponse(HTML),
    }),
    /too large/i,
  );
  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      fetch: async () => new Promise<Response>(() => undefined),
    }),
    /timed out/i,
  );
  await assert.rejects(
    previewAmazonWishlist(SOURCE, {
      ...fetchOptions,
      fetch: async () => htmlResponse("<html><body>No products here</body></html>"),
    }),
    /No wishlist items/i,
  );
});

test("preview handler enforces strict request JSON and route has auth/same-origin guard with no writes", async () => {
  const writes: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.post(
    "/api/registry/import-amazon/preview",
    (req, res, next) => {
      if (!req.headers["x-test-user"]) return res.status(401).json({ message: "Unauthorized" });
      next();
    },
    sameOriginAmazonWishlistRequest,
    createAmazonWishlistPreviewHandler({
      lookup: publicLookup,
      fetch: async () => htmlResponse(HTML),
    }),
  );
  app.post("/api/registry/import-amazon/write-sentinel", (_req, _res) => {
    writes.push(true);
  });

  const server: Server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const unauthorized = await fetch(`${base}/api/registry/import-amazon/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: SOURCE }),
    });
    assert.equal(unauthorized.status, 401);

    const crossOrigin = await fetch(`${base}/api/registry/import-amazon/preview`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user": "user",
        origin: "https://attacker.example",
      },
      body: JSON.stringify({ url: SOURCE }),
    });
    assert.equal(crossOrigin.status, 403);

    const strict = await fetch(`${base}/api/registry/import-amazon/preview`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": "user" },
      body: JSON.stringify({ url: SOURCE, extra: "reject" }),
    });
    assert.equal(strict.status, 400);
    assert.deepEqual(await strict.json(), {
      message: "Request must be strict JSON containing only a URL string",
    });

    const valid = await fetch(`${base}/api/registry/import-amazon/preview`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": "user" },
      body: JSON.stringify({ url: `${SOURCE}?from=frontend` }),
    });
    assert.equal(valid.status, 200);
    const body = await valid.json();
    assert.equal(body.sourceUrl, SOURCE);
    assert.equal(body.candidates.length, 1);
    assert.ok(Array.isArray(body.warnings));
    assert.deepEqual(writes, []);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
