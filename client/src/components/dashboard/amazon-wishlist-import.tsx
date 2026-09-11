import { useRef, useState } from "react";
import { AlertCircle, Check, ExternalLink, Loader2, X } from "lucide-react";
import { SiAmazon } from "react-icons/si";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  amazonWishlistPreviewSchema,
  type AmazonWishlistCandidate,
} from "@shared/amazon-wishlist-import";

type CandidateStatus = "pending" | "saving" | "success" | "failed" | "uncertain";

interface CandidateDraft extends AmazonWishlistCandidate {
  selected: boolean;
  description: string;
  status: CandidateStatus;
  error?: string;
}

interface AmazonWishlistImportProps {
  onImported?: () => void;
}

const AMAZON_HOSTS = new Set(["amazon.com", "www.amazon.com"]);
const AMAZON_WISHLIST_PATH = /^\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist)\/[A-Za-z0-9_-]{1,64}$/;
const AMAZON_PRODUCT_PATH = /^\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Za-z0-9]{10}(?:\/)?$/i;
const DECIMAL_PRICE = /^\d+(?:\.\d{1,2})?$/;

function isAmazonHostname(hostname: string): boolean {
  return AMAZON_HOSTS.has(hostname.toLowerCase());
}

function hasUnsafeUrlCharacters(value: string): boolean {
  return /[\u0000-\u0020\u007f\\]/.test(value);
}

