import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Gift, Plus, Trash2, ExternalLink, Lock, Users, Globe, Clipboard, ShoppingBag, CheckCircle2, Plane, Gem, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RegistryItem } from "@shared/schema";
import { GIFT_MINIMUM_VALUE } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SiAmazon } from "react-icons/si";

const SUPPORTED_HOSTNAMES = [
  'amazon.com', 'amzn.to', 'amzn.com', 'a.co',
  'viator.com', 'klook.com', 'tp.st', 'travelpayouts.com',
  'net-a-porter.com', 'mrporter.com',
  'promeed.com', 'promfreed.com',
  'lashterally.com',
  'abracadabranyc.com',
  'yczfragrance.com',
];

function isSupportedRetailer(hostname: string): boolean {
  return SUPPORTED_HOSTNAMES.some(h => hostname.includes(h));
}

const SUPPORTED_RETAILERS_LIST = "Amazon, Viator, Klook, Net-a-Porter, MR PORTER, Promeed, Lashterally, Abracadabra NYC, and YCZ Fragrance";

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
  impressive: { label: "Impressive", description: "$50-$100", icon: Gift },
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
      setIsAddDialogOpen(false);
      setCurrentStep(1);
      setUrlPasted(false);
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

  const scrapeUrl = async (url: string) => {
    if (scrapeAbortRef.current) {
      scrapeAbortRef.current.abort();
    }
    const controller = new AbortController();
    scrapeAbortRef.current = controller;

    setIsScraping(true);
    try {
      const response = await apiRequest("POST", "/api/registry/scrape-url", { url });
      if (controller.signal.aborted) return;
      
      const data = await response.json();
      if (controller.signal.aborted) return;

      if (data.error) {
        toast({
          title: "Link Added",
          description: data.error === "scrape_failed" 
            ? "Couldn't load the page. Please fill in details manually."
            : "Please fill in the product details manually.",
        });
        return;
      }

      if (data.title) form.setValue("title", data.title);
      if (data.price) form.setValue("price", data.price);
      if (data.imageUrl) form.setValue("imageUrl", data.imageUrl);
      if (data.priceTier) form.setValue("priceTier", data.priceTier);
      
      const filledFields = [data.title, data.price, data.imageUrl].filter(Boolean).length;
      if (filledFields > 0) {
        toast({
          title: "Product Details Found",
          description: `Auto-filled ${filledFields} field${filledFields > 1 ? "s" : ""} from ${data.platform || "the link"}. Review and adjust as needed.`,
        });
      } else {
        toast({
          title: "Link Added",
          description: "Couldn't auto-detect product details. Please fill them in manually.",
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      toast({
        title: "Link Added",
        description: "Please fill in the product details manually.",
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsScraping(false);
      }
      if (scrapeAbortRef.current === controller) {
        scrapeAbortRef.current = null;
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        form.setValue("affiliateUrl", text);
        
        try {
          const url = new URL(text);
          const hostname = url.hostname.toLowerCase();
          
          if (isSupportedRetailer(hostname)) {
            setUrlPasted(true);
            setCurrentStep(2);
            scrapeUrl(text);
          } else {
            toast({
              title: "Invalid Link",
              description: `Only ${SUPPORTED_RETAILERS_LIST} links are supported.`,
              variant: "destructive",
            });
          }
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
      setCurrentStep(1);
      setUrlPasted(false);
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
    if (value) {
      try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        if (isSupportedRetailer(hostname)) {
          setUrlPasted(true);
          setCurrentStep(2);
          scrapeTimerRef.current = setTimeout(() => {
            scrapeUrl(value);
          }, 500);
        }
      } catch {
        // Invalid URL, don't advance
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <CardTitle>Items of Interest</CardTitle>
          </div>
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
                      <div className="grid grid-cols-3 gap-2">
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
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://www.net-a-porter.com")}
                          data-testid="button-browse-netaporter"
                        >
                          <Gem className="w-5 h-5" />
                          <span className="text-xs">Net-a-Porter</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 flex-col gap-1"
                          onClick={browseRetailer("https://www.mrporter.com")}
                          data-testid="button-browse-mrporter"
                        >
                          <Gem className="w-5 h-5" />
                          <span className="text-xs">MR PORTER</span>
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
                              const urlObj = new URL(url);
                              const hostname = urlObj.hostname.toLowerCase();
                              if (isSupportedRetailer(hostname)) {
                                setUrlPasted(true);
                                setCurrentStep(2);
                                scrapeUrl(url);
                              } else {
                                toast({
                                  title: "Invalid Link",
                                  description: `Only ${SUPPORTED_RETAILERS_LIST} links are supported.`,
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
                            const url = new URL(value);
                            const hostname = url.hostname.toLowerCase();
                            if (!isSupportedRetailer(hostname)) {
                              return `Only ${SUPPORTED_RETAILERS_LIST} links are supported`;
                            }
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="impressive">Impressive ($50-$100)</SelectItem>
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
                          setCurrentStep(1);
                          setUrlPasted(false);
                          form.reset();
                        }}
                        data-testid="button-back-step1"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addItemMutation.isPending || isScraping}
                        data-testid="button-submit-add-item"
                      >
                        {addItemMutation.isPending ? "Adding..." : isScraping ? "Loading details..." : "Add to Wishlist"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
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
