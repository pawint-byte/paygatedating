export const SIGNUP_ANALYTICS_HEADER = "X-PayGate-Sign-Up";
export const PAYGATE_GA4_ID = "G-ZQDRXT3L0B";

// This receipt is random, not derived from a member ID, email, or auth token.
export type SignUpReceipt = { receipt: string; method: "replit" };

export function parseSignUpReceipt(value: string | null): SignUpReceipt | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value);
    if (
      data?.method !== "replit"
      || typeof data.receipt !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.receipt)
    ) return null;
    return { receipt: data.receipt, method: "replit" };
  } catch {
    return null;
  }
}
