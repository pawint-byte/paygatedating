import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import vm from "node:vm";
import express from "express";
import ts from "typescript";

import {
  HEARD_VIA_VALUES,
  heardViaInputSchema,
} from "../shared/referral-source.ts";
import { insertProfileSchema } from "../shared/schema.ts";

type RouteMethod = "post" | "patch";

async function routeHandler(
  method: RouteMethod,
  path: string,
  bindings: Record<string, unknown>,
) {
  const fileName = new URL("../server/routes.ts", import.meta.url).pathname;
  const source = await readFile(fileName, "utf8");
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const found: ts.Expression[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(tree) === "app"
      && node.expression.name.text === method
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === path
    ) {
      found.push(node.arguments[node.arguments.length - 1]);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);

  assert.equal(found.length, 1, `Expected exactly one app.${method}(${path}) route expression`);
  const javascript = ts.transpileModule(`handler = (${found[0].getText(tree)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName,
  }).outputText;
  const context = vm.createContext({ ...bindings, console, handler: undefined });
  new vm.Script(javascript, { filename: `${fileName}:${method}:${path}` }).runInContext(context);
  assert.equal(typeof context.handler, "function", `Could not compile ${method} ${path} handler`);
  return context.handler as express.RequestHandler;
}

async function listen(app: express.Express) {
  const server: Server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    server,
    base: `http://127.0.0.1:${address.port}`,
  };
}

test("heard-via schema accepts only canonical values and validates Other details", () => {
  for (const heardVia of HEARD_VIA_VALUES) {
    const input = heardVia === "other"
      ? { heardVia, heardViaOther: "  A newsletter  " }
      : { heardVia };
    const parsed = heardViaInputSchema.safeParse(input);
    assert.equal(parsed.success, true, `${heardVia} should be accepted`);
  }

  for (const input of [
    {},
    { heardVia: "podcast" },
    { heardVia: "Other", heardViaOther: "newsletter" },
    { heardVia: "other" },
    { heardVia: "other", heardViaOther: "" },
    { heardVia: "other", heardViaOther: "   " },
  ]) {
    assert.equal(heardViaInputSchema.safeParse(input).success, false);
  }

  const other = heardViaInputSchema.parse({
    heardVia: "other",
    heardViaOther: "  Local meetup  ",
  });
  assert.equal(other.heardViaOther, "Local meetup");
});

test("PATCH /api/auth/heard-via authenticates, saves once, and cannot overwrite", async () => {
  const user = { id: "user-1", heardVia: null as string | null, heardViaOther: null as string | null };
  const updates: Array<{ heardVia: string; heardViaOther: string | null }> = [];
  const authStorage = {
    getUser: async (id: string) => id === user.id ? user : undefined,
    updateHeardVia: async (id: string, attribution: typeof updates[number]) => {
      assert.equal(id, user.id);
      updates.push({ ...attribution });
      Object.assign(user, attribution);
      return { ...user };
    },
  };
  const handler = await routeHandler("patch", "/api/auth/heard-via", {
    authStorage,
    heardViaInputSchema,
  });
  const app = express();
  app.use(express.json());
  app.patch("/api/auth/heard-via", (req: any, res, next) => {
    if (req.get("authorization") !== "Bearer test-session") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { claims: { sub: user.id } };
    next();
  }, handler);
  const { server, base } = await listen(app);
  const request = (body: unknown, authenticated = true) => fetch(`${base}/api/auth/heard-via`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? { authorization: "Bearer test-session" } : {}),
    },
    body: JSON.stringify(body),
  });

  try {
    const unauthorized = await request({ heardVia: "reddit" }, false);
    assert.equal(unauthorized.status, 401);
    assert.equal(updates.length, 0);

    const saved = await request({ heardVia: "other", heardViaOther: "  Local meetup  " });
    assert.equal(saved.status, 200);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].heardVia, "other");
    assert.equal(updates[0].heardViaOther, "Local meetup");

    const repeated = await request({ heardVia: "youtube" });
    assert.equal(repeated.status, 409);
    assert.equal(updates.length, 1);
    assert.equal(user.heardVia, "other");
    assert.equal(user.heardViaOther, "Local meetup");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("PATCH /api/auth/heard-via clears extraneous Other text for canonical non-Other values", async () => {
  const calls: any[] = [];
  const authStorage = {
    getUser: async () => ({ id: "user-2", heardVia: null, heardViaOther: null }),
    updateHeardVia: async (_id: string, attribution: unknown) => {
      calls.push(attribution);
      return attribution;
    },
  };
  const handler = await routeHandler("patch", "/api/auth/heard-via", {
    authStorage,
    heardViaInputSchema,
  });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { claims: { sub: "user-2" } };
    next();
  });
  app.patch("/api/auth/heard-via", handler);
  const { server, base } = await listen(app);

  try {
    const response = await fetch(`${base}/api/auth/heard-via`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ heardVia: "friend", heardViaOther: "must not persist" }),
    });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].heardVia, "friend");
    assert.equal(calls[0].heardViaOther, null);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("profile PATCH strips heardVia and profile creation retains referralCode handling", async () => {
  const updates: any[] = [];
  const handler = await routeHandler("patch", "/api/profile", {
    insertProfileSchema,
    storage: {
      updateProfile: async (_id: string, update: unknown) => {
        updates.push(update);
        return update;
      },
    },
  });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { claims: { sub: "user-3" } };
    next();
  });
  app.patch("/api/profile", handler);
  const { server, base } = await listen(app);

  try {
    const response = await fetch(`${base}/api/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Updated", heardVia: "reddit" }),
    });
    assert.equal(response.status, 200);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].displayName, "Updated");
    assert.equal(Object.hasOwn(updates[0], "heardVia"), false);
  } finally {
    server.close();
    await once(server, "close");
  }

  const routesSource = await readFile(new URL("../server/routes.ts", import.meta.url), "utf8");
  const tree = ts.createSourceFile("server/routes.ts", routesSource, ts.ScriptTarget.Latest, true);
  let referralCodeReadInProfilePost = false;
  const visit = (node: ts.Node, insideProfilePost = false) => {
    const isProfilePost = ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(tree) === "app"
      && node.expression.name.text === "post"
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === "/api/profile";
    const inside = insideProfilePost || isProfilePost;
    if (
      inside
      && ts.isPropertyAccessExpression(node)
      && node.getText(tree) === "req.body.referralCode"
    ) {
      referralCodeReadInProfilePost = true;
    }
    ts.forEachChild(node, child => visit(child, inside));
  };
  visit(tree);
  assert.equal(referralCodeReadInProfilePost, true);
});