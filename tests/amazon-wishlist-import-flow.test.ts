import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

type TreeNode = {
  type: unknown;
  props: Record<string, any>;
};

type PreviewCandidate = {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  productUrl: string;
};

const SOURCE_URL = "https://www.amazon.com/hz/wishlist/ls/SYNTHETIC123";
const CANDIDATES: PreviewCandidate[] = [
  {
    id: "one",
    title: "First item",
    price: "29.99",
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/one.jpg",
    productUrl: "https://www.amazon.com/dp/B012345678",
  },
  {
    id: "two",
    title: "Second item",
    price: "59.99",
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/two.jpg",
    productUrl: "https://www.amazon.com/gp/product/B012345679",
  },
  {
    id: "three",
    title: "Third item",
    price: "109.99",
    imageUrl: "",
    productUrl: "https://www.amazon.com/gp/aw/d/B012345680",
  },
];

function previewBody(candidates = CANDIDATES) {
  return { sourceUrl: SOURCE_URL, candidates, warnings: [] };
}

function jsx(type: unknown, props: Record<string, any> | null, ...children: unknown[]): TreeNode {
  const nextProps = { ...(props ?? {}) };
  if (children.length > 0) {
    nextProps.children = children.length === 1 ? children[0] : children;
  }
  return { type, props: nextProps };
}

const Fragment = "Fragment";

class ApiMock {
  readonly calls: Array<{ method: string; url: string; body: any }> = [];
  private readonly queue: Array<
    | { body: unknown }
    | { error: Error }
    | { response: Promise<unknown> }
  > = [];

  enqueueResponse(body: unknown = {}) {
    this.queue.push({ body });
  }

  enqueueError(message: string) {
    this.queue.push({ error: new Error(message) });
  }

  enqueueDeferred(response: Promise<unknown>) {
    this.queue.push({ response });
  }

  readonly apiRequest = async (method: string, url: string, body?: unknown) => {
    this.calls.push({ method, url, body });
    const behavior = this.queue.shift();
    assert.ok(behavior, `unexpected API call: ${method} ${url}`);
    if ("error" in behavior) throw behavior.error;
    const result = "response" in behavior ? await behavior.response : behavior.body;
    return { json: async () => result } as Response;
  };
}

function createPreviewSchemaStub() {
  return {
    safeParse(value: unknown) {
      const candidateList = (value as { candidates?: unknown })?.candidates;
      const valid = Boolean(
        value &&
        typeof value === "object" &&
        typeof (value as { sourceUrl?: unknown }).sourceUrl === "string" &&
        Array.isArray(candidateList) &&
        candidateList.every((candidate) => {
          if (!candidate || typeof candidate !== "object") return false;
          return ["id", "title", "price", "imageUrl", "productUrl"]
            .every((key) => typeof (candidate as Record<string, unknown>)[key] === "string");
        }) &&
        Array.isArray((value as { warnings?: unknown }).warnings),
      );
      return valid
        ? { success: true as const, data: value as any }
        : { success: false as const, error: new Error("invalid preview") };
    },
  };
}

function loadComponent(api: ApiMock) {
  const source = readFileSync("client/src/components/dashboard/amazon-wishlist-import.tsx", "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      jsxFactory: "jsx",
      jsxFragmentFactory: "Fragment",
    },
    fileName: "amazon-wishlist-import.tsx",
  }).outputText;

  let activeRenderer: HookRenderer | undefined;
  const reactStub = {
    useState: (initial: unknown) => {
      assert.ok(activeRenderer);
      return activeRenderer.useState(initial);
    },
    useRef: (initial: unknown) => {
      assert.ok(activeRenderer);
      return activeRenderer.useRef(initial);
    },
  };
  const queryClient = {
    invalidations: [] as unknown[],
    invalidateQueries: async (query: unknown) => {
      queryClient.invalidations.push(query);
    },
  };
  const module = { exports: {} as Record<string, any> };
  const iconStub = new Proxy({}, {
    get: (_target, name) => String(name),
  });
  const uiStub = new Proxy({}, {
    get: (_target, name) => String(name),
  });
  const toastStub = {
    useToast: () => ({ toast: () => undefined }),
  };
  const requireStub = (request: string) => {
    if (request === "react") return reactStub;
    if (request === "lucide-react" || request === "react-icons/si") return iconStub;
    if (request === "@shared/amazon-wishlist-import") {
      return { amazonWishlistPreviewSchema: createPreviewSchemaStub() };
    }
    if (request === "@/hooks/use-toast") return toastStub;
    if (request === "@/lib/queryClient") return { apiRequest: api.apiRequest, queryClient };
    if (request.startsWith("@/components/ui/")) return uiStub;
    throw new Error(`unexpected component dependency: ${request}`);
  };

  vm.runInNewContext(javascript, {
    module,
    exports: module.exports,
    require: requireStub,
    jsx,
    Fragment,
    URL,
    Error,
    Set,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Promise,
    console,
  });

  const component = module.exports.AmazonWishlistImport;
  assert.equal(typeof component, "function");
  return {
    component,
    queryClient,
    setActiveRenderer(renderer: HookRenderer | undefined) {
      activeRenderer = renderer;
    },
  };
}

class HookRenderer {
  private readonly state: unknown[] = [];
  private readonly refs: Array<{ current: unknown }> = [];
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

