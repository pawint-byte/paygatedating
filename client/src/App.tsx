import { Switch, Route, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SeasonalThemeProvider } from "@/contexts/seasonal-theme-context";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import DashboardLayout from "@/pages/dashboard-layout";
import GiftSuccess from "@/pages/gift-success";
import GiftCancel from "@/pages/gift-cancel";
import SubscriptionSuccess from "@/pages/subscription-success";
import InvitePage from "@/pages/invite";
import PublicProfile from "@/pages/public-profile";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import GiftDemo from "@/pages/gift-demo";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";
import FaqPage from "@/pages/faq";
import Safety from "@/pages/safety";
import Guidelines from "@/pages/guidelines";
import AssistantGuide from "@/pages/assistant-guide";
import { AssistantChat } from "@/components/assistant-chat";
import MemberSetup from "@/pages/member-setup";
import MemberGate from "@/pages/member-gate";
import AuthPage, { AccountPage } from "@/pages/auth";
import { VerificationBanner } from "@/components/auth/verification-banner";

type SetupGuardState = {
  accepted: boolean;
  gate: "serious_romance" | "activity_partner" | null;
  draft: unknown | null;
};

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const routePath = location.split("?")[0];
  const setupQuery = useQuery<SetupGuardState>({
    queryKey: ["/api/setup", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/setup", { credentials: "include" });
      if (!response.ok) throw new Error("Could not check profile setup");
      return response.json();
    },
    enabled: !!user && !isLoading,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (routePath === "/terms") return <Terms />;
  if (routePath === "/privacy") return <Privacy />;
  if (routePath === "/signup" || routePath === "/signup/complete" || routePath === "/login" || routePath === "/forgot-password" || routePath === "/reset-password" || routePath === "/auth/confirm") {
    if (user && (routePath === "/signup" || routePath === "/signup/complete" || routePath === "/login")) return <Redirect to={routePath.startsWith("/signup") ? "/setup" : "/"} />;
    const mode = routePath === "/signup" ? "signup" : routePath === "/signup/complete" ? "signup-complete" : routePath === "/forgot-password" ? "forgot-password" : routePath === "/reset-password" ? "reset-password" : routePath === "/auth/confirm" ? "confirm" : "login";
    return <AuthPage mode={mode} />;
  }
  if (routePath === "/account") return user ? <AccountPage /> : <Redirect to="/login" />;

  if (user && !setupQuery.data && !setupQuery.isError) {
    return (
      <div className="min-h-[100dvh] bg-background px-6 py-12">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-12 h-5 w-32 rounded bg-muted" />
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-5">
              <div className="h-12 w-4/5 rounded bg-muted" />
              <div className="h-5 w-full rounded bg-muted" />
              <div className="h-14 rounded-xl bg-muted" />
              <div className="h-32 rounded-xl bg-muted" />
            </div>
            <div className="h-96 rounded-3xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (user && setupQuery.isError) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl">We couldn’t check your setup</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Retry to continue. Your account stays here until we can confirm your profile state.</p>
          <button className="mt-6 h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={() => setupQuery.refetch()}>Try again</button>
        </section>
      </main>
    );
  }

  if (user && setupQuery.data && !setupQuery.data.accepted) {
    return <MemberSetup />;
  }

  if (user && setupQuery.data?.accepted && setupQuery.data.gate && (routePath === "/" || routePath === "/setup")) {
    return <Redirect to={setupQuery.data.gate === "serious_romance" ? "/serious-romance" : "/activity-partner"} />;
  }
  if (user && setupQuery.data?.accepted && !setupQuery.data.gate && routePath === "/setup") {
    return <Redirect to="/discover" />;
  }

  return (
    <>
      <Switch>
        <Route path="/safety" component={Safety} />
        <Route path="/guidelines" component={Guidelines} />
        <Route path="/assistant-guide" component={AssistantGuide} />
        <Route path="/gift-demo" component={GiftDemo} />
        <Route path="/contact" component={Contact} />
        <Route path="/pricing">
          <Landing initialTab="pricing" />
        </Route>
        <Route path="/how-it-works">
          <Landing initialTab="how-it-works" />
        </Route>
        <Route path="/features">
          <Landing initialTab="features" />
        </Route>
        <Route path="/stories">
          <Landing initialTab="stories" />
        </Route>
        <Route path="/faq">
          <FaqPage />
        </Route>
        <Route path="/invite/:referralCode" component={InvitePage} />
        <Route path="/p/:userId" component={PublicProfile} />
        <Route path="/serious-romance/p/:userId" component={PublicProfile} />
        <Route path="/activity-partner/p/:userId" component={PublicProfile} />
        {!user ? (
          <>
            <Route path="/nearby">
              <Landing />
            </Route>
            <Route path="/radar">
              <Landing />
            </Route>
            <Route path="/">
              <Landing />
            </Route>
          </>
        ) : (
          <>
            <Route path="/setup" component={MemberSetup} />
            <Route path="/account" component={AccountPage} />
            <Route path="/" component={DashboardLayout} />
            <Route path="/serious-romance">
              <MemberGate gate="serious_romance" />
            </Route>
            <Route path="/activity-partner">
              <MemberGate gate="activity_partner" />
            </Route>
            <Route path="/discover" component={DashboardLayout} />
            <Route path="/nearby" component={DashboardLayout} />
            <Route path="/radar" component={DashboardLayout} />
            <Route path="/matches" component={DashboardLayout} />
            <Route path="/messages" component={DashboardLayout} />
            <Route path="/profile" component={DashboardLayout} />
            <Route path="/verification" component={DashboardLayout} />
            <Route path="/settings" component={DashboardLayout} />
            <Route path="/assistant-access" component={DashboardLayout} />
            <Route path="/wallet" component={DashboardLayout} />
            <Route path="/wishlist" component={DashboardLayout} />
            <Route path="/feedback" component={DashboardLayout} />
            <Route path="/rewards" component={DashboardLayout} />
            <Route path="/admin/feedback" component={DashboardLayout} />
            <Route path="/admin/users" component={DashboardLayout} />
            <Route path="/gifts" component={DashboardLayout} />
            <Route path="/gift-success" component={GiftSuccess} />
            <Route path="/gift-cancel" component={GiftCancel} />
            <Route path="/subscription/success" component={SubscriptionSuccess} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      {user && setupQuery.data?.accepted && routePath !== "/serious-romance" && routePath !== "/activity-partner" && routePath !== "/assistant-access" && routePath !== "/assistant-guide" && <AssistantChat />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="paygate-ui-theme">
        <SeasonalThemeProvider>
          <TooltipProvider>
            <Toaster />
            <VerificationBanner />
            <Router />
          </TooltipProvider>
        </SeasonalThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
