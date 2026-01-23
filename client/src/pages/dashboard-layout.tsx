import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { WalletDisplay } from "@/components/dashboard/wallet-display";
import { AddFundsDialog } from "@/components/dashboard/add-funds-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Profile, Wallet, Transaction } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { ProfileCompleteness } from "@/lib/types";

import Discover from "./discover";
import Nearby from "./nearby";
import Matches from "./matches";
import Messages from "./messages";
import ProfilePage from "./profile";
import Verification from "./verification";
import Settings from "./settings";
import Wishlist from "./wishlist";
import Help from "./help";
import AdminFeedback from "./admin-feedback";
import { RewardsDashboard } from "@/components/dashboard/rewards-dashboard";

export default function DashboardLayout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const nudgeShownRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled');

    if (canceled) {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. No funds were added.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', location.split('?')[0]);
    }

    if (success && sessionId && !paymentVerified) {
      setPaymentVerified(true);
      apiRequest("POST", "/api/wallet/verify-payment", { sessionId })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            toast({
              title: "Payment Successful!",
              description: "Your wallet has been topped up.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
          }
        })
        .catch(error => {
          console.error("Payment verification error:", error);
          toast({
            title: "Verification Issue",
            description: "Please check your wallet balance. Contact support if funds are missing.",
            variant: "destructive",
          });
        })
        .finally(() => {
          window.history.replaceState({}, '', location.split('?')[0]);
        });
    }
  }, [location, paymentVerified, toast]);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

  const { data: completeness } = useQuery<ProfileCompleteness>({
    queryKey: ["/api/profile/completeness"],
    enabled: !!user,
  });

  // Activity heartbeat - updates lastActiveAt on the backend
  useEffect(() => {
    if (!user) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/activity/heartbeat", { 
          method: "POST",
          credentials: "include" 
        });
      } catch (e) {
        // Silently fail - not critical
      }
    };
    
    // Send heartbeat on mount and every 5 minutes
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Record login streak on mount
  useEffect(() => {
    if (!user) return;
    
    const recordStreak = async () => {
      try {
        const response = await apiRequest("POST", "/api/rewards/login-streak");
        const data = await response.json();
        
        if (data.rewardEarned) {
          toast({
            title: "Streak Reward Earned!",
            description: `You earned $5 for your ${data.newStreak}-day login streak!`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
          queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
        } else if (data.streakUpdated && data.newStreak === 1) {
          // Streak was reset, notify user
        }
      } catch (e) {
        // Silently fail - not critical
      }
    };
    
    recordStreak();
  }, [user, toast]);

  useEffect(() => {
    if (!completeness || nudgeShownRef.current) return;
    
    const sessionKey = `nudge_shown_${new Date().toDateString()}`;
    if (sessionStorage.getItem(sessionKey)) return;
    
    const timer = setTimeout(() => {
      if (nudgeShownRef.current) return;
      nudgeShownRef.current = true;
      sessionStorage.setItem(sessionKey, "true");
      
      if (!completeness.hasPhotos) {
        toast({
          title: "Add photos to stand out",
          description: "Profiles with photos get 10x more interest from potential matches.",
        });
      } else if (!completeness.hasBio) {
        toast({
          title: "Tell your story",
          description: "A compelling bio helps you connect with the right people.",
        });
      } else if (!completeness.hasWishlistItems) {
        toast({
          title: "Create your wishlist",
          description: "Add travel experiences or gifts you'd love to receive.",
        });
      } else if (!completeness.hasInterests) {
        toast({
          title: "Share your interests",
          description: "Help matches find common ground with your hobbies.",
        });
      } else if (completeness.score < 80) {
        toast({
          title: "Complete your profile",
          description: `Your profile is ${completeness.score}% complete. Add more details to attract more matches.`,
        });
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [completeness, toast]);

  const addFundsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/wallet/deposit", { amount });
      return await response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create payment session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar user={user ?? null} profile={profile ?? null} />

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h2 className="font-medium text-lg hidden sm:block">Dashboard</h2>
            </div>

            <div className="flex items-center gap-3">
              <WalletDisplay
                wallet={wallet ?? null}
                transactions={transactions}
                onAddFunds={() => setAddFundsOpen(true)}
              />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/discover" component={Discover} />
              <Route path="/nearby" component={Nearby} />
              <Route path="/matches" component={Matches} />
              <Route path="/messages" component={Messages} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/verification" component={Verification} />
              <Route path="/settings" component={Settings} />
              <Route path="/wishlist" component={Wishlist} />
              <Route path="/help" component={Help} />
              <Route path="/rewards" component={RewardsDashboard} />
              <Route path="/admin/feedback" component={AdminFeedback} />
              <Route>
                <Redirect to="/discover" />
              </Route>
            </Switch>
          </main>
        </div>

        <AddFundsDialog
          open={addFundsOpen}
          onOpenChange={setAddFundsOpen}
          onAddFunds={(amount) => addFundsMutation.mutate(amount)}
          isPending={addFundsMutation.isPending}
        />
      </div>
    </SidebarProvider>
  );
}