  useRef(initial: unknown) {
    const index = this.hookIndex++;
    if (!this.refs[index]) this.refs[index] = { current: initial };
    return this.refs[index];
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

function byTestId(renderer: HookRenderer, testId: string): TreeNode {
  const found = walk(renderer.tree, (node) => node.props["data-testid"] === testId);
  assert.ok(found, `missing data-testid=${testId}`);
  return found;
}

function byText(renderer: HookRenderer, text: string): TreeNode {
  const found = walk(renderer.tree, (node) => node.props.children === text && typeof node.props.onClick === "function");
  assert.ok(found, `missing clickable text: ${text}`);
  return found;
}

function dialog(renderer: HookRenderer): TreeNode {
  const found = walk(renderer.tree, (node) => node.props.onOpenChange && "open" in node.props);
  assert.ok(found, "missing dialog root");
  return found;
}

function textContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";
  return textContent((node as TreeNode).props?.children);
}

function openDialog(renderer: HookRenderer) {
  dialog(renderer).props.onOpenChange(true);
  assert.equal(dialog(renderer).props.open, true);
}

async function preview(renderer: HookRenderer, url: string) {
  byTestId(renderer, "input-amazon-wishlist-url").props.onChange({ target: { value: url } });
  await byTestId(renderer, "button-preview-amazon-wishlist").props.onClick();
}

async function cancel(renderer: HookRenderer) {
  await byText(renderer, "Cancel").props.onClick();
}

function registryCalls(api: ApiMock) {
  return api.calls.filter((call) => call.url === "/api/registry");
}

function newHarness() {
  const api = new ApiMock();
  const loaded = loadComponent(api);
  const renderer = new HookRenderer(
    () => loaded.component({}),
    loaded.setActiveRenderer,
  );
  return { api, renderer, queryClient: loaded.queryClient, component: loaded.component };
}

test("preview and cancel never write registry items", async () => {
  const { api, renderer } = newHarness();
  api.enqueueResponse(previewBody());
  openDialog(renderer);
  await preview(renderer, SOURCE_URL);

  assert.equal(registryCalls(api).length, 0);
  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-one").props.checked, false);
  await cancel(renderer);
  assert.equal(dialog(renderer).props.open, false);
  assert.equal(registryCalls(api).length, 0);
});

test("only explicitly selected edited candidates are saved", async () => {
  const { api, renderer, queryClient } = newHarness();
  api.enqueueResponse(previewBody());
  api.enqueueResponse();
  openDialog(renderer);
  await preview(renderer, SOURCE_URL);

  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-one").props.checked, false);
  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-two").props.checked, false);
  byTestId(renderer, "checkbox-amazon-candidate-one").props.onCheckedChange(true);
  byTestId(renderer, "input-amazon-title-one").props.onChange({ target: { value: "Edited first item" } });
  byTestId(renderer, "input-amazon-price-one").props.onChange({ target: { value: "49.50" } });
  await byTestId(renderer, "button-import-selected-amazon").props.onClick();

  const writes = registryCalls(api);
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0].body)), {
    title: "Edited first item",
    affiliateUrl: CANDIDATES[0].productUrl,
    imageUrl: CANDIDATES[0].imageUrl,
    price: "49.50",
    priceTier: "starter",
    visibility: "public",
  });
  assert.equal(queryClient.invalidations.length, 1);
  assert.equal(dialog(renderer).props.open, false);
});

test("uncertain writes stay disabled while definite failures alone remain retryable", async () => {
  const { api, renderer } = newHarness();
  api.enqueueResponse(previewBody());
  api.enqueueResponse();
  api.enqueueError("500: upstream unavailable");
  api.enqueueError("422: invalid price");
  openDialog(renderer);
  await preview(renderer, SOURCE_URL);

  for (const id of ["one", "two", "three"]) {
    byTestId(renderer, `checkbox-amazon-candidate-${id}`).props.onCheckedChange(true);
  }
  await byTestId(renderer, "button-import-selected-amazon").props.onClick();

  assert.equal(registryCalls(api).length, 3);
  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-two").props.checked, false);
  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-two").props.disabled, true);
  assert.equal(byTestId(renderer, "input-amazon-title-two").props.disabled, true);
  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-three").props.checked, true);
  assert.equal(byTestId(renderer, "checkbox-amazon-candidate-three").props.disabled, false);
  assert.match(textContent(byTestId(renderer, "text-amazon-import-error")), /Check your wishlist/i);

  // A manual retry may submit the definite 4xx failure, but never the
  // uncertain 5xx item.
  api.enqueueError("422: invalid price");
  await byTestId(renderer, "button-import-selected-amazon").props.onClick();
  const writes = registryCalls(api);
  assert.equal(writes.length, 4);
  assert.equal(writes[3].body.affiliateUrl, CANDIDATES[2].productUrl);
  assert.equal(dialog(renderer).props.open, true);
});

test("a preview response arriving after close cannot populate the dialog", async () => {
  const { api, renderer } = newHarness();
  let resolveResponse!: (body: unknown) => void;
  const response = new Promise<unknown>((resolve) => {
    resolveResponse = resolve;
  });
  api.enqueueDeferred(response);
  openDialog(renderer);
  const pendingPreview = preview(renderer, SOURCE_URL);

  await cancel(renderer);
  resolveResponse(previewBody());
  await pendingPreview;

  assert.equal(dialog(renderer).props.open, false);
  assert.equal(registryCalls(api).length, 0);
  openDialog(renderer);
  assert.equal(byTestId(renderer, "input-amazon-wishlist-url").props.value, "");
  assert.equal(walk(renderer.tree, (node) => node.props["data-testid"] === "amazon-candidate-one"), undefined);
});