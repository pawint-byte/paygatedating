import type { Request } from "express";
import { AuthError } from "./repository";

// Production deployment host was verified through deployment metadata.
// PayGate's owner also explicitly specifies paygatedating.com as its public domain.
const productionOrigins = new Set([
  "https://paygatedating.com", "https://www.paygatedating.com", "https://paygate.pawint-app.com",
]);
export function authOrigin(req: Request): string {
  const candidate = new URL(`${req.protocol}://${req.get("host")}`).origin;
  if (productionOrigins.has(candidate)) return candidate;
  if (process.env.NODE_ENV !== "production") {
    const devHosts = [process.env.REPLIT_DEV_DOMAIN, ...(process.env.REPLIT_DOMAINS ?? "").split(",")].filter(Boolean);
    if (devHosts.some(host => candidate === `https://${host}`)) return candidate;
    const parsed = new URL(candidate);
    if (["localhost","127.0.0.1"].includes(parsed.hostname) && ["http:","https:"].includes(parsed.protocol)) return candidate;
  }
  throw new AuthError(400,"Sign in from PayGate's official website.");
}
