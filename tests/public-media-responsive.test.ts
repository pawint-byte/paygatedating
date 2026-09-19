import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import test from "node:test";
import express from "express";

async function serveDirectory(directory: string) {
  const app = express();
  app.use(express.static(directory));
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    server,
    base: `http://127.0.0.1:${address.port}`,
  };
}

for (const directory of ["client/public", "dist/public"]) {
  test(`${directory} serves homepage video metadata and byte ranges`, async (t) => {
    const { server, base } = await serveDirectory(directory);
    t.after(() => server.close());

    const head = await fetch(`${base}/videos/promo-female.mp4`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-type"), "video/mp4");
    assert.equal(head.headers.get("accept-ranges"), "bytes");
    assert.ok(Number(head.headers.get("content-length")) > 1_000_000);

    const range = await fetch(`${base}/videos/promo-female.mp4`, {
      headers: { Range: "bytes=0-1023" },
    });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get("content-type"), "video/mp4");
    assert.match(range.headers.get("content-range") ?? "", /^bytes 0-1023\/[1-9]\d+$/);
    assert.equal((await range.arrayBuffer()).byteLength, 1024);
  });
}

test("hero declares the MP4 MIME type and bypasses stale media cache entries", () => {
  const hero = readFileSync("client/src/components/landing/seasonal-hero.tsx", "utf8");
  assert.match(hero, /<source src=\{promoVideos\[currentVideo\]\.src\} type="video\/mp4"/);
  assert.match(hero, /promo-female\.mp4\?v=\d+/);
  assert.match(hero, /preload="metadata"/);
});

test("mobile banner, header, and section navigation wrap without horizontal clipping", () => {
  const banner = readFileSync("client/src/components/landing/seasonal-banner.tsx", "utf8");
  const header = readFileSync("client/src/components/landing/nav-header.tsx", "utf8");
  const landing = readFileSync("client/src/pages/landing.tsx", "utf8");

  assert.match(banner, /flex flex-wrap/);
  assert.match(banner, /min-w-0/);
  assert.match(header, /sticky top-0/);
  assert.doesNotMatch(header, /fixed top-0/);
  assert.match(header, /sm:hidden">Start/);
  assert.match(landing, /flex flex-wrap justify-center gap-1/);
  assert.doesNotMatch(landing, /overflow-x-auto/);
});