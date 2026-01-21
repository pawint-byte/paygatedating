import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, MapPin, CreditCard, Sparkles, Heart, Ban, DollarSign, ChevronDown, Info } from "lucide-react";

const datePlanFormSchema = z.object({
  activity: z.string().min(3, "Activity must be at least 3 characters"),
  activityType: z.string().optional(),
  placeName: z.string().optional(),
  placeAddress: z.string().optional(),
  proposedDate: z.string().min(1, "Please select a date and time"),
  paymentPreference: z.enum(["ill_pay", "you_pay", "split"]),
  notes: z.string().optional(),
  preferences: z.array(z.string()).optional(),
  blacklist: z.array(z.string()).optional(),
  budgetFloor: z.number().min(0).optional(),
  budgetCeiling: z.number().min(0).optional(),
});

type DatePlanFormData = z.infer<typeof datePlanFormSchema>;

interface DatePreferences {
  datePreferences: string[];
  dateBlacklist: string[];
  dateBudgetFloor: number | null;
  dateBudgetCeiling: number | null;
}

const activityTypes = [
  { value: "dinner", label: "Dinner" },
  { value: "coffee", label: "Coffee" },
  { value: "drinks", label: "Drinks" },
  { value: "movie", label: "Movie" },
  { value: "outdoor", label: "Outdoor Activity" },
  { value: "museum", label: "Museum/Gallery" },
  { value: "concert", label: "Concert/Show" },
  { value: "sports", label: "Sports Event" },
  { value: "cooking", label: "Cooking Together" },
  { value: "walk", label: "Walk/Stroll" },
  { value: "other", label: "Other" },
];

const paymentOptions = [
  { value: "ill_pay", label: "I'll pay", description: "You cover the costs" },
  { value: "you_pay", label: "You pay", description: "They cover the costs" },
  { value: "split", label: "Split the bill", description: "Share the costs" },
];

interface DatePlanDialogProps {
  matchId: string;
  recipientId: string;
  recipientName: string;
  trigger?: React.ReactNode;
}

