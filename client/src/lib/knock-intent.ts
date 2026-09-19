import type { MatchIntent } from "@shared/schema";

type Request = (
  method: string,
  url: string,
  data?: unknown,
) => Promise<{ json(): Promise<unknown> }>;

export async function sendKnockWithIntent<T>(
  request: Request,
  recipientId: string,
  initiatorIntent: MatchIntent,
): Promise<T> {
  const response = await request("POST", "/api/matches", {
    recipientId,
    initiatorIntent,
  });
  return await response.json() as T;
}