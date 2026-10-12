import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MailCheck, ShieldAlert } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export interface NativeAuthStatus {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  canSetPassword: boolean;
  replitEmailMismatch: boolean;
  passwordPromptSkipped: boolean;
}

export function useNativeAuthStatus(enabled = true) {
  return useQuery<NativeAuthStatus>({
    queryKey: ["/api/native-auth/status"],
    queryFn: async () => (await apiRequest("GET", "/api/native-auth/status")).json(),
    enabled,
    retry: false,
  });
}

export function VerificationBanner() {
  const { isAuthenticated } = useAuth();
  const { data: status } = useNativeAuthStatus(isAuthenticated);
  const [message, setMessage] = useState("");
  const resend = useMutation({
    mutationFn: async () => await (await apiRequest("POST", "/api/native-auth/resend-verification", {})).json() as { sent: boolean },
    onSuccess: (result) => setMessage(result.sent ? "A verification link is on its way." : "If we can send a verification link, it will arrive shortly."),
    onError: () => setMessage("We couldn’t send that link. Please try again shortly."),
  });

  if (!isAuthenticated || !status || status.emailVerified) return null;
  return (
    <aside className="relative z-[70] border-b border-amber-800/10 bg-[hsl(43_76%_92%)] px-4 py-2.5 text-[hsl(28_43%_23%)]" aria-label="Email verification notice">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p className="flex items-start gap-2 text-xs leading-5 sm:text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>Verify your email</strong> to keep your account current. Only paid checkout and gifting are blocked until you verify.</span>
        </p>
        <div className="flex items-center gap-3 pl-6 sm:pl-0">
          {message && <span role="status" className="text-xs">{message}</span>}
          <Button variant="outline" size="sm" disabled={resend.isPending} onClick={() => resend.mutate()} className="h-8 shrink-0 border-amber-900/20 bg-transparent text-[hsl(28_43%_23%)] hover:bg-amber-900/5">
            <MailCheck className="mr-1.5 h-3.5 w-3.5" />{resend.isPending ? "Sending…" : "Send verification link"}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function PasswordSetupReminder() {
  const { isAuthenticated } = useAuth();
  const { data: status } = useNativeAuthStatus(isAuthenticated);
  if (!isAuthenticated || !status || status.hasPassword) return null;
  return (
    <aside className="relative z-[69] border-b border-primary/10 bg-[hsl(var(--primary)/.045)] px-4 py-2 text-foreground" aria-label="Password reminder">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-1.5 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 sm:text-sm">Add a password for a quicker sign-in next time. Your account stays available as-is.</p>
        <Link href="/set-password" className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline sm:shrink-0 sm:text-sm">
          Set a password <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}
