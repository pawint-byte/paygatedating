import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { wallets } from "@shared/schema";
import { safeAgentRoute } from "./agent-tasks";

export function registerAgentReads(app: Express, gateContext: (userId: string) => Promise<any[]>) {
  app.get("/api/agent/credits", safeAgentRoute(async (req, res) => {
    const [wallet] = await db.select({ balance: wallets.balance }).from(wallets).where(eq(wallets.userId, req.agentKey.userId));
    res.json({ credits: { balance: wallet?.balance ?? null, available: !!wallet, currency: "USD", canSpend: false } });
  }));
  app.get("/api/agent/matches", safeAgentRoute(async (req, res) =>
    res.json({ matches: await gateContext(req.agentKey.userId), protectedPartnerDetailsIncluded: false })));
  app.get("/api/agent/knock-requests", safeAgentRoute(async (req, res) =>
    res.json({ requests: (await gateContext(req.agentKey.userId)).filter(gate => gate.incoming) })));
  app.get("/api/agent/notifications", safeAgentRoute(async (req, res) => {
    const gates = await gateContext(req.agentKey.userId);
    const notifications = gates.flatMap(gate => [
      ...(gate.incoming ? [{ id: `knock:${gate.id}`, type: "incoming_knock", created_at: gate.createdAt, review_url: gate.reviewUrl }] : []),
      ...(gate.paymentRequest?.incoming ? [{
        id: `payment:${gate.paymentRequest.id}`, type: "gate_payment_request",
        created_at: gate.paymentRequest.createdAt, review_url: gate.reviewUrl,
      }] : []),
    ]);
    res.json({
      notifications, source: "current_gate_requests_only", generalInboxSupported: false,
      includesMessages: false, automaticDelivery: false,
    });
  }));
}
