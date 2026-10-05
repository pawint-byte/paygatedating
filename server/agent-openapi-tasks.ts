export const taskScopes = {
  read: "Read own profile preferences, wishlist, credit balance, permitted active matches and incoming knock/payment-request notification metadata. No messages, full notification inbox, shipping addresses, or protected partner details.",
  profile_drafts: "Propose private profile changes after the member accepted initial setup; never approve or publish.",
  wishlist_drafts: "Propose private wishlist additions or edits; never purchase.",
  tasks_read: "Poll this member's task queue. Does not grant drafting or status-update permission.",
  tasks_write: "Claim this member's tasks and report done/failed only for tasks this same connection claimed. Does not grant draft approval or execution permission.",
};
const nullableString = { type: ["string", "null"] };
export const taskSchemas = {
  AssistantTask: {
    type: "object",
    required: ["id", "prompt", "status", "created_at", "updated_at", "expires_at"],
    properties: {
      id: { type: "string" }, prompt: { type: "string", maxLength: 2000 },
      status: { type: "string", enum: ["pending", "claimed", "done", "failed", "expired"] },
      note: { ...nullableString, maxLength: 1000, description: "AI-reported text, not proof of publication or approval." },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
      expires_at: { type: "string", format: "date-time" },
      claimed_at: { ...nullableString, format: "date-time" },
      finished_at: { ...nullableString, format: "date-time" },
      claimed_by_key_id: nullableString,
    },
  },
};
const json = (schema: object) => ({ "application/json": { schema } });
const errors = {
  "400": { description: "Invalid prompt, status, note, or query parameters" },
  "401": { description: "Sign in for member submission, or supply a valid bearer key for polling/status updates" },
  "403": { description: "Missing scope, cross-site member request, paused writes, or not the connection that claimed the task" },
  "404": { description: "Task does not belong to this member or does not exist" },
  "409": { description: "Expired or no longer claimable task, conflicting transition, or 100 outstanding tasks" },
  "429": { description: "60 requests per key per minute shared with other agent routes; honor Retry-After" },
  "503": { description: "Queue temporarily unavailable; do not report completion" },
};
export const taskPaths = {
  "/api/assistant/tasks": {
    post: {
      operationId: "submitMemberAssistantTask",
      summary: "MEMBER SESSION ONLY: submit a request from PayGate, never from an assistant key",
      description: "The signed-in member explicitly submits this task. Assistants cannot submit work for themselves. Stores a request only; does not execute, draft, approve, spend, or send.",
      security: [{ memberSession: [] }],
      requestBody: { required: true, content: json({
        type: "object", additionalProperties: false, required: ["prompt"],
        properties: { prompt: { type: "string", minLength: 1, maxLength: 2000, example: "Add 'QA test' to the end of my bio" } },
      }) },
      responses: { ...errors, "201": { description: "Request queued; expires in 24 hours", content: json({
        type: "object", required: ["id", "status", "created_at"],
        properties: { id: { type: "string" }, status: { type: "string", enum: ["pending"] }, created_at: { type: "string", format: "date-time" } },
      }) } },
    },
    get: {
      operationId: "pollMyAssistantTasks",
      summary: "Poll this member's tasks with tasks_read permission",
      description: "Bearer reads default to pending and oldest first. Member-session reads default to all statuses, newest first. Poll every 2–5 minutes. Active pending/claimed work expires after 24 hours, including before a status update; completed/failed records remain history. Expiry is applied on queue access, not by a prompt-executing background worker. Fetch pending from offset 0 again after claims so changing queue positions do not skip requests.",
      security: [{ memberAssistantKey: [] }, { memberSession: [] }],
      "x-required-scopes": ["read", "tasks_read"],
      parameters: [
        { in: "query", name: "status", schema: { type: "string", enum: ["pending", "claimed", "done", "failed", "expired"] } },
        { in: "query", name: "offset", schema: { type: "integer", minimum: 0, maximum: 100000, default: 0 } },
        { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 10, default: 10 } },
      ],
      responses: { ...errors, "200": { description: "Only this member's tasks; no other member's tasks are returned", content: json({
        type: "object", required: ["tasks", "hasMore", "nextOffset"],
        properties: {
          tasks: { type: "array", items: { $ref: "#/components/schemas/AssistantTask" } },
          hasMore: { type: "boolean" }, nextOffset: { type: ["integer", "null"] },
        },
      }) } },
    },
  },
  "/api/assistant/tasks/{id}": {
    patch: {
      operationId: "updateMyClaimedTask",
      summary: "Claim a pending task or report completion/failure of your own claim",
      description: "Requires tasks_write. Claim before acting. Only the same key ID that claimed can mark done/failed. Token renewal preserves connection ownership; revoked/stale keys and paused writes fail. A done report is NOT member approval or proof of a live change. Save any profile/wishlist proposal through its separate draft scope and leave it pending for human review. No requeue, prompt editing, deletion, approval or automatic execution.",
      "x-required-scopes": ["read", "tasks_write"],
      "x-openai-isConsequential": false,
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: json({
        type: "object", additionalProperties: false, required: ["status"],
        properties: {
          status: { type: "string", enum: ["claimed", "done", "failed"] },
          note: { type: "string", maxLength: 1000, example: "Private draft saved; member review and acceptance are still required." },
        },
      }) },
      responses: { ...errors, "200": { description: "Queue metadata updated; no live profile/wishlist change", content: json({
        type: "object", properties: {
          task: { $ref: "#/components/schemas/AssistantTask" },
          requiresMemberApprovalForDrafts: { type: "boolean", const: true },
        },
      }) } },
    },
  },
};
