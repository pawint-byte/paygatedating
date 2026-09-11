import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {
  getRetailerShippingGuidance,
  PRIVATE_RETAILER_SHIPPING_COPY,
} from "../client/src/lib/gift-shipping-privacy.ts";

const historyFile = "client/src/components/dashboard/gift-history.tsx";
const successFile = "client/src/pages/gift-success.tsx";
const history = readFileSync(historyFile, "utf8");
const success = readFileSync(successFile, "utf8");

test("gift privacy UI files remain valid TSX", () => {
  for (const [fileName, source] of [[historyFile, history], [successFile, success]] as const) {
    const tree = ts.createSourceFile(
      fileName,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    assert.equal(tree.parseDiagnostics.length, 0, `${fileName} should remain valid TSX`);
  }
});

test("recipient confirms retailer-managed shipping without entering an address", () => {
  assert.match(history, /\/api\/gifts\/\$\{giftId\}\/provide-address/);
  assert.match(history, /shippingMethod:\s*"retailer_managed"/);
  assert.match(history, /privateShippingConfirmed:\s*true/);
  assert.match(history, /I have configured a retailer-supported private shipping option for this gift; the buyer will not need my street address\./);
  assert.match(history, /link-retailer-shipping-setup/);
  assert.match(history, /Confirm retailer-managed shipping/);
  assert.match(history, /PRIVATE_RETAILER_SHIPPING_COPY/);
  assert.doesNotMatch(history, /gift\.delivery(?:Address|Name)/);
  assert.doesNotMatch(history, /input-delivery-(?:address|name)/);
  assert.doesNotMatch(history, /Submit Address|Provide Delivery Address/);
});

test("buyer view uses private-shipping copy instead of stale recipient fields", () => {
  assert.equal(PRIVATE_RETAILER_SHIPPING_COPY, "Ships to recipient via retailer — address stays private.");
  assert.match(history, /Shipping Setup Reported/);
  assert.match(history, /not independent verification of the retailer's privacy controls/);
  assert.match(history, /PRIVATE_RETAILER_SHIPPING_COPY/);
  assert.doesNotMatch(history, /text-delivery-(?:address|name)/);
  assert.doesNotMatch(history, /gift\.delivery(?:Address|Name)/);
});

test("retailer guidance distinguishes Amazon, approved retailers, and unsupported links", () => {
  const amazon = getRetailerShippingGuidance("https://www.amazon.com/dp/B000000000");
  assert.equal(amazon.retailerSupported, true);
  assert.match(amazon.validatedUrl || "", /^https:\/\/www\.amazon\.com\/dp\//);
  assert.match(amazon.description, /recipient-managed public wishlist/);
  assert.match(amazon.description, /does not automatically hide/);

  const approved = getRetailerShippingGuidance("https://www.promeed.com/item");
  assert.equal(approved.retailerSupported, true);
  assert.match(approved.description, /gift-ship/);
  assert.match(approved.description, /recipient-managed shipping directly/);
  assert.match(approved.description, /does not verify privacy/);

  const unsupported = getRetailerShippingGuidance("https://example.com/item");
  assert.equal(unsupported.retailerSupported, false);
  assert.match(unsupported.description, /Do not proceed/);
});

test("retailer detection only trusts strict HTTPS hosts and known AWIN destinations", () => {
  const awin = getRetailerShippingGuidance(
    "https://www.awin1.com/cread.php?awinmid=100833&awinaffid=2735710&ued=https%3A%2F%2Fwww.promeed.com%2Fitem%3Fref%3Dgift",
  );
  assert.equal(awin.retailerSupported, true);
  assert.equal(awin.retailer, "Promeed");
  assert.match(awin.validatedUrl || "", /^https:\/\/www\.awin1\.com\/cread\.php\?/);

  for (const maliciousUrl of [
    "https://evil.example/redirect?next=https%3A%2F%2Fwww.promeed.com%2Fitem",
    "https://evil.example/?q=amazon.com%2Fdp%2FB000000000",
    "https://www.awin1.com/cread.php?ued=https%3A%2F%2Fevil.example%2F%3Fq%3Dpromeed.com%252F",
    "https://www.amazon.com.evil.example/dp/B000000000",
    "https://www.amazon.com@evil.example/dp/B000000000",
    "https://www.amazon.com:444/dp/B000000000",
    "http://www.amazon.com/dp/B000000000",
    `https://www.${"\u0430"}mazon.com/dp/B000000000`,
  ]) {
    assert.equal(
      getRetailerShippingGuidance(maliciousUrl).retailerSupported,
      false,
      maliciousUrl,
    );
  }
});

test("gift success explains that only the service fee was paid", () => {
  assert.match(success, /Gift service fee paid/);
  assert.match(success, /Retailer item value \(not paid here\)/);
  assert.match(success, /purchase the item directly from the retailer/);
  assert.match(success, /PayGate does not hold or pay for the product/);
  assert.doesNotMatch(success, /Your gift is on its way/);
});

type TreeNode = {
  type: unknown;
  props: Record<string, any>;
};

function jsx(type: unknown, props: Record<string, any> | null, ...children: unknown[]): TreeNode | null {
  const nextProps = { ...(props ?? {}) };
  if (children.length > 0) {
    nextProps.children = children.length === 1 ? children[0] : children;
  }
  if (typeof type === "function") {
    return (type as (componentProps: Record<string, any>) => TreeNode | null)(nextProps);
  }
  return { type, props: nextProps };
}

const Fragment = "Fragment";

class HookRenderer {
  private readonly state: unknown[] = [];
  private hookIndex = 0;
  tree!: TreeNode;

  constructor(
    private readonly component: () => TreeNode,
    private readonly setActive: (renderer: HookRenderer | undefined) => void,
  ) {
    this.render();
  }

  useState(initial: unknown) {
    const index = this.hookIndex++;
    if (!(index in this.state)) this.state[index] = initial;
    const setState = (next: unknown | ((current: unknown) => unknown)) => {
      this.state[index] = typeof next === "function"
        ? (next as (current: unknown) => unknown)(this.state[index])
        : next;
      this.render();
    };
    return [this.state[index], setState] as const;
  }

  render() {
    this.hookIndex = 0;
    this.setActive(this);
    try {
      this.tree = this.component();
    } finally {
      this.setActive(undefined);
    }
  }
}

function walk(node: unknown, visit: (node: TreeNode) => boolean): TreeNode | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = walk(child, visit);
      if (found) return found;
    }
    return undefined;
  }
  if (!node || typeof node !== "object") return undefined;
  const candidate = node as TreeNode;
  if (candidate.props && visit(candidate)) return candidate;
  return walk(candidate.props?.children, visit);
}

function textContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";
  return textContent((node as TreeNode).props?.children);
}

function loadGiftHistory(data: { sent: any[]; received: any[] }) {
  const source = readFileSync(historyFile, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      jsxFactory: "jsx",
      jsxFragmentFactory: "Fragment",
    },
    fileName: historyFile,
  }).outputText;

  let activeRenderer: HookRenderer | undefined;
  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  const reactStub = {
    useState: (initial: unknown) => {
      assert.ok(activeRenderer);
      return activeRenderer.useState(initial);
    },
  };
  const iconStub = new Proxy({}, { get: (_target, name) => String(name) });
  const uiStub = new Proxy({}, { get: (_target, name) => String(name) });
  const requireStub = (request: string) => {
    if (request === "react") return reactStub;
    if (request === "@tanstack/react-query") {
      return {
        useQuery: ({ queryKey }: { queryKey: string[] }) => ({
          data: queryKey[0] === "/api/gifts/sent" ? data.sent : data.received,
          isLoading: false,
        }),
        useMutation: ({ mutationFn }: { mutationFn: (value: any) => Promise<unknown> }) => ({
          isPending: false,
          mutate: (value: any) => {
            void mutationFn(value);
          },
        }),
      };
    }
    if (request === "lucide-react") return iconStub;
    if (request === "@/lib/queryClient") {
      return {
        apiRequest: async (method: string, url: string, body?: unknown) => {
          calls.push({ method, url, body });
          return {} as Response;
        },
        queryClient: { invalidateQueries: () => undefined },
      };
    }
    if (request === "@/hooks/use-toast") return { useToast: () => ({ toast: () => undefined }) };
    if (request === "@/lib/gift-shipping-privacy") {
      return { getRetailerShippingGuidance, PRIVATE_RETAILER_SHIPPING_COPY };
    }
    if (request === "@/components/3d/GiftDeliveryModal") {
      return { GiftDeliveryModal: () => null, getPriceTier: () => "starter" };
    }
    if (request === "@shared/schema") return {};
    if (request.startsWith("@/components/ui/")) return uiStub;
    throw new Error(`unexpected gift history dependency: ${request}`);
  };

  const module = { exports: {} as Record<string, any> };
  vm.runInNewContext(javascript, {
    module,
    exports: module.exports,
    require: requireStub,
    jsx,
    Fragment,
    URL,
    Error,
    Date,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Promise,
    console,
  });

  const component = module.exports.GiftHistory;
  assert.equal(typeof component, "function");
  const renderer = new HookRenderer(() => component(), (next) => {
    activeRenderer = next;
  });
  return { renderer, calls };
}

