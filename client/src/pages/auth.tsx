import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountSecurity as AccountSecurityPanel } from "@/components/auth/account-security";

type AuthMode = "signup" | "signup-complete" | "login" | "forgot-password" | "reset-password" | "confirm";
const consumedTokens = new Set<string>();
type SignupResume = { email: string; referralSource?: string; referralCode?: string };

function passwordRules(password: string) {
  const bytes = new TextEncoder().encode(password).length;
  return [
    { label: "At least 12 characters", valid: Array.from(password).length >= 12 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter", valid: /[a-z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
    { label: "72 UTF-8 bytes or fewer", valid: bytes <= 72 },
  ];
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";
  const message = error.message.replace(/^\d+:\s*/, "");
  try {
    const payload = JSON.parse(message);
    return payload.message || payload.error || message;
  } catch {
    return message || "Something went wrong. Please try again.";
  }
}

function AuthFrame({ children, eyebrow = "PAYGATE DATING" }: { children: ReactNode; eyebrow?: string }) {
  return (
    <main className="min-h-[100dvh] bg-[hsl(var(--background))] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_-42px_hsl(var(--primary)/.28)] md:min-h-[min(760px,calc(100dvh-6rem))] md:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex lg:p-14">
          <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full border border-white/15" />
          <div className="absolute -right-10 -top-6 h-52 w-52 rounded-full border border-white/15" />
          <div className="relative">
            <Link href="/" className="text-sm font-semibold tracking-[.22em]">PAYGATE</Link>
            <div className="mt-24 max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary-foreground/70">Five chapters. Two people.</p>
              <h1 className="mt-5 font-serif text-5xl leading-[1.03]">A story worth showing up for.</h1>
              <p className="mt-6 max-w-xs text-base leading-7 text-primary-foreground/75">Meet with intention. Build a profile at your own pace, then write the next chapter together.</p>
            </div>
          </div>
          <div className="relative flex items-center gap-3 text-sm text-primary-foreground/75">
            <ShieldCheck className="h-5 w-5" />
            <span>Built for thoughtful, adult connections</span>
          </div>
        </aside>
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 md:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden">
              <ArrowLeft className="h-4 w-4" /> {eyebrow}
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get("error") === "replit-sign-in"
    ? "Replit sign-in could not be completed. Use your PayGate password or request an email sign-in link. Ambiguous accounts are not automatically merged."
    : "");
  const [notice, setNotice] = useState("");
  const confirmStarted = useRef(false);
  const resetToken = useRef("");
  const signupToken = useRef("");
  const signupResumeStarted = useRef(false);
  const [signupResumeState, setSignupResumeState] = useState<"idle" | "loading" | "ready" | "invalid">(
    mode === "signup-complete" ? "loading" : "idle",
  );

  const isConfirm = mode === "confirm";
  const isSignupStart = mode === "signup";
  const isSignupComplete = mode === "signup-complete";
  const isSignup = isSignupStart || isSignupComplete;
  const isLogin = mode === "login";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";
  const needsEmail = isSignupStart || isLogin || isForgot;
  const needsPassword = isSignupComplete || isLogin || isReset;
  const [pendingSignup, setPendingSignup] = useState<SignupResume | null>(null);
  useEffect(() => {
    if (!isReset) return;
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) resetToken.current = token;
    window.history.replaceState({}, "", "/reset-password");
  }, [isReset]);
  useEffect(() => {
    if (!isSignupComplete) {
      signupResumeStarted.current = false;
      signupToken.current = "";
      setPendingSignup(null);
      setSignupResumeState("idle");
      return;
    }
    if (signupResumeStarted.current) return;
    signupResumeStarted.current = true;
    setSignupResumeState("loading");
    const token = new URLSearchParams(window.location.search).get("token") || "";
    signupToken.current = token;
    let referrerPolicy = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    if (!referrerPolicy) {
      referrerPolicy = document.createElement("meta");
      referrerPolicy.name = "referrer";
      document.head.appendChild(referrerPolicy);
    }
    referrerPolicy.content = "no-referrer";
    window.history.replaceState({}, "", "/signup/complete");

    apiRequest("POST", "/api/native-auth/signup/resume", token ? { token } : {})
      .then((response) => response.json() as Promise<SignupResume>)
      .then((resumed) => {
        if (!resumed || typeof resumed.email !== "string" || !resumed.email) {
          setSignupResumeState("invalid");
          setError("This signup link is incomplete or no longer available. Request a fresh signup link to continue.");
          return;
        }
        if (typeof resumed.referralCode === "string" && resumed.referralCode) {
          localStorage.setItem("referralCode", resumed.referralCode);
        }
        setPendingSignup(resumed);
        setError("");
        setSignupResumeState("ready");
      })
      .catch(() => {
        setSignupResumeState("invalid");
        setError("This signup link is invalid, expired, or already used. Start a fresh signup to get a new link.");
      });
  }, [isSignupComplete]);
  useEffect(() => {
    if (!isConfirm || confirmStarted.current) return;
    confirmStarted.current = true;
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind");
    const token = params.get("token");
    let referrerPolicy = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    if (!referrerPolicy) {
      referrerPolicy = document.createElement("meta");
      referrerPolicy.name = "referrer";
      document.head.appendChild(referrerPolicy);
    }
    referrerPolicy.content = "no-referrer";
    window.history.replaceState({}, "", "/auth/confirm");
    if (!token || (kind !== "verify" && kind !== "signin")) {
      setError("This sign-in link is incomplete or invalid. Request a new one to continue.");
      return;
    }
    const key = `${kind}:${token}`;
    if (consumedTokens.has(key)) return;
    consumedTokens.add(key);
    setBusy(true);
    apiRequest("POST", "/api/native-auth/consume", { kind, token })
      .then(async (response) => {
        const result = await response.json() as { redirect?: string };
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/native-auth/status"] });
        setLocation(result.redirect || "/");
      })
      .catch((failure: unknown) => setError(getErrorMessage(failure)))
      .finally(() => setBusy(false));
  }, [isConfirm, queryClient, setLocation]);

  useEffect(() => {
    if (user && !isLoading && (isSignup || isLogin)) setLocation(isSignup ? "/setup" : "/");
  }, [user, isLoading, isConfirm, mode, setLocation]);

  const rules = passwordRules(password);
  const passwordValid = rules.every((rule) => rule.valid);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address to continue.");
      return;
    }
    if (isSignupComplete && (!adultConfirmed || !acceptedTerms)) {
      setError("Confirm that you are 18 or older and agree to the Terms and Privacy Policy.");
      return;
    }
    if ((isSignupComplete || mode === "reset-password") && !passwordValid) {
      setError("Choose a password that meets every requirement.");
      return;
    }
    if (isSignupComplete && signupResumeState !== "ready") {
      setError("This signup link is no longer available. Request a fresh signup link to continue.");
      setSignupResumeState("invalid");
      return;
    }
    setBusy(true);
    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};
      if (isSignupStart) {
        const storedReferralCode = (localStorage.getItem("referralCode") || "").slice(0, 10);
        const utmSource = new URLSearchParams(window.location.search).get("utm_source");
        let referralSource = "direct";
        if (storedReferralCode) {
          referralSource = `invite:${storedReferralCode}`;
        } else if (utmSource?.trim()) {
          referralSource = utmSource.trim().slice(0, 80);
        } else if (document.referrer) {
          try {
            referralSource = new URL(document.referrer).hostname.slice(0,160);
          } catch {
            referralSource = "direct";
          }
        }
        endpoint = "/api/native-auth/signup/start";
        body = { email: email.trim(), referralSource, ...(storedReferralCode ? { referralCode: storedReferralCode } : {}) };
      } else if (isSignupComplete) {
        endpoint = "/api/native-auth/signup";
        body = {
          password,
          adultConfirmed: true,
          acceptedTerms: true,
          ...(signupToken.current ? { token: signupToken.current } : {}),
        };
      } else if (mode === "login") {
        endpoint = "/api/native-auth/login";
        body = { email: email.trim(), password };
      } else if (mode === "forgot-password") {
        endpoint = "/api/native-auth/forgot-password";
        body = { email: email.trim() };
      } else if (mode === "reset-password") {
        const token = resetToken.current;
        if (!token) throw new Error("This password reset link is missing its token. Request a new link.");
        endpoint = "/api/native-auth/reset-password";
        body = { token, password };
      }
      const response = await apiRequest("POST", endpoint, body);
      const result = await response.json().catch(() => ({})) as { redirect?: string };
      if (isSignupStart) {
        setLocation("/signup/complete");
      } else if (isSignupComplete || isLogin || isReset) {
        if (isSignupComplete) signupToken.current = "";
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/native-auth/status"] });
        const destination = result.redirect || (isSignupComplete ? "/setup" : "/");
        // Emailed continuation pages omit third-party tracking while holding a
        // token. Load a clean document after creation so the persisted signup
        // receipt can be recorded normally, without exposing the resume token.
        if (isSignupComplete && typeof (window as Window & {gtag?: unknown}).gtag !== "function") {
          window.location.assign(destination);
        } else {
          setLocation(destination);
        }
      } else {
        setNotice("If an account matches that email, you’ll receive a message with the next step.");
      }
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const requestLink = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await apiRequest("POST", "/api/native-auth/request-link", { email: email.trim() });
      setNotice("If an account matches that email, a sign-in link is on its way.");
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (isConfirm) {
    return <AuthFrame><div className="text-center">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Mail className="h-6 w-6" /></div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Secure link</p>
      <h1 className="mt-3 font-serif text-4xl">{error ? "Link not accepted" : "Opening your account"}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground" role={error ? "alert" : "status"}>
        {error || (busy ? "Checking the link and preparing your next chapter…" : "Taking you to your account.")}
      </p>
      {error && <Link href="/login" className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">Return to login</Link>}
    </div></AuthFrame>;
  }

  if (isSignupComplete && signupResumeState !== "ready") {
    const isResumeLoading = signupResumeState === "loading" || signupResumeState === "idle";
    return (
      <AuthFrame>
        <div className="text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Signup continuation</p>
          <h1 className="mt-3 font-serif text-4xl">{isResumeLoading ? "Opening your signup" : "Signup link unavailable"}</h1>
          {isResumeLoading ? (
            <div role="status" aria-label="Loading signup continuation" className="mt-6 space-y-3">
              <div className="mx-auto h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              <p role="alert" className="mt-4 text-sm leading-6 text-muted-foreground">{error || "This signup link is invalid, expired, or already used. Start a fresh signup to get a new link."}</p>
              <Link href="/signup" className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Start a fresh signup</Link>
            </>
          )}
        </div>
      </AuthFrame>
    );
  }

  const title = isSignupStart ? "Start your story" : isSignupComplete ? "Finish your signup" : isLogin ? "Welcome back" : isForgot ? "Find your way back" : "Set a new password";
  const description = isSignupStart ? "We’ll email you a link to continue your signup." : isSignupComplete ? "Your signup is ready to finish. Choose a password and confirm your age and agreements." : isLogin ? "Pick up where your story left off." : isForgot ? "We’ll send a password reset link if an account matches." : "Choose a new password for your account.";
  return (
    <AuthFrame>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">A better kind of first chapter</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-[2.8rem]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {needsEmail && <div className="space-y-2">
          <Label htmlFor="auth-email">Email address</Label>
          <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 rounded-xl" />
        </div>}
        {needsPassword && <div className="space-y-2">
          <Label htmlFor="auth-password">{isReset ? "New password" : "Password"}</Label>
          <div className="relative">
            <Input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : isLogin ? "current-password" : "new-password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl pr-12" aria-describedby={(isSignup || isReset) ? "password-rules" : undefined} />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>}
        {(isSignupComplete || isReset) && <div id="password-rules" className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-2" aria-live="polite">
          {rules.map((rule) => <div key={rule.label} className={`flex items-center gap-2 text-xs ${rule.valid ? "text-primary" : "text-muted-foreground"}`}>
            <Check className={`h-3.5 w-3.5 ${rule.valid ? "" : "opacity-30"}`} />{rule.label}
          </div>)}
        </div>}
        {isSignupComplete && <>
          <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Signup email</p>
            <p className="mt-1 break-all text-sm font-semibold">{pendingSignup?.email}</p>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-5">
            <input type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span>I confirm that I am at least 18 years old.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-5">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span>I agree to the <Link className="font-medium text-primary underline underline-offset-2" href="/terms">Terms of Service</Link> and <Link className="font-medium text-primary underline underline-offset-2" href="/privacy">Privacy Policy</Link>.</span>
          </label>
          </div>
        </>}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm text-foreground">{notice}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-sm font-semibold">
          {busy ? "Please wait…" : isSignupStart ? "Email me a continuation link" : isSignupComplete ? "Create account" : isLogin ? "Log in" : isForgot ? "Send reset link" : "Save new password"}
          {!busy && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      {isLogin && <div className="mt-5 space-y-3">
        <Button type="button" variant="outline" onClick={requestLink} disabled={busy || !email} className="h-12 w-full rounded-xl">
          <Mail className="mr-2 h-4 w-4" /> Email me a sign-in link
        </Button>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Forgot password?</Link>
          <a href="/api/login" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"><KeyRound className="h-3.5 w-3.5" /> Continue with Replit</a>
        </div>
      </div>}

      {isSignupStart && <p className="mt-7 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link></p>}
      {isSignupComplete && <p className="mt-7 text-center text-sm text-muted-foreground">Wrong email? <Link href="/signup" className="font-semibold text-primary hover:underline">Use another email</Link></p>}
      {isLogin && <p className="mt-7 text-center text-sm text-muted-foreground">New to PayGate? <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link></p>}
      {(isForgot || isReset) && <p className="mt-7 text-center text-sm"><Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to login</Link></p>}
    </AuthFrame>
  );
}

export function AccountPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to PayGate
        </Link>
        <header className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Your account</p>
          <h1 className="mt-2 font-serif text-4xl">Sign-in &amp; security</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Your account works before profile setup. Add an email password or keep using a secure sign-in link.</p>
        </header>
        <AccountSecurityPanel />
      </div>
    </main>
  );
}

