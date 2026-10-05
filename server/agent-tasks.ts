import type { Express, RequestHandler } from "express";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { agentKeys, agentTasks, users } from "@shared/schema";
import { agentKeyStatus } from "@shared/agent-policy";
import { agentTaskCreateInput, agentTaskQueryInput, agentTaskUpdateInput } from "@shared/agent-task-policy";
import { isAuthenticated } from "./replit_integrations/auth";

export class AgentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const safeAgentRoute = (handler: (req: any, res: any) => Promise<any>): RequestHandler => async (req, res) => {
  try { await handler(req, res); } catch (error) {
    res.status(error instanceof AgentError ? error.status : 503).json({
      message: error instanceof AgentError ? error.message : "Assistant access is temporarily unavailable. Please try again.",
    });
  }
};
export const taskResponse = (task: typeof agentTasks.$inferSelect) => ({
  id: task.id, prompt: task.prompt, status: task.status, note: task.note,
  created_at: task.createdAt, updated_at: task.updatedAt, expires_at: task.expiresAt,
  claimed_at: task.claimedAt, finished_at: task.finishedAt, claimed_by_key_id: task.claimedByKeyId,
});

async function expireTasks(tx: any, userId: string) {
  // Lazy housekeeping: no scheduler, webhook, or execution of member prompts.
  await tx.update(agentTasks).set({ status: "expired", updatedAt: sql`clock_timestamp()` }).where(and(
    eq(agentTasks.userId, userId), inArray(agentTasks.status, ["pending", "claimed"]),
    sql`${agentTasks.expiresAt} <= clock_timestamp()`,
  ));
}

export function registerAgentTasks(app: Express, agentAuth: RequestHandler, ownerOnly: RequestHandler) {
  app.post("/api/assistant/tasks", isAuthenticated, ownerOnly, safeAgentRoute(async (req, res) => {
    const input = agentTaskCreateInput.safeParse(req.body);
    if (!input.success) throw new AgentError(400, input.error.errors[0]?.message || "Invalid task.");
    const task = await db.transaction(async tx => {
      // Serialize submissions and bound outstanding requests without running them.
      await tx.select({ id: users.id }).from(users).where(eq(users.id, req.user.claims.sub)).for("update");
      await expireTasks(tx, req.user.claims.sub);
      const [outstanding] = await tx.select({ total: count() }).from(agentTasks).where(and(
        eq(agentTasks.userId, req.user.claims.sub), inArray(agentTasks.status, ["pending", "claimed"]),
      ));
      if (outstanding.total >= 100) throw new AgentError(409, "Your AI has 100 outstanding requests. Wait for completion or expiry before submitting more.");
      const [task] = await tx.insert(agentTasks).values({ userId: req.user.claims.sub, prompt: input.data.prompt }).returning();
      return task;
    });
    res.status(201).json({ id: task.id, status: task.status, created_at: task.createdAt });
  }));

  const readerAuth: RequestHandler = (req, res, next) => {
    if (req.get("authorization")) return agentAuth(req, res, next);
    return isAuthenticated(req, res, next);
  };
  app.get("/api/assistant/tasks", readerAuth, safeAgentRoute(async (req, res) => {
    const input = agentTaskQueryInput.safeParse(req.query);
    if (!input.success) throw new AgentError(400, "Use a valid status, offset, and limit from 1 to 10.");
    const key = req.agentKey as typeof agentKeys.$inferSelect | undefined;
    if (key && !key.scopes.includes("tasks_read")) throw new AgentError(403, "Task-read permission was not granted.");
    const userId = key?.userId ?? req.user.claims.sub;
    const status = input.data.status ?? (key ? "pending" : undefined);
    const tasks = await db.transaction(async tx => {
      await expireTasks(tx, userId);
      return tx.select().from(agentTasks).where(and(
        eq(agentTasks.userId, userId), status ? eq(agentTasks.status, status) : undefined,
      )).orderBy(key ? asc(agentTasks.createdAt) : desc(agentTasks.createdAt), asc(agentTasks.id))
        .offset(input.data.offset).limit(input.data.limit + 1);
    });
    const hasMore = tasks.length > input.data.limit;
    res.json({
      tasks: tasks.slice(0, input.data.limit).map(taskResponse), hasMore,
      nextOffset: hasMore ? input.data.offset + input.data.limit : null,
    });
  }));

  app.patch("/api/assistant/tasks/:id", agentAuth, safeAgentRoute(async (req, res) => {
    const input = agentTaskUpdateInput.safeParse(req.body);
    if (!input.success) throw new AgentError(400, "Choose claimed, done, or failed with an optional note of at most 1000 characters.");
    const task = await db.transaction(async tx => {
      // Same lock as renewal/revocation: stale tokens cannot change queue state.
      const [key] = await tx.select().from(agentKeys).where(eq(agentKeys.id, req.agentKey.id)).for("update");
      if (!key || key.revokedAt || key.tokenHash !== req.agentKey.tokenHash) throw new AgentError(401, "This key was revoked or renewed.");
      if (!key.scopes.includes("tasks_write")) throw new AgentError(403, "Task-write permission was not granted.");
      if (agentKeyStatus(key) === "paused") throw new AgentError(403, "Task updates are paused. The member must review access on PayGate.");
      await expireTasks(tx, key.userId);
      const [task] = await tx.select().from(agentTasks).where(and(
        eq(agentTasks.id, req.params.id), eq(agentTasks.userId, key.userId),
      )).for("update");
      if (!task) throw new AgentError(404, "Your task was not found.");
      // A lock wait may cross the deadline after housekeeping already ran.
      if (task.status === "expired" || task.expiresAt.getTime() <= Date.now()) throw new AgentError(409, "This task expired. Ask the member to submit a new request.");
      if (task.status === input.data.status && task.claimedByKeyId === key.id) return task;
      if (input.data.status === "claimed") {
        if (task.status !== "pending") throw new AgentError(409, "This task is no longer pending.");
      } else if (task.claimedByKeyId !== key.id) {
        throw new AgentError(403, "Only the connection that claimed this task may finish it.");
      } else if (task.status !== "claimed") {
        throw new AgentError(409, "Only a claimed task can be marked done or failed.");
      }
      const [updated] = await tx.update(agentTasks).set({
        status: input.data.status, updatedAt: sql`clock_timestamp()`,
        ...(input.data.note === undefined ? {} : { note: input.data.note }),
        ...(input.data.status === "claimed" ? { claimedByKeyId: key.id, claimedAt: sql`clock_timestamp()` } : { finishedAt: sql`clock_timestamp()` }),
      }).where(eq(agentTasks.id, task.id)).returning();
      return updated;
    });
    res.json({ task: taskResponse(task), requiresMemberApprovalForDrafts: true });
  }));
}
