import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import DashboardLayout from "@/pages/dashboard-layout";
import GiftSuccess from "@/pages/gift-success";
import GiftCancel from "@/pages/gift-cancel";
import SubscriptionSuccess from "@/pages/subscription-success";
import InvitePage from "@/pages/invite";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import NotFound from "@/pages/not-found";
import { AssistantChat } from "@/components/assistant-chat";

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
    <>
      <Switch>
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/invite/:referralCode" component={InvitePage} />
        {!user ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={DashboardLayout} />
            <Route path="/discover" component={DashboardLayout} />
            <Route path="/nearby" component={DashboardLayout} />
            <Route path="/matches" component={DashboardLayout} />
            <Route path="/messages" component={DashboardLayout} />
            <Route path="/profile" component={DashboardLayout} />
            <Route path="/verification" component={DashboardLayout} />
            <Route path="/settings" component={DashboardLayout} />
            <Route path="/wallet" component={DashboardLayout} />
            <Route path="/gift-success" component={GiftSuccess} />
            <Route path="/gift-cancel" component={GiftCancel} />
            <Route path="/subscription/success" component={SubscriptionSuccess} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      {user && <AssistantChat />}
    </>
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
