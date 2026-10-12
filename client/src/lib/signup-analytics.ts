import { parseSignUpReceipt, PAYGATE_GA4_ID } from "@shared/signup-analytics";

type SignUpParameters = { method: "replit" | "password"; send_to: string; debug_mode?: true };
export type SignUpAnalyticsEnvironment = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  hostname: string;
  gtag?: (command: "event", event: "sign_up", parameters: SignUpParameters) => void;
  lock?: (name: string, emit: () => boolean) => Promise<boolean>;
  acknowledge?: (receipt: string) => Promise<void>;
};

function browserEnvironment(): SignUpAnalyticsEnvironment {
  const browser = window as Window & { gtag?: SignUpAnalyticsEnvironment["gtag"] };
  return {
    storage: window.localStorage,
    hostname: window.location.hostname,
    gtag: browser.gtag,
    lock: navigator.locks
      ? (name, emit) => navigator.locks.request(name, emit)
      : undefined,
    acknowledge: async (receipt) => {
      const response = await fetch("/api/analytics/sign-up/ack", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt }),
      });
      if (!response.ok) throw new Error("Signup analytics acknowledgement failed.");
    },
  };
}

// Called only after /api/auth/user confirms a saved account and supplies a
// server-generated receipt for an INSERT (never a returning login).
export async function trackConfirmedSignUp(
  header: string | null,
  environment?: SignUpAnalyticsEnvironment,
): Promise<boolean> {
  const receipt = parseSignUpReceipt(header);
  if (!receipt) return false;
  const env = environment ?? browserEnvironment();
  if (!env.gtag || !env.lock) {
    // Fail closed rather than duplicate conversions across tabs.
    console.warn("Signup analytics unavailable: tag or cross-tab lock missing.");
    return false;
  }
  const emitted = await env.lock(`paygate-sign-up:${receipt.receipt}`, () => {
    const key = `paygate:ga4:sign-up:${receipt.receipt}`;
    if (env.storage.getItem(key)) return false;
    const parameters: SignUpParameters = {
      method: receipt.method,
      send_to: PAYGATE_GA4_ID,
    };
    if (
      env.hostname.endsWith(".replit.dev")
      || env.hostname === "localhost"
      || env.hostname === "127.0.0.1"
    ) parameters.debug_mode = true;
    env.storage.setItem(key, "sent");
    try {
      env.gtag!("event", "sign_up", parameters);
    } catch (error) {
      env.storage.removeItem(key);
      throw error;
    }
    return true;
  });
  // Retire even an already-sent receipt, so later storage clearing cannot replay
  // it from the session. A failed acknowledgement is safe to retry.
  await env.acknowledge?.(receipt.receipt);
  return emitted;
}
