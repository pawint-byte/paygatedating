import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Send, Clock, CheckCircle, AlertCircle, Lightbulb, MessageSquare } from "lucide-react";
import { insertFeedbackSchema, type Feedback } from "@shared/schema";

// Extend the shared schema with validation rules
const feedbackFormSchema = insertFeedbackSchema.extend({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200, "Subject must be 200 characters or less"),
  message: z.string().min(20, "Please provide more details (at least 20 characters)"),
}).omit({ userId: true });

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

const categoryLabels = {
  issue: { label: "Report an Issue", icon: AlertCircle, color: "text-red-500" },
  complaint: { label: "Complaint", icon: MessageSquare, color: "text-orange-500" },
  feature_request: { label: "Feature Request", icon: Lightbulb, color: "text-blue-500" },
  general: { label: "General Feedback", icon: HelpCircle, color: "text-green-500" },
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function Help() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("submit");

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      category: "general",
      subject: "",
      message: "",
    },
  });

  const { data: feedbackList, isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      return await apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you! We've received your feedback and will review it soon.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setActiveTab("history");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    submitMutation.mutate(data);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground">
            Submit feedback, report issues, or request new features
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit" data-testid="tab-submit">
            Submit Feedback
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            My Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>What would you like to share?</CardTitle>
              <CardDescription>
                We value your input and will review all submissions carefully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, { label, icon: Icon, color }]) => (
                              <SelectItem key={key} value={key} data-testid={`option-${key}`}>
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${color}`} />
                                  <span>{label}</span>
                                </div>
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
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief summary of your feedback"
                            {...field}
                            data-testid="input-subject"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please describe your feedback, issue, or suggestion in detail..."
                            className="min-h-[150px]"
                            {...field}
                            data-testid="input-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-feedback"
                  >
                    <Send className="w-4 h-4" />
                    {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Submissions</CardTitle>
              <CardDescription>
                Track the status of your previous feedback and requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : !feedbackList || feedbackList.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Your feedback helps us improve the platform for everyone.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("submit")} data-testid="button-first-feedback">
                    Submit Your First Feedback
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackList.map((item) => {
                    const categoryInfo = categoryLabels[item.category as keyof typeof categoryLabels];
                    const CategoryIcon = categoryInfo?.icon || HelpCircle;
                    return (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`feedback-item-${item.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className={`w-4 h-4 ${categoryInfo?.color || ""}`} />
                            <span className="font-medium">{item.subject}</span>
                          </div>
                          <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                            {item.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {item.status === "resolved" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.message}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Submitted on {formatDate(item.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
