import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import express from "express";
import ts from "typescript";

import { APP_DYNAMIC_PATHS, APP_PATHS, isAppPath } from "../shared/app-paths.ts";
import { serveStatic } from "../server/static.ts";

async function listen(app: express.Express) {
  const server: Server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return { server, base: `http://127.0.0.1:${address.port}` };
}

test("serveStatic serves assets and limits the SPA shell to real GET/HEAD routes", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "spa-routing-"));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, "index.html"), "<!doctype html><title>APP SHELL</title>");
  await writeFile(path.join(directory, "assets", "app.js"), "window.APP = true;");
  t.after(() => rm(directory, { recursive: true, force: true }));

  const app = express();
  serveStatic(app, directory);
  const { server, base } = await listen(app);
  t.after(() => server.close());

  for (const pathname of ["/", "/settings", "/p/member-1", "/invite/code-1"]) {
    const get = await fetch(base + pathname);
    assert.equal(get.status, 200, pathname);
    assert.match(await get.text(), /APP SHELL/);

    const head = await fetch(base + pathname, { method: "HEAD" });
    assert.equal(head.status, 200, `HEAD ${pathname}`);
    assert.equal(await head.text(), "");
  }

  const asset = await fetch(base + "/assets/app.js");
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), "window.APP = true;");

  for (const pathname of ["/unknown", "/assets/missing.js", "/settings/extra"]) {
    const response = await fetch(base + pathname);
    assert.equal(response.status, 404, pathname);
    const body = await response.text();
    assert.doesNotMatch(body, /APP SHELL/);
    assert.match(body, /noindex/);
  }

  for (const pathname of ["/api/missing", "/api"]) {
    const response = await fetch(base + pathname);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { message: "Not Found" });
  }

  const post = await fetch(base + "/settings", { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  assert.doesNotMatch(await post.text(), /APP SHELL/);
});

test("SPA allowlist matches every top-level App route", async () => {
  const appFile = new URL("../client/src/App.tsx", import.meta.url).pathname;
  const source = await readFile(appFile, "utf8");
  const tree = ts.createSourceFile(appFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const routes = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningLikeElement(node) && node.tagName.getText(tree) === "Route") {
      const pathAttribute = node.attributes.properties.find(
        (attribute): attribute is ts.JsxAttribute =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === "path",
      );
      if (pathAttribute?.initializer && ts.isStringLiteral(pathAttribute.initializer)) {
        routes.add(pathAttribute.initializer.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);

  assert.deepEqual(
    [...routes].sort(),
    [...APP_PATHS, ...APP_DYNAMIC_PATHS].sort(),
    "Update shared/app-paths.ts whenever a top-level App route changes",
  );
  for (const route of routes) {
    assert.equal(isAppPath(route.replace(/:[^/]+/g, "example")), true, route);
  }
});