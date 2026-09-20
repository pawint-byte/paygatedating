import type { MatchIntent } from "@shared/schema";
import type { ConfirmedSpend } from "./wallet-spend";

type Request = (
  method: string,
  url: string,
  data?: unknown,
) => Promise<{ json(): Promise<unknown> }>;

export async function sendKnockWithIntent<T>(
  request: Request,
  recipientId: string,
  initiatorIntent: MatchIntent,
  confirmation: ConfirmedSpend,
): Promise<T> {
  const response = await request("POST", "/api/matches", {
    recipientId,
    initiatorIntent,
    ...confirmation,
  });
  return await response.json() as T;
}