import type { RequestHandler } from "express";
import { isQaMemberId, QA_MEMBER_HEADER } from "@shared/qa";

type Dependencies = {
  authenticate: RequestHandler;
  isAdmin: (userId: string) => Promise<boolean>;
  getProfile: (userId: string) => Promise<{ displayName: string; subscriptionTier: string | null } | undefined>;
  getMatch: (id: string) => Promise<{
    initiatorId: string; recipientId: string; currentGate: string; status: string; gatePaused?: boolean | null;
  } | undefined>;
};

export const sameOriginQaRequest: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  if (req.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== `${req.protocol}://${req.get("host")}`)) {
    res.status(403).json({ message: "QA actions require a same-origin Admin request" });
    return;
  }
  next();
};

/**
 * Request-scoped acting as one of TWO fixtures, not a login or session switch.
 * Every request validates the real Replit session and current database Admin role.
 * All other endpoints (especially payment/auth/admin routes) are denied.
 */
export function createQaAccess(deps: Dependencies): RequestHandler {
  return (req: any, res, next) => {
    const memberId = req.get(QA_MEMBER_HEADER);
    if (memberId === undefined) return next();

    deps.authenticate(req, res, error => {
      if (error) return next(error);
      sameOriginQaRequest(req, res, async originError => {
        if (originError) return next(originError);
        try {
          const actorId = req.user?.claims?.sub;
          if (!actorId || !(await deps.isAdmin(actorId))) {
            return res.status(403).json({ message: "Admin access required for QA actions" });
          }
          if (!isQaMemberId(memberId)) {
            return res.status(400).json({ message: "Only QA Alice and QA Bob are supported" });
          }
          const readAllowed = req.method === "GET" &&
            ["/api/wallet", "/api/wallet/transactions", "/api/matches"].includes(req.path);
          const interestAllowed = req.method === "POST" && req.path === "/api/matches" &&
            isQaMemberId(req.body?.recipientId) && req.body.recipientId !== memberId;
          const advanceId = req.method === "POST" &&
            req.path.match(/^\/api\/matches\/([^/]+)\/advance$/)?.[1];
          let advanceAllowed = false;
          if (advanceId) {
            const match = await deps.getMatch(advanceId);
            advanceAllowed = !!match && isQaMemberId(match.initiatorId) &&
              isQaMemberId(match.recipientId) && match.initiatorId !== match.recipientId &&
              match.recipientId === memberId &&
              match.currentGate === "gate1" && match.status !== "declined" && !match.gatePaused;
          }
          if (!readAllowed && !interestAllowed && !advanceAllowed) {
            return res.status(403).json({
              message: "QA mode only permits wallet/match reads, Interest between the two QA members, and Chapter 1 acceptance by its recipient",
            });
          }
          const profile = await deps.getProfile(memberId);
          if (!profile || !profile.displayName.startsWith("QA ") || profile.subscriptionTier !== "free") {
            return res.status(409).json({ message: "Set up the QA members before running wallet checks" });
          }
          if (req.aborted || res.destroyed) return;
          const originalUser = req.user;
          req.user = { ...originalUser, claims: { ...originalUser.claims, sub: memberId } };
          // Never mutate the serialized passport user or leave an effective identity behind.
          res.once("finish", () => { req.user = originalUser; });
          res.setHeader("Cache-Control", "no-store");
          res.vary(QA_MEMBER_HEADER);
          console.info("[Track A QA request]", { actorId, memberId, method: req.method, path: req.path });
          next();
        } catch (error) {
          console.error("QA authorization failed:", error);
          res.status(500).json({ message: "Failed to authorize QA request" });
        }
      });
    });
  };
}

// Acquire AFTER authentication, immediately around the actual async handler.
// A disconnected browser does not cancel database work, so never release a
// mutation lock on response close/finish; release when that work has settled.
export function withQaActionLock(
  handler: RequestHandler,
  acquire: () => Promise<(() => Promise<void>) | undefined>,
): RequestHandler {
  return async (req, res, next) => {
    if (!req.get(QA_MEMBER_HEADER)) return handler(req, res, next);
    let release: (() => Promise<void>) | undefined;
    try {
      release = await acquire();
      if (!release) {
        res.status(409).json({ message: "Another QA action is in progress. Refresh before retrying." });
        return;
      }
      if (!req.aborted && !res.destroyed && !res.writableEnded) {
        await handler(req, res, next);
      }
    } catch (error) {
      console.error("QA action failed:", error);
      if (!res.headersSent && !res.destroyed) {
        res.status(500).json({ message: "QA action failed; refresh both perspectives before retrying" });
      }
    } finally {
      if (release) {
        try { await release(); }
        catch (error) { console.error("QA lock release failed:", error); }
      }
    }
  };
}