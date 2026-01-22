import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertCircle, MessageSquare, Lightbulb, HelpCircle, Clock, CheckCircle, XCircle, Eye, Users } from "lucide-react";
import type { Feedback } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";

const categoryConfig = {
  issue: { label: "Issue", icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
  complaint: { label: "Complaint", icon: MessageSquare, color: "bg-orange-500/10 text-orange-500" },
  feature_request: { label: "Feature Request", icon: Lightbulb, color: "bg-blue-500/10 text-blue-500" },
  general: { label: "General", icon: HelpCircle, color: "bg-gray-500/10 text-gray-500" },
};

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-600" },
  reviewed: { label: "Reviewed", icon: Eye, color: "bg-blue-500/10 text-blue-600" },
  resolved: { label: "Resolved", icon: CheckCircle, color: "bg-green-500/10 text-green-600" },
  closed: { label: "Closed", icon: XCircle, color: "bg-gray-500/10 text-gray-600" },
};

export default function AdminFeedback() {
  const { toast } = useToast();

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: feedbackList, isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
    enabled: adminStatus?.isAdmin === true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/feedback/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({
        title: "Status Updated",
        description: "Feedback status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update feedback status.",
        variant: "destructive",
      });
    },
  });

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/seed-demo-profiles");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Profiles Created",
        description: `Created ${data.count} demo profiles: ${data.profiles.join(", ")}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", variant: "destructive" });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to seed demo profiles.",
        variant: "destructive",
      });
    },
  });

  if (adminStatus?.isAdmin === false) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have admin permissions to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = feedbackList ? {
    total: feedbackList.length,
    pending: feedbackList.filter(f => f.status === "pending").length,
    reviewed: feedbackList.filter(f => f.status === "reviewed").length,
    resolved: feedbackList.filter(f => f.status === "resolved").length,
    issues: feedbackList.filter(f => f.category === "issue").length,
    features: feedbackList.filter(f => f.category === "feature_request").length,
  } : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage user feedback and support requests</p>
          </div>
        </div>
        <Button 
          onClick={() => seedDemoMutation.mutate()}
          disabled={seedDemoMutation.isPending}
          data-testid="button-seed-demo-profiles"
        >
          <Users className="w-4 h-4 mr-2" />
          {seedDemoMutation.isPending ? "Creating..." : "Add Demo Profiles"}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-stat-pending">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-stat-reviewed">{stats.reviewed}</div>
              <p className="text-xs text-muted-foreground">Reviewed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600" data-testid="text-stat-resolved">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500" data-testid="text-stat-issues">{stats.issues}</div>
              <p className="text-xs text-muted-foreground">Issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-500" data-testid="text-stat-features">{stats.features}</div>
              <p className="text-xs text-muted-foreground">Feature Requests</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Feedback Submissions</CardTitle>
          <CardDescription>
            View and manage all user feedback, issues, and feature requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !feedbackList?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No feedback submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackList.map((item) => {
                    const category = categoryConfig[item.category as keyof typeof categoryConfig];
                    const status = statusConfig[item.status as keyof typeof statusConfig];
                    const CategoryIcon = category?.icon || HelpCircle;
                    const StatusIcon = status?.icon || Clock;

                    return (
                      <TableRow key={item.id} data-testid={`row-feedback-${item.id}`}>
                        <TableCell className="font-mono text-sm">#{item.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={category?.color}>
                            <CategoryIcon className="w-3 h-3 mr-1" />
                            {category?.label || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" data-testid={`text-subject-${item.id}`}>
                          {item.subject}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status?.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status?.label || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.createdAt!).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={(newStatus) => updateStatusMutation.mutate({ id: item.id, status: newStatus })}
                            data-testid={`select-status-${item.id}`}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`button-status-${item.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
