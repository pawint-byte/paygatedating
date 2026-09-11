import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const componentFile = "client/src/components/dashboard/amazon-wishlist-import.tsx";
const component = readFileSync(componentFile, "utf8");
const manager = readFileSync("client/src/components/dashboard/wishlist-manager.tsx", "utf8");

test("Amazon wishlist import component remains valid TSX and is placed beside Add Item", () => {
  const tree = ts.createSourceFile(
    componentFile,
    component,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.equal(tree.parseDiagnostics.length, 0, "Amazon importer should remain valid TSX");
  assert.match(manager, /import \{ AmazonWishlistImport \} from "@\/components\/dashboard\/amazon-wishlist-import"/);
  assert.match(manager, /<AmazonWishlistImport \/>/);
  assert.match(manager, /data-testid="button-add-wishlist-item"/);
});

test("preview is read-only and sends only the public-list URL to the preview endpoint", () => {
  assert.match(component, /amazonWishlistPreviewSchema\.safeParse\(await response\.json\(\)\)/);
  assert.match(component, /from "@shared\/amazon-wishlist-import"/);
  assert.doesNotMatch(component, /interface AmazonWishlistCandidate/);
  assert.doesNotMatch(component, /interface AmazonWishlistPreview/);
  assert.match(component, /apiRequest\("POST", "\/api\/registry\/import-amazon\/preview", \{\s*url: wishlistUrl\.trim\(\),\s*\}\)/);
  assert.match(component, /setCandidates\(data\.candidates\.map\(candidateFromApi\)\)/);
  assert.match(component, /selected: false/);
  const previewBlock = component.slice(component.indexOf("const preview = async () =>"), component.indexOf("const updateCandidate"));
  assert.doesNotMatch(previewBlock, /apiRequest\("POST", "\/api\/registry"/);
});

test("frontend URL guards match the shared backend Amazon allow-list", () => {
  assert.match(component, /new Set\(\["amazon\.com", "www\.amazon\.com"\]\)/);
  assert.ok(component.includes(String.raw`const AMAZON_WISHLIST_PATH = /^\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist)\/[A-Za-z0-9_-]{1,64}$/;`));
  assert.ok(component.includes(String.raw`const AMAZON_PRODUCT_PATH = /^\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Za-z0-9]{10}(?:\/)?$/i;`));
  assert.match(component, /hasExplicitPort/);
  assert.match(component, /url\.username/);
  assert.match(component, /url\.password/);
});

test("selected imports map Amazon fields to the existing public registry schema", () => {
  assert.match(component, /candidate\.selected && \(candidate\.status === "pending" \|\| candidate\.status === "failed"\)/);
  assert.match(component, /affiliateUrl: candidate\.productUrl\.trim\(\)/);
  assert.match(component, /priceTier: priceTierForAmazonPrice\(candidate\.price\)/);
  assert.match(component, /visibility: "public"/);
  assert.match(component, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/registry"\] \}\)/);
});

test("import validation and retry state protect against unsafe or duplicate writes", () => {
  assert.match(component, /DECIMAL_PRICE/);
  assert.match(component, /Number\(price\) <= 0/);
  assert.match(component, /isCanonicalAmazonProductUrl/);
  assert.match(component, /isSafeHttpsImageUrl/);
  assert.match(component, /importingRef\.current/);
  assert.match(component, /candidate\.status === "success" \|\| candidate\.status === "uncertain"/);
  assert.match(component, /failed item.*can be reviewed and retried/);
  assert.match(component, /if \(!nextOpen && importingRef\.current\) return/);
});

test("uncertain registry writes are quarantined instead of being retried", () => {
  assert.match(component, /type CandidateStatus = "pending" \| "saving" \| "success" \| "failed" \| "uncertain"/);
  assert.match(component, /export function isUncertainImportFailure/);
  assert.match(component, /const status = error\.message\.match\(\/\^\(\\d\{3\}\):\/\)/);
  assert.match(component, /statusCode < 400 \|\| statusCode >= 500/);
  assert.match(component, /status: "uncertain",\s+selected: false/);
  assert.match(component, /Check your wishlist before importing this item again/);
  assert.match(component, /candidate\.status === "uncertain"/);
  assert.match(component, /candidate\.status === "success" \|\| candidate\.status === "uncertain"/);
  assert.match(component, /Check wishlist before retrying/);
});