function hasExplicitPort(value: string): boolean {
  const authority = value
    .replace(/^https:\/\//i, "")
    .split(/[/?#]/, 1)[0] ?? "";
  return authority.includes(":");
}

function strictAmazonHttpsUrl(value: string): URL | undefined {
  if (!value || hasUnsafeUrlCharacters(value) || hasExplicitPort(value)) return undefined;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !isAmazonHostname(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

/**
 * Wishlist URLs can be public list URLs, while imported products must be
 * canonical Amazon product URLs. Keeping those checks separate prevents a
 * shortened or arbitrary affiliate URL from being written by this flow.
 */
export function isAmazonWishlistUrl(value: string): boolean {
  const url = strictAmazonHttpsUrl(value);
  return Boolean(url && AMAZON_WISHLIST_PATH.test(url.pathname));
}

export function isCanonicalAmazonProductUrl(value: string): boolean {
  const url = strictAmazonHttpsUrl(value);
  return Boolean(url && !hasScript(value) && AMAZON_PRODUCT_PATH.test(url.pathname));
}

export function priceTierForAmazonPrice(value: string): "starter" | "impressive" | "vip" {
  const price = Number(value);
  if (price >= 100) return "vip";
  if (price >= 50) return "impressive";
  return "starter";
}

function hasScript(value: string): boolean {
  return /<\s*script\b|javascript\s*:/i.test(value);
}

function isSafeHttpsImageUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && !hasScript(value);
  } catch {
    return false;
  }
}

function validateCandidate(candidate: CandidateDraft): string | undefined {
  if (!candidate.title.trim()) return "Title is required";
  if (hasScript(candidate.title)) return "Title contains unsafe content";

  const price = candidate.price.trim();
  if (!price) return "Enter a price before importing";
  if (!DECIMAL_PRICE.test(price) || Number(price) <= 0) {
    return "Price must be a decimal greater than 0";
  }

  if (!isCanonicalAmazonProductUrl(candidate.productUrl)) {
    return "Use a canonical Amazon product URL (https://www.amazon.com/dp/...)";
  }
  if (!isSafeHttpsImageUrl(candidate.imageUrl)) {
    return "Image URL must be a safe HTTPS URL";
  }
  if (hasScript(candidate.description)) return "Description contains unsafe content";
  return undefined;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";

  // apiRequest includes the response body after the status code. Preserve the
  // API's explicit { message } without exposing a noisy JSON wrapper to users.
  const body = error.message.match(/:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // Keep the original message below when the body was not JSON.
    }
  }
  return error.message || "Something went wrong. Please try again.";
}

/**
 * apiRequest prefixes HTTP failures with the status code. Only an explicit
 * 4xx response tells us the server rejected the item before it was written.
 * Network errors, 5xx responses, and anything else leave the write outcome
 * unknown and must never be retried automatically.
 */
export function isUncertainImportFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const status = error.message.match(/^(\d{3}):/)?.[1];
  if (!status) return true;
  const statusCode = Number(status);
  return statusCode < 400 || statusCode >= 500;
}

function candidateFromApi(candidate: AmazonWishlistCandidate, index: number): CandidateDraft {
  return {
    id: String(candidate.id || `candidate-${index}`),
    title: String(candidate.title || ""),
    price: String(candidate.price || ""),
    imageUrl: String(candidate.imageUrl || ""),
    productUrl: String(candidate.productUrl || ""),
    selected: false,
    description: "",
    status: "pending",
  };
}

export function AmazonWishlistImport({ onImported }: AmazonWishlistImportProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"input" | "preview">("input");
  const [wishlistUrl, setWishlistUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [candidates, setCandidates] = useState<CandidateDraft[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [importError, setImportError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const previewRequestId = useRef(0);
  const importingRef = useRef(false);

  const reset = () => {
    previewRequestId.current += 1;
    setPhase("input");
    setWishlistUrl("");
    setSourceUrl("");
    setCandidates([]);
    setWarnings([]);
    setPreviewError("");
    setImportError("");
    setIsPreviewing(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // Radix also calls this for the escape key and the dialog close button.
    // Never allow either to interrupt a batch or make a second batch possible.
    if (!nextOpen && importingRef.current) return;
    if (!nextOpen) reset();
    setOpen(nextOpen);
  };

  const preview = async () => {
    setPreviewError("");
    setImportError("");

    if (!isAmazonWishlistUrl(wishlistUrl)) {
      setPreviewError("Enter a public HTTPS Amazon wishlist or registry URL.");
      return;
    }

    const requestId = ++previewRequestId.current;
    setIsPreviewing(true);
    try {
      const response = await apiRequest("POST", "/api/registry/import-amazon/preview", {
        url: wishlistUrl.trim(),
      });
      const parsed = amazonWishlistPreviewSchema.safeParse(await response.json());

      // A canceled/closed dialog may not receive the response that was already
      // in flight. The request id makes that response harmless.
      if (requestId !== previewRequestId.current) return;
      if (!parsed.success) {
        throw new Error("The Amazon preview response was invalid.");
      }
      const data = parsed.data;

      setSourceUrl(String(data.sourceUrl || wishlistUrl.trim()));
      setWarnings(Array.isArray(data.warnings) ? data.warnings.map(String) : []);
      setCandidates(data.candidates.map(candidateFromApi));
      setPhase("preview");
    } catch (error) {
      if (requestId !== previewRequestId.current) return;
      setPreviewError(errorMessage(error));
    } finally {
      if (requestId === previewRequestId.current) setIsPreviewing(false);
    }
  };

  const updateCandidate = (id: string, update: Partial<CandidateDraft>) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? { ...candidate, ...update, error: undefined }
          : candidate,
      ),
    );
    setImportError("");
  };

  const toggleCandidate = (id: string, selected: boolean) => {
    const candidate = candidates.find((item) => item.id === id);
    if (candidate?.status === "success" || candidate?.status === "uncertain") return;
    updateCandidate(id, { selected });
  };

  const importSelected = async () => {
    if (importingRef.current) return;
    setPreviewError("");
    setImportError("");

    const selected = candidates.filter(
      (candidate) => candidate.selected && (candidate.status === "pending" || candidate.status === "failed"),
    );
    if (selected.length === 0) {
      setImportError("Select at least one item to import.");
      return;
    }

    const invalid = selected
      .map((candidate) => ({ id: candidate.id, error: validateCandidate(candidate) }))
      .filter((result): result is { id: string; error: string } => Boolean(result.error));
    if (invalid.length > 0) {
      setCandidates((current) =>
        current.map((candidate) => {
          const result = invalid.find((item) => item.id === candidate.id);
          return result ? { ...candidate, error: result.error, status: "failed" } : candidate;
        }),
      );
      setImportError("Review the highlighted items before importing.");
      return;
    }

    importingRef.current = true;
    setIsImporting(true);
    let imported = 0;
    let failed = 0;
    let uncertain = 0;

    // Keep this sequential. It gives each candidate its own settled status,
    // allowing a retry to POST only failed items after a partial success.
    for (const candidate of selected) {
      updateCandidate(candidate.id, { status: "saving", error: undefined });
      try {
        await apiRequest("POST", "/api/registry", {
          title: candidate.title.trim(),
          description: candidate.description.trim() || undefined,
          affiliateUrl: candidate.productUrl.trim(),
          imageUrl: candidate.imageUrl.trim() || undefined,
          price: candidate.price.trim(),
          priceTier: priceTierForAmazonPrice(candidate.price),
          visibility: "public",
        });
        imported += 1;
        updateCandidate(candidate.id, { status: "success", selected: false });
      } catch (error) {
        failed += 1;
        if (isUncertainImportFailure(error)) {
          uncertain += 1;
          updateCandidate(candidate.id, {
            status: "uncertain",
            selected: false,
            error: "Import status could not be confirmed. Check your wishlist before importing this item again.",
          });
        } else {
          updateCandidate(candidate.id, { status: "failed", error: errorMessage(error) });
        }
      }
    }

    importingRef.current = false;
    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ["/api/registry"] });
    onImported?.();

    if (failed === 0) {
      toast({
        title: "Amazon list imported",
        description: `${imported} item${imported === 1 ? "" : "s"} added to your wishlist.`,
      });
      setOpen(false);
      reset();
    } else {
      const uncertainCopy = uncertain > 0
        ? ` ${uncertain} item${uncertain === 1 ? "" : "s"} could not be confirmed. Check your wishlist before importing ${uncertain === 1 ? "it" : "them"} again.`
        : "";
      const retryCopy = failed > uncertain
        ? ` ${failed - uncertain} failed item${failed - uncertain === 1 ? "" : "s"} can be reviewed and retried.`
        : "";
      setImportError(`${imported} item${imported === 1 ? "" : "s"} imported.${uncertainCopy}${retryCopy}`);
    }
  };

  const selectedCount = candidates.filter(
    (candidate) => candidate.selected && (candidate.status === "pending" || candidate.status === "failed"),
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-import-amazon-wishlist">
          <SiAmazon className="w-4 h-4 mr-2" />
          Import Amazon list
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiAmazon className="w-5 h-5" />
            Import Amazon wishlist
          </DialogTitle>
          <DialogDescription>
            Preview a public Amazon list, review its details, and choose only the items you want to add.
          </DialogDescription>
        </DialogHeader>

        {phase === "input" ? (
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <label htmlFor="amazon-wishlist-url" className="text-sm font-medium">
                Public Amazon wishlist URL
              </label>
              <Input
                id="amazon-wishlist-url"
                type="url"
                value={wishlistUrl}
                onChange={(event) => setWishlistUrl(event.target.value)}
                placeholder="https://www.amazon.com/hz/wishlist/ls/..."
                disabled={isPreviewing}
                data-testid="input-amazon-wishlist-url"
              />
              <p className="text-xs text-muted-foreground">
                Only public HTTPS Amazon wishlist or registry links are supported.
              </p>
            </div>
            {previewError && (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-testid="text-amazon-preview-error">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {previewError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={preview}
                disabled={isPreviewing || !wishlistUrl.trim()}
                data-testid="button-preview-amazon-wishlist"
              >
                {isPreviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading preview...
                  </>
                ) : (
                  "Preview list"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden min-h-0">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">Review items before importing</p>
                {isAmazonWishlistUrl(sourceUrl) ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-full truncate"
                  >
                    <span className="truncate">{sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground truncate block">{sourceUrl}</span>
                )}
              </div>
              <Badge variant="outline" className="shrink-0">
                {selectedCount} selected
              </Badge>
            </div>

            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="note">
              <strong>Verify prices before importing.</strong>{" "}
              Amazon prices and currency can change, and imported values may not be in your local currency.
            </div>

            {warnings.map((warning, index) => (
              <p key={`${warning}-${index}`} className="text-sm text-amber-700 dark:text-amber-300" data-testid="text-amazon-import-warning">
                {warning}
              </p>
            ))}

            {previewError && (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-testid="text-amazon-preview-error">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {previewError}
              </p>
            )}
            {importError && (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-testid="text-amazon-import-error">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {importError}
              </p>
            )}

            <div className="space-y-3 overflow-y-auto pr-1">
              {candidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No products were found in this wishlist.
                </p>
              ) : (
                candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-lg border p-3 space-y-3"
                    data-testid={`amazon-candidate-${candidate.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={candidate.selected}
                        onCheckedChange={(checked) => toggleCandidate(candidate.id, checked === true)}
                        disabled={isImporting || candidate.status === "success" || candidate.status === "uncertain"}
                        aria-label={`Select ${candidate.title || "Amazon item"}`}
                        data-testid={`checkbox-amazon-candidate-${candidate.id}`}
                      />
                      {isSafeHttpsImageUrl(candidate.imageUrl) && candidate.imageUrl && (
                        <img
                          src={candidate.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{candidate.title || "Untitled item"}</p>
                        {candidate.status === "success" && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Imported
                          </p>
                        )}
                        {candidate.status === "saving" && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                          </p>
                        )}
                        {candidate.status === "uncertain" && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Check wishlist before retrying
                          </p>
                        )}
                        {isCanonicalAmazonProductUrl(candidate.productUrl) ? (
                          <a
                            href={candidate.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-full"
                          >
                            <span className="truncate">{candidate.productUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground truncate block">{candidate.productUrl}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs font-medium">
                        Title
                        <Input
                          value={candidate.title}
                          onChange={(event) => updateCandidate(candidate.id, { title: event.target.value })}
                          disabled={isImporting || candidate.status === "success" || candidate.status === "uncertain"}
                          data-testid={`input-amazon-title-${candidate.id}`}
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Price
                        <Input
                          inputMode="decimal"
                          placeholder="e.g. 29.99"
                          value={candidate.price}
                          onChange={(event) => updateCandidate(candidate.id, { price: event.target.value })}
                          disabled={isImporting || candidate.status === "success" || candidate.status === "uncertain"}
                          data-testid={`input-amazon-price-${candidate.id}`}
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Image URL (optional)
                        <Input
                          type="url"
                          value={candidate.imageUrl}
                          onChange={(event) => updateCandidate(candidate.id, { imageUrl: event.target.value })}
                          disabled={isImporting || candidate.status === "success" || candidate.status === "uncertain"}
                          data-testid={`input-amazon-image-${candidate.id}`}
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Product URL
                        <Input
                          type="url"
                          value={candidate.productUrl}
                          onChange={(event) => updateCandidate(candidate.id, { productUrl: event.target.value })}
                          disabled={isImporting || candidate.status === "success" || candidate.status === "uncertain"}
                          data-testid={`input-amazon-product-url-${candidate.id}`}
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium sm:col-span-2">
                        Description (optional)
                        <Input
                          value={candidate.description}
                          onChange={(event) => updateCandidate(candidate.id, { description: event.target.value })}
                          disabled={isImporting || candidate.status === "success" || candidate.status === "uncertain"}
                          data-testid={`input-amazon-description-${candidate.id}`}
                        />
                      </label>
                    </div>

                    {candidate.error && (
                      <p className="text-sm text-destructive flex items-start gap-2" role="alert">
                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                        {candidate.error}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button type="button" onClick={importSelected} disabled={isImporting || candidates.length === 0} data-testid="button-import-selected-amazon">
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import selected${selectedCount ? ` (${selectedCount})` : ""}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}