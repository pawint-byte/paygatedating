import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import vm from "node:vm";
import express from "express";
import ts from "typescript";

import {
  serializeGiftPurchase,
  serializeGiftRegistryItem,
} from "../server/gift-privacy.ts";

const buyerId = "gift-privacy-buyer";
const recipientId = "gift-privacy-recipient";
const strangerId = "gift-privacy-stranger";
const giftId = "gift-privacy-id";
const registryItemId = "gift-privacy-item";
const deliveryAddress = "742 Evergreen Terrace, Springfield, ZZ 12345";
const deliveryName = "Recipient Private Name";

const statuses = [
  "pending",
  "fee_paid",
  "address_provided",
  "link_clicked",
  "purchase_confirmed",
  "delivered",
  "refunded",
  "purchased",
  "shipped",
  "claimed",
] as const;

type GiftState = {
  purchase: any;
  registryItem: any;
  profiles: Map<string, any>;
  updates: any[];
  registryUpdates: any[];
  matchUpdates: any[];
};

function createState(status: string = "address_provided"): GiftState {
  const purchase = {
    id: giftId,
    buyerUserId: buyerId,
    recipientUserId: recipientId,
    registryItemId,
    matchId: null,
    giftValue: "50.00",
    platformFee: "5.00",
    affiliateCommission: null,
    status,
    gatesUnlocked: 0,
    claimDeadline: null,
    stripeSessionId: "session-private",
    deliveryAddress,
    deliveryAddressType: "home",
    deliveryName,
    affiliateLinkClicked: status === "link_clicked" || status === "purchase_confirmed",
    affiliateClickedAt: null,
    purchaseConfirmedAt: null,
    orderTrackingInfo: null,
    deliveryConfirmedAt: null,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  };

  const profiles = new Map([
    [buyerId, { userId: buyerId, displayName: "Buyer Example" }],
    [recipientId, { userId: recipientId, displayName: "Recipient Example" }],
  ]);

  return {
    purchase,
    registryItem: {
      id: registryItemId,
      title: "A private gift",
      price: "50.00",
      imageUrl: "https://example.test/gift.png",
      affiliateUrl: "https://www.amazon.com/dp/B000000000",
    },
    profiles,
    updates: [],
    registryUpdates: [],
    matchUpdates: [],
  };
}

function bindingsFor(state: GiftState, stripe?: any) {
  const storage = {
    getGiftPurchase: async (id: string) => id === giftId ? state.purchase : undefined,
    getGiftPurchaseBySessionId: async (id: string) =>
      id === state.purchase.stripeSessionId ? state.purchase : undefined,
    getGiftPurchasesByBuyer: async (id: string) =>
      id === buyerId ? [state.purchase] : [],
    getGiftPurchasesByRecipient: async (id: string) =>
      id === recipientId ? [state.purchase] : [],
    getProfile: async (id: string) => state.profiles.get(id),
    getRegistryItem: async (id: string) =>
      id === registryItemId ? state.registryItem : undefined,
    updateGiftPurchase: async (_id: string, patch: any) => {
      state.updates.push(patch);
      state.purchase = { ...state.purchase, ...patch };
      return state.purchase;
    },
    createGiftPurchase: async (input: any) => {
      state.purchase = { ...state.purchase, ...input };
      return state.purchase;
    },
    updateRegistryItem: async (_id: string, patch: any) => {
      state.registryUpdates.push(patch);
      return state.registryItem;
    },
    updateMatch: async (_id: string, patch: any) => {
      state.matchUpdates.push(patch);
      return patch;
    },
    getMatch: async () => undefined,
  };

  return {
    storage,
    serializeGiftPurchase,
    serializeGiftRegistryItem,
    isValidAffiliateUrl: (url: string | undefined | null) => ({
      valid: typeof url === "string" && url.includes("amazon.com"),
    }),
    getUncachableStripeClient: async () => stripe || {
      checkout: {
        sessions: {
          retrieve: async () => ({
            payment_status: "paid",
            metadata: {
              type: "gift_purchase",
              buyerUserId,
            },
          }),
        },
      },
      refunds: { create: async () => { throw new Error("refund must not be called"); } },
    },
  };
}

