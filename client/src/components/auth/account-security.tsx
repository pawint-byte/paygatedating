import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNativeAuthStatus } from "@/components/auth/verification-banner";

function messageFromError(error: unknown) {
  if (!(error instanceof Error)) return "We couldn’t update your security settings. Please try again.";
  const text = error.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.error || text;
  } catch {
    return text;
  }
}

export function AccountSecurity({ passwordPrompt = false, onPasswordSaved }: { passwordPrompt?: boolean; onPasswordSaved?: () => void }) {
  const queryClient = useQueryClient();
  const { data: status, isLoading, isError, refetch } = useNativeAuthStatus();
  const { isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requestedLink, setRequestedLink] = useState(false);

  const setPasswordMutation = useMutation({
    mutationFn: async () => {
      const payload: { password: string; currentPassword?: string } = { password };
      if (status?.hasPassword) payload.currentPassword = currentPassword;
      return apiRequest("POST", "/api/native-auth/set-password", payload);
    },
    onSuccess: async () => {
      setPassword("");
      setError("");
      setNotice("Your password is set. Use it the next time you log in.");
      await queryClient.invalidateQueries({ queryKey: ["/api/native-auth/status"] });
      onPasswordSaved?.();
    },
    onError: (failure: Error) => setError(messageFromError(failure)),
  });

  const requestLink = useMutation({
    mutationFn: async () => {
      if (!status?.email) throw new Error("We couldn’t find the email for this account.");
      return (await apiRequest("POST", "/api/native-auth/request-link", { email: status.email })).json() as Promise<{message: string}>;
    },
    onSuccess: (result) => {
      setError("");
      setRequestedLink(true);
      setNotice(result.message);
    },
    onError: (failure: Error) => setError(messageFromError(failure)),
  });

  const passwordBytes = new TextEncoder().encode(password).length;
  const passwordChecks: [string, boolean][] = [
    ["At least 12 characters", Array.from(password).length >= 12],
    ["One uppercase letter", /[A-Z]/.test(password)],
    ["One lowercase letter", /[a-z]/.test(password)],
    ["One number", /\d/.test(password)],
    ["72 UTF-8 bytes or fewer", passwordBytes <= 72],
  ];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (Array.from(password).length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || passwordBytes > 72) {
      setError("Use at least 12 characters with uppercase, lowercase, and a number, and no more than 72 UTF-8 bytes.");
      return;
    }
    setPasswordMutation.mutate();
  };

  if (!isAuthenticated) return null;
  return (
    <Card className="overflow-hidden border-primary/15">
      <CardHeader className="bg-primary/[.035]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <CardTitle>Account security</CardTitle>
            <CardDescription className="mt-1">Manage how you sign in to PayGate.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {isLoading && <div className="space-y-3" aria-label="Loading account security"><div className="h-4 w-2/5 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded-lg bg-muted" /><div className="h-10 w-1/3 animate-pulse rounded-lg bg-muted" /></div>}
        {isError && <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">We couldn’t load your security details.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="mt-3">Try again</Button>
        </div>}
        {status && <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account email</p>
              <p className="mt-1 break-all text-sm font-medium">{status.email}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.emailVerified ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-900"}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />{status.emailVerified ? "Verified" : "Not verified"}
            </span>
          </div>
          {status.replitEmailMismatch && <p role="status" className="rounded-lg border border-amber-700/20 bg-amber-50 px-3 py-2 text-sm text-amber-950">Your Replit sign-in email differs from your PayGate email. PayGate account security uses the email shown above.</p>}
          <div className="flex items-start gap-3 text-sm">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">{status.hasPassword ? "A password is set for this account." : "Set a password to sign in directly without a developer-platform account."}</p>
          </div>
          {!status.hasPassword && !status.canSetPassword && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-5 text-muted-foreground">To add a password, first verify your email and sign in from a fresh email link, or sign in with a verified Replit identity.</p>}
          <form onSubmit={submit} className="space-y-4">
            {status.hasPassword && <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className="h-11 rounded-lg" />
            </div>}
            <div className="space-y-2">
              <Label htmlFor="security-password">{status.hasPassword ? "New password" : "Password"}</Label>
              <div className="relative">
                <Input id="security-password" type={passwordPrompt && showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required className={`h-11 rounded-lg ${passwordPrompt ? "pr-12" : ""}`} />
                {passwordPrompt && <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">At least 12 characters; include uppercase, lowercase, and a number. Maximum 72 UTF-8 bytes.</p>
              {passwordPrompt && <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-2" aria-live="polite">
                {passwordChecks.map(([rule, valid]) => <div key={rule} className={`flex items-center gap-2 text-xs ${valid ? "text-primary" : "text-muted-foreground"}`}>
                  <Check className={`h-3.5 w-3.5 ${valid ? "" : "opacity-30"}`} />{rule}
                </div>)}
              </div>}
            </div>
            {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              <p>{error}</p>
              {!status.emailVerified && <p className="text-xs">Verify your email using the banner above, then return here.</p>}
            </div>}
            {notice && <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">{notice}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={setPasswordMutation.isPending || isLoading || (!status.hasPassword && !status.canSetPassword)} className="h-11 rounded-lg">
                {setPasswordMutation.isPending ? "Saving…" : status.hasPassword ? "Update password" : "Set password"}
              </Button>
              {((!status.hasPassword && !status.canSetPassword) || (error && status.emailVerified)) && <Button type="button" variant="outline" disabled={requestLink.isPending || requestedLink} onClick={() => requestLink.mutate()} className="h-11 rounded-lg">
                <MailCheck className="mr-2 h-4 w-4" />{requestLink.isPending ? "Sending…" : "Email me a sign-in link"}
              </Button>}
            </div>
          </form>
        </>}
      </CardContent>
    </Card>
  );
}
