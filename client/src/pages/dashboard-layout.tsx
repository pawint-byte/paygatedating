import { useState } from "react";
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

import Discover from "./discover";
import Matches from "./matches";
import Messages from "./messages";
import ProfilePage from "./profile";
import Settings from "./settings";

export default function DashboardLayout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [addFundsOpen, setAddFundsOpen] = useState(false);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

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
        <AppSidebar user={user} profile={profile ?? null} />

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
              <Route path="/matches" component={Matches} />
              <Route path="/messages" component={Messages} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/settings" component={Settings} />
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
