import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Gift, Plus, Trash2, ExternalLink, Lock, Users, Globe, Clipboard, ShoppingBag, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RegistryItem } from "@shared/schema";
import { GIFT_MINIMUM_VALUE } from "@shared/schema";
import { useState } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SiAmazon, SiEtsy } from "react-icons/si";

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
  after_gate1: { label: "After Gate 1", icon: Lock },
};

export function WishlistManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [urlPasted, setUrlPasted] = useState(false);

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
      return await apiRequest("POST", "/api/registry", {
        ...data,
        price: data.price,
      });
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
        description: "Failed to add item.",
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
    const price = parseFloat(data.price);
    if (isNaN(price) || price < GIFT_MINIMUM_VALUE) {
      toast({
        title: "Invalid Price",
        description: `Minimum price is $${GIFT_MINIMUM_VALUE}`,
        variant: "destructive",
      });
      return;
    }
    addItemMutation.mutate(data);
  };

  const handleBrowseAmazon = () => {
    window.open("https://www.amazon.com", "_blank");
  };

  const handleBrowseEtsy = () => {
    window.open("https://www.etsy.com", "_blank");
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        form.setValue("affiliateUrl", text);
        
        // Validate URL
        try {
          const url = new URL(text);
          const hostname = url.hostname.toLowerCase();
          const isAmazon = hostname.includes('amazon.com') || hostname.includes('amzn.to') || hostname.includes('amzn.com');
          const isEtsy = hostname.includes('etsy.com');
          
          if (isAmazon || isEtsy) {
            setUrlPasted(true);
            setCurrentStep(2);
            toast({
              title: "URL Pasted",
              description: `${isAmazon ? 'Amazon' : 'Etsy'} link detected. Now fill in the details.`,
            });
          } else {
            toast({
              title: "Invalid Link",
              description: "Only Amazon and Etsy links are supported.",
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
  };

  const handleUrlChange = (value: string) => {
    if (value) {
      try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        const isAmazon = hostname.includes('amazon.com') || hostname.includes('amzn.to') || hostname.includes('amzn.com');
        const isEtsy = hostname.includes('etsy.com');
        if (isAmazon || isEtsy) {
          setUrlPasted(true);
          setCurrentStep(2);
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Wishlist Item</DialogTitle>
                <DialogDescription>
                  Add an item you'd love to receive from Amazon or Etsy.
                </DialogDescription>
              </DialogHeader>

              {currentStep === 1 && !urlPasted && (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      How to add an item
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Click a button below to browse Amazon or Etsy</li>
                      <li>Find the item you want and copy its URL</li>
                      <li>Come back here and paste the URL</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2"
                      onClick={handleBrowseAmazon}
                      data-testid="button-browse-amazon"
                    >
                      <SiAmazon className="w-6 h-6" />
                      <span>Browse Amazon</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2"
                      onClick={handleBrowseEtsy}
                      data-testid="button-browse-etsy"
                    >
                      <SiEtsy className="w-6 h-6" />
                      <span>Browse Etsy</span>
                    </Button>
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
                      placeholder="https://amazon.com/... or https://etsy.com/..."
                      value={form.watch("affiliateUrl")}
                      onChange={(e) => {
                        form.setValue("affiliateUrl", e.target.value);
                        handleUrlChange(e.target.value);
                      }}
                      data-testid="input-item-url-step1"
                    />
                  </div>
                </div>
              )}

              {(currentStep === 2 || urlPasted) && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-green-700 dark:text-green-400">URL Added</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {form.watch("affiliateUrl")}
                        </p>
                      </div>
                    </div>

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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                              <SelectItem value="after_gate1">After Gate 1 Payment</SelectItem>
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

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCurrentStep(1);
                          setUrlPasted(false);
                          form.setValue("affiliateUrl", "");
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
                        {addItemMutation.isPending ? "Adding..." : "Add Item"}
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
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items in your wishlist yet</p>
            <p className="text-sm">Add items to show potential matches what you'd love to receive</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
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
                      <p className="text-lg font-bold text-primary">${item.price}</p>
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
        )}
      </CardContent>
    </Card>
  );
}