async function routeHandler(
  method: "get" | "post",
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
  assert.equal(found.length, 1, `Expected exactly one app.${method}(${path}) route`);
  const javascript = ts.transpileModule(`handler = (${found[0].getText(tree)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName,
  }).outputText;
  const context = vm.createContext({ ...bindings, console, handler: undefined });
  new vm.Script(javascript, { filename: `${fileName}:${method}:${path}` }).runInContext(context);
  assert.equal(typeof context.handler, "function");
  return context.handler as express.RequestHandler;
}

async function listen(app: express.Express) {
  const server: Server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return { server, base: `http://127.0.0.1:${address.port}` };
}

async function giftApp(state: GiftState, includeMutations = false, stripe?: any) {
  const bindings = () => bindingsFor(state, stripe);
  const handlers = {
    success: await routeHandler(
      "get",
      "/api/gifts/checkout/success",
      bindings(),
    ),
    sent: await routeHandler("get", "/api/gifts/sent", bindings()),
    received: await routeHandler("get", "/api/gifts/received", bindings()),
    details: await routeHandler("get", "/api/gifts/:id/details", bindings()),
    provideAddress: await routeHandler(
      "post",
      "/api/gifts/:id/provide-address",
      bindings(),
    ),
  };
  if (includeMutations) {
    Object.assign(handlers, {
      track: await routeHandler(
        "post",
        "/api/gifts/:id/track-affiliate-click",
        bindings(),
      ),
      confirmPurchase: await routeHandler(
        "post",
        "/api/gifts/:id/confirm-purchase",
        bindings(),
      ),
      confirmDelivery: await routeHandler(
        "post",
        "/api/gifts/:id/confirm-delivery",
        bindings(),
      ),
      revoke: await routeHandler(
        "post",
        "/api/gifts/:id/revoke",
        bindings(),
      ),
    });
  }

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { claims: { sub: req.header("x-user") || strangerId } };
    next();
  });
  app.get("/api/gifts/checkout/success", handlers.success);
  app.get("/api/gifts/sent", handlers.sent);
  app.get("/api/gifts/received", handlers.received);
  app.get("/api/gifts/:id/details", handlers.details);
  app.post("/api/gifts/:id/provide-address", handlers.provideAddress);
  if (includeMutations) {
    app.post("/api/gifts/:id/track-affiliate-click", handlers.track);
    app.post("/api/gifts/:id/confirm-purchase", handlers.confirmPurchase);
    app.post("/api/gifts/:id/confirm-delivery", handlers.confirmDelivery);
    app.post("/api/gifts/:id/revoke", handlers.revoke);
  }
  return listen(app);
}

async function request(
  base: string,
  userId: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-user": userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

function assertBuyerSafe(body: unknown) {
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes(deliveryAddress), false);
  assert.equal(serialized.includes(deliveryName), false);
  assert.equal(serialized.includes("stripeSessionId"), false);
}

test("gift DTOs explicitly omit recipient shipping data from buyer responses", () => {
  const purchase = createState().purchase;
  const buyer = serializeGiftPurchase(purchase, "buyer");
  const recipient = serializeGiftPurchase(purchase, "recipient");

  assert.equal(Object.hasOwn(buyer, "deliveryAddress"), false);
  assert.equal(Object.hasOwn(buyer, "deliveryAddressType"), false);
  assert.equal(Object.hasOwn(buyer, "deliveryName"), false);
  assert.equal(Object.hasOwn(buyer, "stripeSessionId"), false);
  assertBuyerSafe(buyer);
  assert.equal(recipient.deliveryAddress, deliveryAddress);
  assert.equal(recipient.deliveryName, deliveryName);

  const item = serializeGiftRegistryItem(createState().registryItem, true);
  assert.equal(item?.affiliateUrl, "https://www.amazon.com/dp/B000000000");
});

