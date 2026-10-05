import { z } from "zod";

export const AGENT_TASK_STATUSES = ["pending", "claimed", "done", "failed", "expired"] as const;
export const AGENT_TASK_HOURS = 24;
// Reject control characters, not ordinary multiline member requests.
const text = (maximum: number) => z.string().trim().max(maximum)
  .refine(value => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), "Use ordinary text.")
  .refine(value => !/pgai_[A-Za-z0-9_-]{43}/.test(value), "Never put assistant keys in task text or notes. Use private connector credentials.");
export const agentTaskCreateInput = z.object({ prompt: text(2000).pipe(z.string().min(1, "Enter a request for your AI.")) }).strict();
export const agentTaskUpdateInput = z.object({
  status: z.enum(["claimed", "done", "failed"]),
  note: text(1000).optional(),
}).strict();
export const agentTaskQueryInput = z.object({
  status: z.enum(AGENT_TASK_STATUSES).optional(),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(10).default(10),
}).strict();
