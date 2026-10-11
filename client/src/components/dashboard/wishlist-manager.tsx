import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Gift, Plus, Trash2, ExternalLink, Lock, Users, Globe, Clipboard, ShoppingBag, CheckCircle2, Plane, Loader2, Sparkles, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RegistryItem } from "@shared/schema";
import { GIFT_MINIMUM_VALUE } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SiAmazon } from "react-icons/si";
import { AmazonWishlistImport } from "@/components/dashboard/amazon-wishlist-import";
import { suggestWishlistPriceTier, type WishlistPreview, type WishlistSearchResponse } from "@shared/wishlist-discovery";

const SUPPORTED_HOSTNAMES = [
  'amazon.com', 'amzn.to', 'amzn.com', 'a.co',
  'viator.com', 'klook.com', 'tp.st', 'travelpayouts.com',
  'promeed.com', 'promfreed.com',
  'lashterally.com',
  'abracadabranyc.com',
  'yczfragrance.com',
];

function isSupportedRetailer(hostname: string): boolean {
  return SUPPORTED_HOSTNAMES.some(h => hostname === h || hostname.endsWith(`.${h}`));
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") && url.hostname.includes(".") &&
      !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) &&
      !/\.(?:localhost|local|internal|test|invalid)$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isPartnerProductUrl(value: string): boolean {
  try { return isSupportedRetailer(new URL(value).hostname.toLowerCase()); } catch { return false; }
}

interface AddItemFormData {
  title: string;
  description?: string;
  affiliateUrl: string;
  imageUrl?: string;
  price: string;
  priceTier: "starter" | "impressive" | "vip";
  visibility: "public" | "matches_only" | "after_gate1";
}

const priceTierLabels = {
  starter: { label: "Starter", description: "Under $50", icon: Gift },
  impressive: { label: "Impressive", description: "$50 to under $100", icon: Gift },
  vip: { label: "VIP", description: "$100+", icon: Gift },
};

const visibilityLabels = {
  public: { label: "Everyone", icon: Globe },
  matches_only: { label: "Matches Only", icon: Users },
  after_gate1: { label: "After Chapter 1", icon: Lock },
};

type CategoryFilter = "all" | "gifts" | "experiences";

interface WishlistManagerProps {
  categoryFilter?: CategoryFilter;
  openAddDialog?: boolean;
  onAddDialogChange?: (open: boolean) => void;
}

function getItemCategory(affiliateUrl: string | null | undefined): "gifts" | "experiences" {
  if (!affiliateUrl) return "gifts";
  try {
    const url = new URL(affiliateUrl);
    const hostname = url.hostname.toLowerCase();
    const urlString = affiliateUrl.toLowerCase();
    if (
      hostname.includes('viator.com') || 
      hostname.includes('klook.com') || 
      hostname.includes('tp.st') || 
      hostname.includes('travelpayouts.com') ||
      urlString.includes('viator') ||
      urlString.includes('klook')
    ) {
      return "experiences";
    }
  } catch {
    const urlLower = affiliateUrl.toLowerCase();
    if (urlLower.includes('viator') || urlLower.includes('klook')) {
      return "experiences";
    }
  }
  return "gifts";
}