test("sent, received, and details routes preserve role privacy for every gift status", async () => {
  const state = createState();
  const { server, base } = await giftApp(state);

  try {
    for (const status of statuses) {
      state.purchase.status = status;

      const sent = await request(base, buyerId, "/api/gifts/sent");
      assert.equal(sent.response.status, 200);
      assertBuyerSafe(sent.body);
      assert.equal(sent.body[0].status, status);

      const received = await request(base, recipientId, "/api/gifts/received");
      assert.equal(received.response.status, 200);
      assert.equal(received.body[0].deliveryAddress, deliveryAddress);
      assert.equal(received.body[0].deliveryName, deliveryName);
      assert.equal(received.body[0].item.affiliateUrl, "https://www.amazon.com/dp/B000000000");

      const buyerDetails = await request(base, buyerId, `/api/gifts/${giftId}/details`);
      assert.equal(buyerDetails.response.status, 200);
      assert.equal(buyerDetails.body.role, "buyer");
      assertBuyerSafe(buyerDetails.body);
      assert.equal(Object.hasOwn(buyerDetails.body, "deliveryAddress"), false);

      const recipientDetails = await request(base, recipientId, `/api/gifts/${giftId}/details`);
      assert.equal(recipientDetails.response.status, 200);
      assert.equal(recipientDetails.body.role, "recipient");
      assert.equal(recipientDetails.body.purchase.deliveryAddress, deliveryAddress);

      const strangerDetails = await request(base, strangerId, `/api/gifts/${giftId}/details`);
      assert.equal(strangerDetails.response.status, 403);
      assertBuyerSafe(strangerDetails.body);
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("retailer-managed readiness requires attestation, supported retailer, and no legacy address fields", async () => {
  const state = createState("fee_paid");
  state.purchase.deliveryAddress = null;
  state.purchase.deliveryName = null;
  state.purchase.deliveryAddressType = null;
  const { server, base } = await giftApp(state);

  try {
    const missingAttestation = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/provide-address`,
      "POST",
      { shippingMethod: "retailer_managed" },
    );
    assert.equal(missingAttestation.response.status, 400);
    assert.equal(missingAttestation.body.code, "PRIVATE_SHIPPING_CONFIRMATION_REQUIRED");
    assert.equal(state.purchase.status, "fee_paid");
    assert.equal(state.updates.length, 0);

    const falseAttestation = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/provide-address`,
      "POST",
      { shippingMethod: "retailer_managed", privateShippingConfirmed: false },
    );
    assert.equal(falseAttestation.response.status, 400);
    assert.equal(state.updates.length, 0);

    const mixedFields = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/provide-address`,
      "POST",
      {
        shippingMethod: "retailer_managed",
        privateShippingConfirmed: true,
        deliveryAddress: deliveryAddress,
      },
    );
    assert.equal(mixedFields.response.status, 400);
    assert.equal(mixedFields.body.code, "PRIVATE_SHIPPING_FIELDS_NOT_ALLOWED");
    assert.equal(state.purchase.status, "fee_paid");
    assert.equal(state.updates.length, 0);

    state.registryItem.affiliateUrl = "https://unsupported.example/item";
    const unsupportedRetailer = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/provide-address`,
      "POST",
      { shippingMethod: "retailer_managed", privateShippingConfirmed: true },
    );
    assert.equal(unsupportedRetailer.response.status, 400);
    assert.equal(unsupportedRetailer.body.code, "UNSUPPORTED_PRIVATE_RETAILER");
    assert.equal(state.purchase.status, "fee_paid");
    assert.equal(state.updates.length, 0);

    state.registryItem.affiliateUrl = "https://www.amazon.com/dp/B000000000";
    const ready = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/provide-address`,
      "POST",
      { shippingMethod: "retailer_managed", privateShippingConfirmed: true },
    );
    assert.equal(ready.response.status, 200);
    assert.equal(ready.body.shippingMethod, "retailer_managed");
    assert.equal(ready.body.shippingReady, true);
    assert.equal(ready.body.purchase.status, "address_provided");
    assert.match(ready.body.message, /confirmed by the recipient/);
    assert.equal(ready.body.purchase.deliveryAddress, null);
    assert.equal(state.purchase.status, "address_provided");
    assert.equal(state.purchase.deliveryAddress, null);

    const buyer = await request(base, buyerId, "/api/gifts/sent");
    assert.equal(buyer.response.status, 200);
    assertBuyerSafe(buyer.body);

    // The pre-existing address flow remains recipient-only and does not
    // require the new retailer attestation.
    state.purchase = {
      ...state.purchase,
      status: "fee_paid",
      deliveryAddress: null,
      deliveryAddressType: null,
      deliveryName: null,
    };
    const legacy = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/provide-address`,
      "POST",
      {
        deliveryAddress,
        deliveryAddressType: "home",
        deliveryName,
      },
    );
    assert.equal(legacy.response.status, 200);
    assert.equal(legacy.body.shippingMethod, "recipient_address");
    assert.equal(legacy.body.purchase.deliveryAddress, deliveryAddress);
    assert.equal(legacy.body.purchase.deliveryName, deliveryName);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("checkout success returns the updated fee-paid buyer DTO and private shipping next step", async () => {
  const state = createState("pending");
  state.purchase.stripeSessionId = null;
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async () => ({
            payment_status: "paid",
            metadata: {
              type: "gift_purchase",
              buyerUserId: "gift-privacy-buyer",
              registryItemId: "gift-privacy-item",
              recipientUserId: "gift-privacy-recipient",
              matchId: "",
              giftValue: "50.00",
              platformFee: "5.00",
            },
          }),
      },
    },
  };
  const { server, base } = await giftApp(state, false, stripe);

  try {
    const success = await request(
      base,
      buyerId,
      "/api/gifts/checkout/success?session_id=new-session",
    );
    assert.equal(success.response.status, 200);
    assert.equal(success.body.purchase.status, "fee_paid");
    assert.equal(success.body.nextStep, "waiting_for_private_shipping");
    assert.match(success.body.message, /private retailer-managed shipping/);
    assert.doesNotMatch(success.body.message, /delivery address/i);
    assertBuyerSafe(success.body);
    assert.equal(state.updates.at(-1)?.status, "fee_paid");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("buyer mutation responses remain sanitized after affiliate, purchase, delivery, and revoke transitions", async () => {
  const state = createState("address_provided");
  let refundCalls = 0;
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async () => ({
          payment_status: "paid",
          metadata: {
            type: "gift_purchase",
            buyerUserId: "gift-privacy-buyer",
          },
        }),
      },
    },
    refunds: {
      create: async () => {
        refundCalls += 1;
      },
    },
  };
  const { server, base } = await giftApp(state, true, stripe);

  try {
    const success = await request(
      base,
      buyerId,
      "/api/gifts/checkout/success?session_id=session-private",
    );
    assert.equal(success.response.status, 200);
    assertBuyerSafe(success.body);
    assert.equal(refundCalls, 0, "checkout success retrieval must not charge or refund");

    const tracked = await request(
      base,
      buyerId,
      `/api/gifts/${giftId}/track-affiliate-click`,
      "POST",
    );
    assert.equal(tracked.response.status, 200);
    assertBuyerSafe(tracked.body);

    state.purchase.status = "link_clicked";
    state.purchase.affiliateLinkClicked = true;
    const confirmed = await request(
      base,
      buyerId,
      `/api/gifts/${giftId}/confirm-purchase`,
      "POST",
      { orderTrackingInfo: "retailer-order-123" },
    );
    assert.equal(confirmed.response.status, 200);
    assertBuyerSafe(confirmed.body);

    state.purchase.status = "purchase_confirmed";
    const delivered = await request(
      base,
      recipientId,
      `/api/gifts/${giftId}/confirm-delivery`,
      "POST",
    );
    assert.equal(delivered.response.status, 200);
    assert.equal(delivered.body.purchase.deliveryAddress, deliveryAddress);

    const buyerAfterDelivery = await request(
      base,
      buyerId,
      `/api/gifts/${giftId}/details`,
    );
    assert.equal(buyerAfterDelivery.response.status, 200);
    assertBuyerSafe(buyerAfterDelivery.body);

    state.purchase.status = "fee_paid";
    state.purchase.stripeSessionId = null;
    const revoked = await request(
      base,
      buyerId,
      `/api/gifts/${giftId}/revoke`,
      "POST",
    );
    assert.equal(revoked.response.status, 200);
    assertBuyerSafe(revoked.body);
  } finally {
    server.close();
    await once(server, "close");
  }
});