function gift(overrides: Record<string, unknown> = {}) {
  return {
    id: "gift-ui-privacy",
    buyerUserId: "buyer",
    recipientUserId: "recipient",
    registryItemId: "registry-item",
    matchId: null,
    giftValue: "50.00",
    platformFee: "5.00",
    affiliateCommission: null,
    status: "address_provided",
    gatesUnlocked: 0,
    claimDeadline: null,
    stripeSessionId: null,
    deliveryAddress: "STALE-RECIPIENT-STREET-999",
    deliveryAddressType: "home",
    deliveryName: "STALE-RECIPIENT-NAME",
    affiliateLinkClicked: false,
    affiliateClickedAt: null,
    purchaseConfirmedAt: null,
    orderTrackingInfo: null,
    deliveryConfirmedAt: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    item: {
      id: "registry-item",
      title: "Private gift",
      description: null,
      affiliateUrl: "https://www.amazon.com/dp/B000000000",
      imageUrl: null,
      price: "50.00",
      priceTier: "starter",
      visibility: "public",
      isPurchased: false,
      isReserved: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

test("rendered payer card omits stale recipient address and delivery name", () => {
  const { renderer } = loadGiftHistory({
    sent: [gift()],
    received: [],
  });
  const rendered = textContent(renderer.tree);
  assert.doesNotMatch(rendered, /STALE-RECIPIENT-(?:STREET-999|NAME)/);
  assert.match(rendered, /Ships to recipient via retailer — address stays private\./);
});

test("rendered recipient readiness sends only the retailer-managed shipping method", () => {
  const { renderer, calls } = loadGiftHistory({
    sent: [],
    received: [gift({ status: "fee_paid" })],
  });
  const readinessButton = walk(
    renderer.tree,
    (node) =>
      (
        node.props["data-testid"] === "button-provide-address-gift-ui-privacy" ||
        textContent(node) === "Set Up Private Retailer Delivery"
      ) && typeof node.props.onClick === "function",
  );
  assert.ok(readinessButton);
  readinessButton.props.onClick();
  const setupLink = walk(
    renderer.tree,
    (node) => node.props["data-testid"] === "link-retailer-shipping-setup",
  );
  assert.ok(setupLink);
  assert.match(setupLink.props.href, /^https:\/\/www\.amazon\.com\/dp\//);
  const checkbox = walk(
    renderer.tree,
    (node) => node.props["data-testid"] === "checkbox-private-shipping-confirmed",
  );
  assert.ok(checkbox);
  assert.equal(checkbox.props.checked, false);
  const confirmButton = walk(
    renderer.tree,
    (node) => node.props["data-testid"] === "button-confirm-retailer-shipping",
  );
  assert.ok(confirmButton);
  assert.equal(confirmButton.props.disabled, true);
  confirmButton.props.onClick();
  assert.deepEqual(calls, []);
  checkbox.props.onCheckedChange(true);
  const confirmedButton = walk(
    renderer.tree,
    (node) => node.props["data-testid"] === "button-confirm-retailer-shipping",
  );
  assert.ok(confirmedButton);
  assert.equal(confirmedButton.props.disabled, false);
  confirmedButton.props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    method: "POST",
    url: "/api/gifts/gift-ui-privacy/provide-address",
    body: {
      shippingMethod: "retailer_managed",
      privateShippingConfirmed: true,
    },
  }]);
});