export function DatePlanDialog({ matchId, recipientId, recipientName, trigger }: DatePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [showPreferenceFields, setShowPreferenceFields] = useState(false);
  const [newPreference, setNewPreference] = useState("");
  const [newBlacklist, setNewBlacklist] = useState("");
  const { toast } = useToast();

  const { data: recipientPrefs } = useQuery<DatePreferences>({
    queryKey: ["/api/users", recipientId, "date-preferences"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${recipientId}/date-preferences`, { credentials: "include" });
      if (!res.ok) return { datePreferences: [], dateBlacklist: [], dateBudgetFloor: null, dateBudgetCeiling: null };
      return res.json();
    },
    enabled: open,
  });

  const hasPreferences = recipientPrefs && (
    recipientPrefs.datePreferences.length > 0 ||
    recipientPrefs.dateBlacklist.length > 0 ||
    recipientPrefs.dateBudgetFloor !== null ||
    recipientPrefs.dateBudgetCeiling !== null
  );

  const form = useForm<DatePlanFormData>({
    resolver: zodResolver(datePlanFormSchema),
    defaultValues: {
      activity: "",
      activityType: "",
      placeName: "",
      placeAddress: "",
      proposedDate: "",
      paymentPreference: "split",
      notes: "",
      preferences: [],
      blacklist: [],
      budgetFloor: undefined,
      budgetCeiling: undefined,
    },
  });

  const createDatePlanMutation = useMutation({
    mutationFn: async (data: DatePlanFormData) => {
      return apiRequest("POST", `/api/matches/${matchId}/date-plans`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "date-plans"] });
      toast({
        title: "Date Proposed!",
        description: `Your date idea has been sent to ${recipientName}.`,
      });
      form.reset();
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to propose date. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DatePlanFormData) => {
    createDatePlanMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-propose-date">
            <Calendar className="w-4 h-4 mr-2" />
            Plan a Date
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Plan a Date with {recipientName}
          </DialogTitle>
          <DialogDescription>
            Suggest an activity, place, and time. Let them know who's paying!
          </DialogDescription>
        </DialogHeader>

        {hasPreferences && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="w-4 h-4 text-primary" />
              <span>{recipientName}'s Preferences</span>
            </div>
            
            {recipientPrefs.datePreferences.length > 0 && (
              <div className="flex items-start gap-2">
                <Heart className="w-3 h-3 mt-1.5 text-green-500" />
                <div className="flex flex-wrap gap-1">
                  {recipientPrefs.datePreferences.map((pref) => (
                    <Badge key={pref} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {recipientPrefs.dateBlacklist.length > 0 && (
              <div className="flex items-start gap-2">
                <Ban className="w-3 h-3 mt-1.5 text-destructive" />
                <div className="flex flex-wrap gap-1">
                  {recipientPrefs.dateBlacklist.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs border-destructive/30 text-destructive">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {(recipientPrefs.dateBudgetFloor !== null || recipientPrefs.dateBudgetCeiling !== null) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>
                  Budget: {recipientPrefs.dateBudgetFloor !== null ? `$${recipientPrefs.dateBudgetFloor}` : "$0"}
                  {" - "}
                  {recipientPrefs.dateBudgetCeiling !== null ? `$${recipientPrefs.dateBudgetCeiling}` : "No limit"}
                </span>
              </div>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-activity-type">
                        <SelectValue placeholder="Choose an activity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Description *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Romantic dinner at Italian restaurant"
                      {...field}
                      data-testid="input-activity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="placeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Place Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Olive Garden"
                        {...field}
                        data-testid="input-place-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proposedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Date & Time *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        data-testid="input-proposed-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="placeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 123 Main St, City"
                      {...field}
                      data-testid="input-place-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Who's Paying? *
                  </FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={field.value === option.value ? "default" : "outline"}
                        className="flex flex-col h-auto py-3"
                        onClick={() => field.onChange(option.value)}
                        data-testid={`button-payment-${option.value}`}
                      >
                        <span className="font-medium text-sm">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={showPreferenceFields} onOpenChange={setShowPreferenceFields}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="w-3 h-3" />
                    Set Preferences & Budget for this Date
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPreferenceFields ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <div>
                    <FormLabel className="text-xs flex items-center gap-1 mb-2">
                      <Heart className="w-3 h-3 text-green-500" />
                      What I'd enjoy
                    </FormLabel>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(form.watch("preferences") || []).map((pref) => (
                        <Badge key={pref} variant="secondary" className="text-xs gap-1">
                          {pref}
                          <button
                            type="button"
                            onClick={() => {
                              const current = form.getValues("preferences") || [];
                              form.setValue("preferences", current.filter(p => p !== pref));
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newPreference}
                        onChange={(e) => setNewPreference(e.target.value)}
                        placeholder="e.g., outdoor seating, live music"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newPreference.trim()) {
                              const current = form.getValues("preferences") || [];
                              if (!current.includes(newPreference.trim())) {
                                form.setValue("preferences", [...current, newPreference.trim()]);
                              }
                              setNewPreference("");
                            }
                          }
                        }}
                        className="text-sm"
                        data-testid="input-date-preference"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (newPreference.trim()) {
                            const current = form.getValues("preferences") || [];
                            if (!current.includes(newPreference.trim())) {
                              form.setValue("preferences", [...current, newPreference.trim()]);
                            }
                            setNewPreference("");
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel className="text-xs flex items-center gap-1 mb-2">
                      <Ban className="w-3 h-3 text-destructive" />
                      Things to avoid
                    </FormLabel>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(form.watch("blacklist") || []).map((item) => (
                        <Badge key={item} variant="outline" className="text-xs gap-1 border-destructive/30 text-destructive">
                          {item}
                          <button
                            type="button"
                            onClick={() => {
                              const current = form.getValues("blacklist") || [];
                              form.setValue("blacklist", current.filter(b => b !== item));
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newBlacklist}
                        onChange={(e) => setNewBlacklist(e.target.value)}
                        placeholder="e.g., loud venues, crowded places"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newBlacklist.trim()) {
                              const current = form.getValues("blacklist") || [];
                              if (!current.includes(newBlacklist.trim())) {
                                form.setValue("blacklist", [...current, newBlacklist.trim()]);
                              }
                              setNewBlacklist("");
                            }
                          }
                        }}
                        className="text-sm"
                        data-testid="input-date-blacklist"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (newBlacklist.trim()) {
                            const current = form.getValues("blacklist") || [];
                            if (!current.includes(newBlacklist.trim())) {
                              form.setValue("blacklist", [...current, newBlacklist.trim()]);
                            }
                            setNewBlacklist("");
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="budgetFloor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Min</FormLabel>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min={0}
                              className="pl-7"
                              placeholder="0"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-date-budget-floor"
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">to</span>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="budgetCeiling"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Max</FormLabel>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min={0}
                              className="pl-7"
                              placeholder="No limit"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-date-budget-ceiling"
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requests or details..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createDatePlanMutation.isPending}
                data-testid="button-send-proposal"
              >
                {createDatePlanMutation.isPending ? "Sending..." : "Send Proposal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
