import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import DashboardLayout from "@/pages/dashboard-layout";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      {!user ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={DashboardLayout} />
          <Route path="/discover" component={DashboardLayout} />
          <Route path="/matches" component={DashboardLayout} />
          <Route path="/messages" component={DashboardLayout} />
          <Route path="/profile" component={DashboardLayout} />
          <Route path="/settings" component={DashboardLayout} />
          <Route path="/wallet" component={DashboardLayout} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="paygate-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
