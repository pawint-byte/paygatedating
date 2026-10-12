import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { newSignUpReceipt } from "../../signup-analytics";
import type { SignUpReceipt } from "../../../shared/signup-analytics";
import { nativeAuthRepository } from "../../native-auth/service";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any, onAccountCreated?: () => void) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  }, onAccountCreated);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: { claims?: any; analyticsSignUp?: SignUpReceipt } = {};
    updateUserSession(user, tokens);
    try {
      const resolved = await nativeAuthRepository.resolveReplit(tokens.claims()!);
      user.claims = { ...user.claims, sub: resolved.account.user_id, email: resolved.account.email };
      Object.assign(user, {
        authenticatedAt: Date.now(),
        authVersion: resolved.account.session_version,
        replitEmailMismatch: resolved.emailMismatch,
      });
      if (resolved.created) user.analyticsSignUp = newSignUpReceipt();
      verified(null, user);
    } catch {
      // Fail closed without leaking SQL, provider tokens, or email identities.
      verified(null, false);
    }
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = async (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const config = await getOidcConfig();
      if (registeredStrategies.has(strategyName)) return;
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    res.redirect("/api/auth/replit/start");
  });
  app.get("/api/auth/replit/start", async (req, res, next) => {
    await ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    await ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login?error=replit-sign-in",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    if ((req.user as any)?.nativeAuth) {
      return req.logout(() => req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
      }));
    }
    const config = await getOidcConfig();
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (user.nativeAuth) {
    try {
      const account = await nativeAuthRepository.getAccount(user.claims.sub);
      if (!account || account.session_version !== user.authVersion || now > user.expires_at) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      return next();
    } catch {
      return res.status(503).json({ message: "Sign-in is temporarily unavailable." });
    }
  }
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    const canonicalSub = user.claims.sub;
    const canonicalEmail = user.claims.email;
    updateUserSession(user, tokenResponse);
    user.claims = { ...user.claims, sub: canonicalSub, email: canonicalEmail };
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