export function WishlistManager({ categoryFilter = "all", openAddDialog, onAddDialogChange }: WishlistManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [urlPasted, setUrlPasted] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<CategoryFilter>(categoryFilter);
  const [searchResults, setSearchResults] = useState<WishlistPreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [preview, setPreview] = useState<WishlistPreview | null>(null);
  const [previewMessage, setPreviewMessage] = useState("");
  const [searchCurrencyMessage, setSearchCurrencyMessage] = useState("");
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSequenceRef = useRef(0);
  const previewSequenceRef = useRef(0);
  const activeUrlRef = useRef("");
  const autofilledRef = useRef({ title: "", imageUrl: "", price: "" });
  const dialogOpenRef = useRef(isAddDialogOpen);

  useEffect(() => {
    dialogOpenRef.current = isAddDialogOpen;
  }, [isAddDialogOpen]);

  useEffect(() => {
    setSearchCategory(categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    if (openAddDialog && !isAddDialogOpen) {
      setIsAddDialogOpen(true);
    }
  }, [openAddDialog]);

  const form = useForm<AddItemFormData>({
    defaultValues: {
      title: "",
      description: "",
      affiliateUrl: "",
      imageUrl: "",
      price: "",
      priceTier: "starter",
      visibility: "public",
    },
  });

  const { data: items = [], isLoading } = useQuery<RegistryItem[]>({
    queryKey: ["/api/registry"],
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemFormData) => {
      const res = await apiRequest("POST", "/api/registry", {
        ...data,
        price: data.price,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Added",
        description: "Your wishlist item has been added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/registry"] });
      abortDiscovery();
      setIsAddDialogOpen(false);
      setCurrentStep(1);
      setUrlPasted(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchError("");
      setPreview(null);
      setPreviewMessage("");
      setSearchCurrencyMessage("");
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", variant: "destructive" });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add item. Please check all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/registry/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Item Removed",
        description: "The item has been removed from your wishlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/registry"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", variant: "destructive" });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddItemFormData) => {
    addItemMutation.mutate(data);
  };

  const browseRetailer = (url: string) => () => window.open(url, "_blank");

  const scrapeAbortRef = useRef<AbortController | null>(null);

  const clearAutofilledDetails = () => {
    for (const field of ["title", "imageUrl", "price"] as const) {
      if (autofilledRef.current[field] && form.getValues(field) === autofilledRef.current[field]) {
        form.setValue(field, "");
      }
    }
    autofilledRef.current = { title: "", imageUrl: "", price: "" };
    form.setValue("priceTier", suggestWishlistPriceTier(form.getValues("price")));
  };

  const abortDiscovery = () => {
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    scrapeAbortRef.current?.abort();
    scrapeAbortRef.current = null;
    if (scrapeTimerRef.current) {
      clearTimeout(scrapeTimerRef.current);
      scrapeTimerRef.current = null;
    }
    searchSequenceRef.current += 1;
    previewSequenceRef.current += 1;
    setIsSearching(false);
    setIsScraping(false);
  };

  useEffect(() => () => {
    searchAbortRef.current?.abort();
    scrapeAbortRef.current?.abort();
    searchAbortRef.current = null;
    scrapeAbortRef.current = null;
    searchSequenceRef.current += 1;
    previewSequenceRef.current += 1;
    if (scrapeTimerRef.current) {
      clearTimeout(scrapeTimerRef.current);
      scrapeTimerRef.current = null;
    }
  }, []);

  const runSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError("");
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const sequence = ++searchSequenceRef.current;
    setIsSearching(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({ q: query, category: searchCategory });
      const response = await fetch(`/api/wishlist/search?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      let payload: WishlistSearchResponse | null = null;
      if (response.ok) {
        payload = await response.json() as WishlistSearchResponse;
      } else {
        let responseMessage = "";
        try {
          const failure = await response.json() as { message?: string; error?: string };
          responseMessage = failure.message || failure.error || "";
        } catch {
          responseMessage = await response.text().catch(() => "");
        }
        throw Object.assign(new Error(responseMessage || `Search failed (${response.status})`), { status: response.status });
      }
      if (controller.signal.aborted || sequence !== searchSequenceRef.current || !dialogOpenRef.current) return;
      const results = Array.isArray(payload?.results) ? payload.results : [];
      setSearchResults(results);
      if (payload?.message) setSearchError(payload.message);
      else if (results.length === 0) setSearchError("No matching products were found. Try another search or paste a product link.");
    } catch (error) {
      if (controller.signal.aborted || sequence !== searchSequenceRef.current || !dialogOpenRef.current) return;
      const message = error instanceof Error ? error.message : "";
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status)
        : 0;
      const providerUnavailable = status === 503 || message.toLowerCase().includes("not configured");
      setSearchResults([]);
      setSearchError(providerUnavailable
        ? "Product search is not configured right now. You can still paste a product link or enter details manually."
        : "Search could not be completed. You can still paste a product link or enter details manually.");
    } finally {
      if (sequence === searchSequenceRef.current) setIsSearching(false);
      if (searchAbortRef.current === controller) searchAbortRef.current = null;
    }
  };

  const scrapeUrl = async (url: string) => {
    scrapeAbortRef.current?.abort();
    const controller = new AbortController();
    scrapeAbortRef.current = controller;
    const sequence = ++previewSequenceRef.current;
    if (url !== activeUrlRef.current) clearAutofilledDetails();
    const valuesAtRequest = form.getValues();
    activeUrlRef.current = url;
    setPreview(null);
    setPreviewMessage("");
    setIsScraping(true);
    try {
      const response = await fetch("/api/wishlist/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Preview request failed (${response.status})`);
      const data = await response.json() as WishlistPreview;
      if (controller.signal.aborted || sequence !== previewSequenceRef.current || activeUrlRef.current !== url || !dialogOpenRef.current) return;
      setPreview(data);
      if (data.error === "unavailable") {
        setPreviewMessage("We could not read product details from this page. Add the details below, or try another link.");
        return;
      }
      if (data.title && form.getValues("title") === valuesAtRequest.title) {
        form.setValue("title", data.title);
        autofilledRef.current.title = data.title;
      }
      if (data.imageUrl && form.getValues("imageUrl") === valuesAtRequest.imageUrl) {
        form.setValue("imageUrl", data.imageUrl);
        autofilledRef.current.imageUrl = data.imageUrl;
      }
      if (data.price && data.currency?.toUpperCase() === "USD" && form.getValues("price") === valuesAtRequest.price) {
        form.setValue("price", data.price);
        autofilledRef.current.price = data.price;
        form.setValue("priceTier", suggestWishlistPriceTier(data.price));
      } else if (data.price && data.currency?.toUpperCase() !== "USD") {
        if (form.getValues("price") === valuesAtRequest.price) form.setValue("price", "");
        setPreviewMessage(data.currency
          ? `Price shown in ${data.currency}; enter the amount in US dollars below.`
          : "The price currency could not be confirmed. Enter the amount in US dollars below.");
      }
      if (!data.title && !data.imageUrl && !data.price) {
        setPreviewMessage("Product details were not available. You can enter them manually below.");
      }
    } catch (error) {
      if (controller.signal.aborted || sequence !== previewSequenceRef.current || !dialogOpenRef.current) return;
      setPreview(null);
      setPreviewMessage("We could not preview this page. You can still enter the product details manually.");
    } finally {
      if (!controller.signal.aborted && sequence === previewSequenceRef.current) setIsScraping(false);
      if (scrapeAbortRef.current === controller) scrapeAbortRef.current = null;
    }
  };

  const chooseSearchResult = (result: WishlistPreview) => {
    if (!isHttpsUrl(result.url)) {
      setSearchError("This result does not have a secure HTTPS product link. Choose another result or paste a secure link.");
      return;
    }
    abortDiscovery();
    setPreview(result);
    setPreviewMessage("");
    setSearchCurrencyMessage("");
    form.setValue("affiliateUrl", result.url, { shouldValidate: true });
    form.setValue("title", result.title);
    form.setValue("imageUrl", result.imageUrl || "");
    activeUrlRef.current = result.url;
    autofilledRef.current = { title: result.title, imageUrl: result.imageUrl || "", price: "" };
    if (result.currency?.toUpperCase() === "USD") {
      form.setValue("price", result.price || "");
      autofilledRef.current.price = result.price || "";
      form.setValue("priceTier", suggestWishlistPriceTier(result.price));
    } else {
      form.setValue("price", "");
      setSearchCurrencyMessage(result.price
        ? `This result is priced in ${result.currency || "an unconfirmed currency"}. Enter its US dollar amount to continue.`
        : "The price is unavailable. Enter its US dollar amount to continue.");
    }
    setUrlPasted(true);
    setCurrentStep(2);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        form.setValue("affiliateUrl", text);
        
        try {
          const url = new URL(text);
          if (url.protocol !== "https:") throw new Error("Invalid URL");
          setUrlPasted(true);
          setCurrentStep(2);
          scrapeUrl(text);
        } catch {
          toast({
            title: "Invalid URL",
            description: "The clipboard doesn't contain a valid URL.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Clipboard Access Denied",
        description: "Please paste the URL manually in the field below.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      abortDiscovery();
      if (scrapeTimerRef.current) {
        clearTimeout(scrapeTimerRef.current);
        scrapeTimerRef.current = null;
      }
      activeUrlRef.current = "";
      autofilledRef.current = { title: "", imageUrl: "", price: "" };
      setCurrentStep(1);
      setUrlPasted(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchError("");
      setPreview(null);
      setPreviewMessage("");
      setSearchCurrencyMessage("");
      form.reset();
    }
    setIsAddDialogOpen(open);
    onAddDialogChange?.(open);
  };

  const scrapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUrlChange = (value: string) => {
    if (scrapeTimerRef.current) {
      clearTimeout(scrapeTimerRef.current);
      scrapeTimerRef.current = null;
    }
    scrapeAbortRef.current?.abort();
    scrapeAbortRef.current = null;
    previewSequenceRef.current += 1;
    if (value !== activeUrlRef.current) clearAutofilledDetails();
    activeUrlRef.current = value;
    setPreview(null);
    setPreviewMessage("");
    setIsScraping(false);
    // Typing must not replace this input with the review step mid-URL.
    // A full paste or the explicit Continue button starts the preview.
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <CardTitle>Items of Interest</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <AmazonWishlistImport />
            <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-wishlist-item">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md flex flex-col max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Add Wishlist Item</DialogTitle>
                <DialogDescription>
                  Add items or experiences you'd love to receive.
                </DialogDescription>
              </DialogHeader>

              {currentStep === 1 && !urlPasted && (
                <div className="space-y-6 overflow-y-auto flex-1">
                  <section className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4 space-y-3" aria-label="Search products">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm">Find something to add</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Search products and experiences without leaving your wishlist.</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={searchQuery}
                        placeholder="Try wireless earbuds or a jazz club"
                        aria-label="Search wishlist products"
                        data-testid="input-wishlist-search"
                        onChange={(event) => {
                          searchAbortRef.current?.abort();
                          searchAbortRef.current = null;
                          searchSequenceRef.current += 1;
                          setIsSearching(false);
                          setSearchQuery(event.target.value);
                          setSearchError("");
                          setSearchResults([]);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void runSearch();
                          }
                        }}
                      />
                      <Button type="button" onClick={() => void runSearch()} disabled={isSearching || !searchQuery.trim()} className="sm:min-w-[104px]" data-testid="button-wishlist-search">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        {isSearching ? "Searching" : "Search"}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Search category">
                      {([
                        ["all", "All"],
                        ["gifts", "Gifts"],
                        ["experiences", "Experiences"],
                      ] as const).map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={searchCategory === value ? "secondary" : "ghost"}
                          className="h-7 px-3 text-xs"
                          onClick={() => {
                            searchAbortRef.current?.abort();
                            searchAbortRef.current = null;
                            searchSequenceRef.current += 1;
                            setIsSearching(false);
                            setSearchCategory(value);
                            setSearchResults([]);
                            setSearchError("");
                          }}
                          data-testid={`wishlist-search-category-${value}`}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    {searchError && (
                      <p role="status" className="rounded-md border border-muted bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                        {searchError}
                      </p>
                    )}
                    {searchResults.length > 0 && (
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1" aria-label="Search results">
                        {searchResults.map((result, index) => (
                          <div key={`${result.url}-${index}`} className="flex items-center gap-3 rounded-lg border bg-background p-2.5">
                            {result.imageUrl ? (
                              <img src={result.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover bg-muted" />
                            ) : (
                              <div className="h-14 w-14 shrink-0 rounded-md bg-muted flex items-center justify-center">
                                <Gift className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-medium">{result.title}</p>
                              <p className="text-xs text-muted-foreground">{result.currency} {result.price} · {result.platform}</p>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={() => chooseSearchResult(result)} data-testid={`button-add-search-result-${index}`}>
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      How to add an item
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Click a button below to browse shopping or experiences</li>
                      <li>Find the item you want and copy its URL</li>
                      <li>Come back here and paste the URL</li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Shopping</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://www.amazon.com")}
                          data-testid="button-browse-amazon"
                        >
                          <SiAmazon className="w-5 h-5" />
                          <span className="text-xs">Amazon</span>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Beauty & Self-Care</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://promeed.com")}
                          data-testid="button-browse-promeed"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span className="text-xs">Promeed</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://www.lashterally.com")}
                          data-testid="button-browse-lashterally"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span className="text-xs">Lashterally</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://yczfragrance.com")}
                          data-testid="button-browse-yczfragrance"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span className="text-xs">YCZ Fragrance</span>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Fun & Novelty</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://abracadabranyc.com")}
                          data-testid="button-browse-abracadabranyc"
                        >
                          <Gift className="w-5 h-5" />
                          <span className="text-xs">Abracadabra NYC</span>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Travel Experiences</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://www.viator.com")}
                          data-testid="button-browse-viator"
                        >
                          <Plane className="w-5 h-5" />
                          <span className="text-xs">Viator</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://www.klook.com")}
                          data-testid="button-browse-klook"
                        >
                          <Plane className="w-5 h-5" />
                          <span className="text-xs">Klook</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Found an item?
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={handlePasteFromClipboard}
                    data-testid="button-paste-url"
                  >
                    <Clipboard className="w-4 h-4" />
                    Paste Product URL from Clipboard
                  </Button>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Or paste the URL manually below:
                    </p>
                    <Input
                      placeholder="Paste product or experience link..."
                      value={form.watch("affiliateUrl")}
                      onChange={(e) => {
                        form.setValue("affiliateUrl", e.target.value);
                        handleUrlChange(e.target.value);
                      }}
                      onPaste={(event) => {
                        const value = event.clipboardData.getData("text").trim();
                        if (!isHttpsUrl(value)) return;
                        event.preventDefault();
                        form.setValue("affiliateUrl", value);
                        handleUrlChange(value);
                        setUrlPasted(true);
                        setCurrentStep(2);
                        void scrapeUrl(value);
                      }}
                      data-testid="input-item-url-step1"
                    />
                    {form.watch("affiliateUrl") && !urlPasted && (
                      <Button
                        type="button"
                        className="w-full gap-2"
                        onClick={() => {
                          const url = form.getValues("affiliateUrl");
                          if (url) {
                            try {
                              if (isHttpsUrl(url)) {
                                setUrlPasted(true);
                                setCurrentStep(2);
                                scrapeUrl(url);
                              } else {
                                toast({
                                  title: "Invalid URL",
                                  description: "Please enter a valid product URL.",
                                  variant: "destructive",
                                });
                              }
                            } catch {
                              toast({
                                title: "Invalid URL",
                                description: "Please enter a valid product URL.",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        data-testid="button-add-url"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Add This Item
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {(currentStep === 2 || urlPasted) && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                    <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                    <FormField
                      control={form.control}
                      name="affiliateUrl"
                      rules={{ 
                        required: "Product URL is required",
                        validate: (value) => {
                          if (!value) return "Product URL is required";
                          try {
                            if (!isHttpsUrl(value)) return "Please use a public HTTPS product URL";
                            return true;
                          } catch {
                            return "Please enter a valid URL";
                          }
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 overflow-hidden">
                            {isScraping ? (
                              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            )}
                            <div className="text-sm flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-green-700 dark:text-green-400">
                                {isScraping ? "Fetching product details..." : "URL Added"}
                              </p>
                              <p className="text-muted-foreground truncate text-xs break-all">
                                {field.value}
                              </p>
                            </div>
                          </div>
                          {!isPartnerProductUrl(field.value) && (
                            <p className="text-xs text-muted-foreground">
                              You can save this link to your wishlist. Gifting is currently available only through supported retailers.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {preview && (
                      <div className="rounded-lg border bg-muted/30 p-3" data-testid="wishlist-product-preview">
                        <div className="flex gap-3">
                          {preview.imageUrl ? (
                            <img src={preview.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover bg-muted" />
                          ) : (
                            <div className="h-16 w-16 shrink-0 rounded-md bg-muted flex items-center justify-center">
                              <Gift className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 self-center">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{preview.platform || "Product preview"}</p>
                            <p className="line-clamp-2 text-sm font-medium">{preview.title || "Product details"}</p>
                            {(preview.price || preview.currency) && (
                              <p className="mt-0.5 text-sm font-semibold">{preview.currency} {preview.price}</p>
                            )}
                          </div>
                        </div>
                        {previewMessage && <p className="mt-2 text-xs text-muted-foreground">{previewMessage}</p>}
                      </div>
                    )}
                    {!preview && previewMessage && (
                      <p role="status" className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        {previewMessage}
                      </p>
                    )}
                    {searchCurrencyMessage && (
                      <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        {searchCurrencyMessage}
                      </p>
                    )}
                    {isScraping && !preview && (
                      <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/20 px-3 py-2 text-xs text-muted-foreground" role="status">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Checking the product page. You can continue entering details.
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="title"
                      rules={{ required: "Title is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Wireless Earbuds" 
                              {...field}
                              data-testid="input-item-title" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      rules={{ 
                        required: "Price is required",
                        validate: (value) => {
                          const num = parseFloat(value);
                          if (isNaN(num)) return "Please enter a valid price";
                          if (num < GIFT_MINIMUM_VALUE) return `Minimum price is $${GIFT_MINIMUM_VALUE}`;
                          return true;
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min={GIFT_MINIMUM_VALUE}
                              placeholder="29.99" 
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const price = parseFloat(e.target.value);
                                if (!isNaN(price)) {
                                  if (price >= 100) form.setValue("priceTier", "vip");
                                  else if (price >= 50) form.setValue("priceTier", "impressive");
                                  else form.setValue("priceTier", "starter");
                                }
                              }}
                              data-testid="input-item-price" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://..." 
                              {...field}
                              data-testid="input-item-image" 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Right-click the product image and copy image address
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priceTier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Tier</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-price-tier">
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="starter">Starter (Under $50)</SelectItem>
                              <SelectItem value="impressive">Impressive ($50 to under $100)</SelectItem>
                              <SelectItem value="vip">VIP ($100+)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Who Can See This</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-visibility">
                                <SelectValue placeholder="Select visibility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">Everyone</SelectItem>
                              <SelectItem value="matches_only">Matches Only</SelectItem>
                              <SelectItem value="after_gate1">After Chapter 1</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Why you'd love this..."
                              className="resize-none"
                              {...field}
                              data-testid="input-item-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    </div>
                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t mt-4 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          abortDiscovery();
                          if (scrapeTimerRef.current) {
                            clearTimeout(scrapeTimerRef.current);
                            scrapeTimerRef.current = null;
                          }
                          activeUrlRef.current = "";
                          setCurrentStep(1);
                          setUrlPasted(false);
                          setPreview(null);
                          setPreviewMessage("");
                          setSearchCurrencyMessage("");
                          form.reset();
                        }}
                        data-testid="button-back-step1"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addItemMutation.isPending}
                        data-testid="button-submit-add-item"
                      >
                        {addItemMutation.isPending ? "Adding..." : "Add to Wishlist"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <CardDescription>
          Create your wishlist. When someone purchases an item, it unlocks gates automatically. PayGate earns a small commission on purchases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse bg-muted rounded-md" />
            ))}
          </div>
        ) : (() => {
          const filteredItems = categoryFilter === "all" 
            ? items 
            : items.filter(item => getItemCategory(item.affiliateUrl) === categoryFilter);
          
          return filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {items.length === 0 ? (
                <>
                  <p>No items in your wishlist yet</p>
                  <p className="text-sm">Add items to show potential matches what you'd love to receive</p>
                </>
              ) : (
                <>
                  <p>No {categoryFilter} in this category</p>
                  <p className="text-sm">Try a different category or add new items</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
                data-testid={`wishlist-item-${item.id}`}
              >
                {item.imageUrl && (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium truncate">{item.title}</h4>
                      <p className="text-lg font-bold">${item.price}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {priceTierLabels[item.priceTier as keyof typeof priceTierLabels]?.label || item.priceTier}
                      </Badge>
                      {item.isPurchased && (
                        <Badge variant="secondary">Purchased</Badge>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {visibilityLabels[item.visibility as keyof typeof visibilityLabels]?.icon && (
                        <span>
                          {(() => {
                            const Icon = visibilityLabels[item.visibility as keyof typeof visibilityLabels]?.icon;
                            return Icon ? <Icon className="w-3 h-3" /> : null;
                          })()}
                        </span>
                      )}
                      {visibilityLabels[item.visibility as keyof typeof visibilityLabels]?.label || item.visibility}
                    </div>
                    <a 
                      href={item.affiliateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Product
                    </a>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteItemMutation.mutate(item.id)}
                  disabled={deleteItemMutation.isPending || item.isPurchased}
                  data-testid={`button-delete-item-${item.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
