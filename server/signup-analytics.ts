import { randomUUID } from "node:crypto";
import type { Express, RequestHandler, Response } from "express";
import { parseSignUpReceipt, SIGNUP_ANALYTICS_HEADER, type SignUpReceipt } from "../shared/signup-analytics";

export function newSignUpReceipt(method: SignUpReceipt["method"] = "replit"): SignUpReceipt {
  return { receipt: randomUUID(), method };
}

export function addSignUpAnalyticsHeader(
  res: Response,
  sessionUser: { analyticsSignUp?: SignUpReceipt },
  accountExists: boolean,
): void {
  if (!accountExists || !sessionUser.analyticsSignUp) return;
  res.setHeader(SIGNUP_ANALYTICS_HEADER, JSON.stringify(sessionUser.analyticsSignUp));
  res.setHeader("Cache-Control", "no-store");
}

// Only retire the analytics receipt. No account/auth/profile data is changed.
export function registerSignUpAnalyticsAck(app: Express, authenticated: RequestHandler): void {
  app.post("/api/analytics/sign-up/ack", authenticated, (req: any, res) => {
    const receipt = parseSignUpReceipt(JSON.stringify({
      receipt: req.body?.receipt,
      method: req.user.analyticsSignUp?.method ?? "replit",
    }));
    if (!receipt) return res.sendStatus(400);
    const pending = req.user.analyticsSignUp;
    if (!pending) return res.sendStatus(204);
    if (pending.receipt !== receipt.receipt) return res.sendStatus(400);
    delete req.user.analyticsSignUp;
    req.session.save((error: unknown) => {
      if (error) {
        req.user.analyticsSignUp = pending;
        return res.sendStatus(503);
      }
      return res.sendStatus(204);
    });
  });
}
