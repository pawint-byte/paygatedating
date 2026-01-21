import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Calendar, MapPin, CreditCard, Sparkles } from "lucide-react";

const datePlanFormSchema = z.object({
  activity: z.string().min(3, "Activity must be at least 3 characters"),
  activityType: z.string().optional(),
  placeName: z.string().optional(),
  placeAddress: z.string().optional(),
  proposedDate: z.string().min(1, "Please select a date and time"),
  paymentPreference: z.enum(["ill_pay", "you_pay", "split"]),
  notes: z.string().optional(),
});

type DatePlanFormData = z.infer<typeof datePlanFormSchema>;

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
  const { toast } = useToast();

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
