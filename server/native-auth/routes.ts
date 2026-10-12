import type { Express, RequestHandler, Request } from "express";
import { AuthError, normalizeEmail, type Account, type TokenKind, type AuthRepository } from "./repository";
import { nativeAuthRepository, checkPassword, hashPassword } from "./service";
import { sendAuthEmail } from "../lib/email";
import { newSignUpReceipt } from "../signup-analytics";
import { authOrigin } from "./origin";

const PAID_CHECKOUTS = new Set(["/api/wallet/deposit","/api/subscription/create-checkout","/api/gifts/checkout"]);
const registeredEmailResponse = { registered:true,linkSent:true,message:"You're already registered with this email — we've sent you a sign-in link. Tap it to get in." };
type Dependencies = {
  repository?: AuthRepository;
  send?: typeof sendAuthEmail;
};
function recentProof(req: any, account: Account): boolean {
  return !!account.verified_at && !req.user?.replitEmailMismatch
    && Date.now() - (req.user?.authenticatedAt ?? 0) < 15 * 60 * 1000;
}
async function signIn(req: any, account: Account, receipt?: ReturnType<typeof newSignUpReceipt>) {
  const sessionUser = {
    claims: { sub: account.user_id, email: account.email },
    nativeAuth: true, authVersion: account.session_version, authenticatedAt: Date.now(),
    expires_at: Math.floor(Date.now()/1000)+7*24*3600,
    ...(receipt ? { analyticsSignUp: receipt } : {}),
  };
  await new Promise<void>((resolve,reject) => req.login(sessionUser, (error: unknown) => error ? reject(error) : resolve()));
  await new Promise<void>((resolve,reject) => req.session.save((error: unknown) => error ? reject(error) : resolve()));
}
export function registerNativeAuth(app: Express, authenticated: RequestHandler, dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? nativeAuthRepository;
  const send = dependencies.send ?? sendAuthEmail;
  const wrap = (fn: (req: any,res: any) => Promise<any>): RequestHandler => async (req,res) => {
    try { await fn(req,res); }
    catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 429) res.setHeader("Retry-After","900");
        res.status(error.status).json({message:error.message,code:error.code,...(error.code === "NO_ACCOUNT" ? {redirect:"/signup"} : {})});
      }
      else { console.error("Native authentication operation failed."); res.status(503).json({message:"Sign-in is temporarily unavailable. Please try again."}); }
    }
  };
  app.use("/api/native-auth", (req,res,next) => {
    res.setHeader("Cache-Control","no-store");
    res.setHeader("Referrer-Policy","no-referrer");
    if (req.method === "POST") {
      if (!req.is("application/json")) { res.status(415).json({message:"Use a JSON request."}); return; }
      const origin = req.get("origin");
      try {
        if (origin && origin !== authOrigin(req)) { res.sendStatus(403); return; }
        authOrigin(req);
      } catch { res.status(400).json({message:"Use PayGate's official website to sign in."}); return; }
      if (JSON.stringify(req.body).length > 4096) { res.sendStatus(413); return; }
    }
    next();
  });
  const limited = (action: string, maximum=10): RequestHandler => async (req,res,next) => {
    try {
      const ipKey = `${action}:ip:${req.ip}`;
      const emailKey = typeof req.body?.email === "string" ? `${action}:email:${req.body.email.trim().toLowerCase()}` : undefined;
      const accountKey = (req.user as any)?.claims?.sub ? `${action}:account:${(req.user as any).claims.sub}` : undefined;
      if (!await repository.allowed(ipKey,maximum*3) || (emailKey && !await repository.allowed(emailKey,maximum))
          || (accountKey && !await repository.allowed(accountKey,maximum))) {
        res.setHeader("Retry-After","900");
        res.status(429).json({message:"Too many attempts. Please wait 15 minutes before trying again."});
      } else next();
    } catch {
      res.status(503).json({message:"Sign-in is temporarily unavailable. Please try again."});
    }
  };
  const mail = async (req: Request, account: Account, kind: TokenKind) => {
    const token = await repository.issue(account,kind);
    // Only the server's configured host is used; never accept a client return URL.
    const origin = authOrigin(req);
    const path = kind === "reset" ? `/reset-password?token=${token}` : `/auth/confirm?kind=${kind}&token=${token}`;
    return send(account.email,kind,origin+path);
  };
  const noAccount = () => new AuthError(404,"No account is registered with this email. Create an account to get started.","NO_ACCOUNT");
  // All email sign-in/reset sends share the existing 3-per-email, 9-per-IP
  // budget, regardless of which front-door endpoint initiated the request.
  const sendRegisteredLink = async (req: Request,account: Account,kind: TokenKind="signin") => {
    const email = account.email;
    if (!await repository.allowed(`email:ip:${req.ip}`,9)
      || !await repository.allowed(`email:email:${email}`,3)
      || ((req.user as any)?.claims?.sub && !await repository.allowed(`email:account:${(req.user as any).claims.sub}`,3))) {
      throw new AuthError(429,"Too many attempts. Please wait 15 minutes before trying again.");
    }
    if (!await mail(req,account,kind))
      throw new AuthError(503,"We couldn't send your sign-in or recovery link. Please try again shortly.");
    return kind === "signin" ? registeredEmailResponse : {linkSent:true,message:"We've sent you a password reset link. Check your inbox and spam folder."};
  };
  app.post("/api/native-auth/signup/start",limited("signup-start",3),wrap(async (req,res) => {
    const email = normalizeEmail(req.body?.email);
    const registered = await repository.byEmail(email);
    if (registered) {
      res.json(await sendRegisteredLink(req,registered));
      return;
    }
    const source = req.body?.referralSource ?? "direct";
    const code = req.body?.referralCode;
    if (typeof source !== "string" || !source.trim() || source.length > 160
        || (code !== undefined && (typeof code !== "string" || !/^[a-zA-Z0-9]{1,10}$/.test(code))))
      throw new AuthError(400,"Invalid signup referral context.");
    let started;
    try { started = await repository.startSignup(email,source.trim(),code); }
    catch (error) {
      // An OIDC registration may have committed between detection and capture.
      if (error instanceof AuthError && error.status === 409) {
        const existing = await repository.byEmail(email);
        if (existing) { res.json(await sendRegisteredLink(req,existing)); return; }
      }
      throw error;
    }
    const {pending,token} = started;
    req.session.pendingSignupToken = token;
    await new Promise<void>((resolve,reject) => req.session.save((error:unknown) => error ? reject(error) : resolve()));
    // Pending email is committed before delivery; no password/account exists yet.
    void send(pending.email,"signup",`${authOrigin(req)}/signup/complete?token=${token}`)
      .then(sent => { if (!sent) console.warn("Signup continuation delivery needs retry."); })
      .catch(() => console.warn("Signup continuation delivery needs retry."));
    res.status(201).json({resumePath:"/signup/complete",emailDeliveryPending:true});
  }));
  app.post("/api/native-auth/signup/resume",limited("signup-resume",30),wrap(async (req,res) => {
    const token = req.body?.token ?? req.session.pendingSignupToken;
    const pending = await repository.pendingSignup(token);
    req.session.pendingSignupToken = token;
    await new Promise<void>((resolve,reject) => req.session.save((error:unknown) => error ? reject(error) : resolve()));
    res.json({email:pending.email,referralSource:pending.referral_source,referralCode:pending.referral_code});
  }));
  app.post("/api/native-auth/signup",limited("signup",5),wrap(async (req,res) => {
    if (req.body?.adultConfirmed !== true || req.body?.acceptedTerms !== true) throw new AuthError(400,"Confirm you are at least 18 and agree to the Terms of Service and Privacy Policy.");
    const account = await repository.completeSignup(req.body.token ?? req.session.pendingSignupToken,await hashPassword(req.body.password));
    await signIn(req,account,newSignUpReceipt("password"));
    // Failures are visible but never undo account creation or immediate access.
    void mail(req,account,"verify").catch(() => console.warn("Signup verification delivery needs retry."));
    res.status(201).json({redirect:"/setup",verificationPending:true});
  }));
  app.post("/api/native-auth/login",limited("login"),wrap(async (req,res) => {
    const account = await repository.byEmail(normalizeEmail(req.body.email));
    if (!account) {
      await checkPassword(req.body.password);
      throw noAccount();
    }
    if (!account.password_hash) {
      res.json(await sendRegisteredLink(req,account));
      return;
    }
    if (!await checkPassword(req.body.password,account)) throw new AuthError(401,"Email or password is incorrect. You can also request an email sign-in link.");
    await signIn(req,account!);
    res.json({redirect:"/"});
  }));
  for (const [path,kind] of [["request-link","signin"],["forgot-password","reset"]] as const) {
    app.post(`/api/native-auth/${path}`,limited("email-submit",3),wrap(async (req,res) => {
      const email = normalizeEmail(req.body.email);
      const account = await repository.byEmail(email);
      if (!account) throw noAccount();
      res.json(await sendRegisteredLink(req,account,!account.password_hash ? "signin" : kind));
    }));
  }
  app.get("/api/native-auth/status",authenticated,wrap(async (req,res) => {
    const account = await repository.ensureAccount(req.user.claims.sub);
    res.json({email:account.email,emailVerified:!!account.verified_at,hasPassword:!!account.password_hash,
      canSetPassword:!!account.password_hash || recentProof(req,account),replitEmailMismatch:!!req.user.replitEmailMismatch,
      passwordPromptSkipped:!!account.password_prompt_skipped_at});
  }));
  app.post("/api/native-auth/resend-verification",authenticated,limited("resend",3),wrap(async (req,res) => {
    const account = await repository.ensureAccount(req.user.claims.sub);
    const sent = await mail(req,account,"verify");
    if (!sent) throw new AuthError(503,"Email could not be sent. Your account is usable; please retry sending later.");
    res.json({sent:true});
  }));
  app.post("/api/native-auth/consume",limited("consume",30),wrap(async (req,res) => {
    if (!["verify","signin"].includes(req.body.kind) || typeof req.body.token !== "string") throw new AuthError(400,"Invalid sign-in link.");
    const account = await repository.consume(req.body.token,req.body.kind);
    await signIn(req,account);
    res.json({redirect:!account.password_hash && (!account.password_prompt_skipped_at || account.force_password_setup) ? "/set-password" : "/"});
  }));
  app.post("/api/native-auth/password-prompt/skip",authenticated,limited("password-prompt",5),wrap(async (req,res) => {
    await repository.skipPasswordPrompt(await repository.ensureAccount(req.user.claims.sub));
    res.json({skipped:true,redirect:"/"});
  }));
  app.post("/api/native-auth/reset-password",limited("reset",10),wrap(async (req,res) => {
    if (typeof req.body.token !== "string") throw new AuthError(400,"Invalid reset link.");
    const account = await repository.consume(req.body.token,"reset",await hashPassword(req.body.password));
    await signIn(req,account);
    res.json({redirect:"/"});
  }));
  app.post("/api/native-auth/set-password",authenticated,limited("password",5),wrap(async (req,res) => {
    const account = await repository.ensureAccount(req.user.claims.sub);
    if (!account.verified_at) throw new AuthError(403,"Verify your account email before setting or changing your password.");
    if (account.password_hash) {
      if (!await checkPassword(req.body.currentPassword,account)) throw new AuthError(401,"Enter your current password to change it.");
    } else if (!recentProof(req,account)) throw new AuthError(403,"Use a fresh email verification/sign-in link before setting your password.");
    const updated = await repository.setPassword(account,await hashPassword(req.body.password));
    // Preserve the OIDC session and both methods; only update its native epoch.
    req.user.authVersion = updated.session_version;
    await new Promise<void>((resolve,reject) => req.session.save((error: unknown) => error ? reject(error) : resolve()));
    res.json({hasPassword:true});
  }));
  // Add only verification middleware, leaving payment/referral/chapter handlers untouched.
  app.use((req,res,next) => {
    if (req.method !== "POST" || !PAID_CHECKOUTS.has(req.path)) return next();
    authenticated(req,res,() => {
      wrap(async (request,response) => {
        const account = await repository.ensureAccount(request.user.claims.sub);
        if (!account.verified_at) throw new AuthError(403,"Verify your email before paid checkout or gifting.","EMAIL_VERIFICATION_REQUIRED");
        next();
      })(req,res,next);
    });
  });
}
