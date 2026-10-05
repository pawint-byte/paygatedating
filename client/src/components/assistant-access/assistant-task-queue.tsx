import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Clock3, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_ACCESS_QUERY_KEY } from "./types";

type TaskStatus = "pending" | "claimed" | "done" | "failed" | "expired";
type TaskFilter = "all" | TaskStatus;
type AssistantTask = {
  id: string | number;
  prompt: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  claimedAt: string | null;
  finishedAt: string | null;
  note: string | null;
};
type TaskListResponse = {
  tasks: AssistantTask[];
  hasMore: boolean;
  nextOffset: number | null;
};
type AssistantTaskApiRecord = {
  id: string | number;
  prompt: string;
  status: TaskStatus;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  expiresAt?: string;
  expires_at?: string;
  claimedAt?: string | null;
  claimed_at?: string | null;
  finishedAt?: string | null;
  finished_at?: string | null;
  note?: string | null;
};
type AssistantTaskListApiResponse = {
  tasks?: AssistantTaskApiRecord[];
  hasMore?: boolean;
  has_more?: boolean;
  nextOffset?: number | null;
  next_offset?: number | null;
};

const taskQueryPrefix = ["/api/assistant/tasks"];
const taskFilters: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "All tasks" },
  { value: "pending", label: "Pending" },
  { value: "claimed", label: "Claimed" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
];

function formatTaskTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusText(status: TaskStatus) {
  return status === "claimed" ? "Claimed" : status === "done" ? "Reported done" : status[0].toUpperCase() + status.slice(1);
}

function taskStatusVariant(status: TaskStatus): "default" | "secondary" | "outline" | "destructive" {
  if (status === "done") return "default";
  if (status === "failed") return "destructive";
  if (status === "claimed") return "secondary";
  return "outline";
}

export function AssistantTaskQueue({ memberId }: { memberId: string }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<TaskFilter>("all");
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const trimmedPrompt = prompt.trim();
  const mentionsDisallowedAction = /\b(message|contact|text|email|send a gate|gate request|book|buy|purchase|spend|pay|publish|advance a gate)\b/i.test(prompt);

  const tasksQuery = useQuery<TaskListResponse>({
    queryKey: [...taskQueryPrefix, memberId, status, offset, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
      if (status !== "all") params.set("status", status);
      const response = await apiRequest("GET", `/api/assistant/tasks?${params.toString()}`);
      const result = await response.json() as AssistantTaskListApiResponse;
      const nextOffset = result.nextOffset ?? result.next_offset ?? null;
      const hasMore = result.hasMore ?? result.has_more ?? nextOffset !== null;
      return {
        tasks: (result.tasks ?? []).map((task) => ({
          id: task.id,
          prompt: task.prompt,
          status: task.status,
          createdAt: task.createdAt ?? task.created_at ?? "",
          updatedAt: task.updatedAt ?? task.updated_at ?? "",
          expiresAt: task.expiresAt ?? task.expires_at ?? "",
          claimedAt: task.claimedAt ?? task.claimed_at ?? null,
          finishedAt: task.finishedAt ?? task.finished_at ?? null,
          note: task.note ?? null,
        })),
        hasMore,
        nextOffset: hasMore ? nextOffset ?? offset + limit : null,
      } satisfies TaskListResponse;
    },
    enabled: !!memberId,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const submitTask = useMutation({
    mutationFn: async (taskPrompt: string) => {
      const response = await apiRequest("POST", "/api/assistant/tasks", { prompt: taskPrompt });
      return response.json() as Promise<{ id: string; status: "pending"; created_at: string }>;
    },
    onSuccess: () => {
      setPrompt("");
      setStatus("pending");
      setOffset(0);
      void queryClient.invalidateQueries({ queryKey: [...taskQueryPrefix, memberId] });
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedPrompt || trimmedPrompt.length > 2000 || submitTask.isPending) return;
    submitTask.mutate(trimmedPrompt);
  };

  const tasks = tasksQuery.data?.tasks ?? [];
  const submitError = submitTask.error instanceof Error ? submitTask.error.message : "The task could not be submitted. Try again.";

  return (
    <section className="space-y-5" aria-labelledby="scout-tasks-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Member-controlled polling queue</p>
          <h2 id="scout-tasks-heading" className="mt-2 font-serif text-2xl">Scout task queue</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Send a request to your private AI tool. It is queued for polling; nothing runs automatically and you remain responsible for every live change.
          </p>
        </div>
        <Badge variant="outline">Pilot</Badge>
      </div>

      <Card className="border-primary/20 bg-primary/[0.025]">
        <CardHeader>
          <CardTitle className="text-base">Submit a task for your tool</CardTitle>
          <CardDescription>Use plain language. The prompt is submitted through your signed-in PayGate session.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="assistant-task-prompt">Task request</Label>
              <Textarea
                id="assistant-task-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="For example: summarize my pending gate requests without taking action."
                aria-describedby="assistant-task-guidance assistant-task-count"
              />
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span id="assistant-task-guidance">Trimmed request, up to 2,000 characters. Do not include secrets.</span>
                <span id="assistant-task-count" className="shrink-0">{prompt.length}/2000</span>
              </div>
            </div>
            {mentionsDisallowedAction && (
              <p role="status" aria-live="polite" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-5">
                Reminder: your AI must not message, send gate requests, spend, buy, book, advance gates, or publish. Reword this as a permitted read or private draft request; the queued task does not authorize a prohibited action.
              </p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              Tasks expire after 24 hours if unfinished. “Done” is only the AI’s report that it finished; it is not your draft review or Accept, and does not mean a profile or wishlist change was applied. Review and explicitly Accept drafts yourself.
            </p>
            {submitTask.isError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
            <Button type="submit" disabled={!trimmedPrompt || trimmedPrompt.length > 2000 || submitTask.isPending}>
              {submitTask.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {submitTask.isPending ? "Queueing task…" : "Submit task"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl">Task history</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your tasks refresh every 30 seconds while this page is visible.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="task-status-filter" className="text-xs text-muted-foreground">Status</Label>
            <select
              id="task-status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as TaskFilter);
                setOffset(0);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {taskFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              void tasksQuery.refetch();
              void queryClient.invalidateQueries({ queryKey: [...ASSISTANT_ACCESS_QUERY_KEY, memberId] });
            }} disabled={tasksQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${tasksQuery.isFetching ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        </div>

        {tasksQuery.isLoading ? (
          <div className="space-y-3" aria-label="Loading task history">
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : tasksQuery.isError && !tasksQuery.data ? (
          <Card className="border-destructive/20">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <h4 className="font-semibold">Task history unavailable</h4>
                <p className="mt-1 text-sm text-muted-foreground">Your queue could not be loaded. Your existing tasks have not been changed.</p>
                <Button className="mt-3" size="sm" variant="outline" onClick={() => void tasksQuery.refetch()}>Try again</Button>
              </div>
            </CardContent>
          </Card>
        ) : tasks.length ? (
          <>
            {tasksQuery.isError && <p role="alert" className="text-sm text-destructive">Refresh failed. Showing the last loaded task list.</p>}
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">{task.prompt}</p>
                        <p className="mt-2 font-mono text-[11px] text-muted-foreground">Task {task.id}</p>
                      </div>
                      <Badge variant={taskStatusVariant(task.status)}>{statusText(task.status)}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                      <span>Submitted · {formatTaskTime(task.createdAt)}</span>
                      <span>Updated · {formatTaskTime(task.updatedAt)}</span>
                      {task.claimedAt && <span>Claimed · {formatTaskTime(task.claimedAt)}</span>}
                      {task.finishedAt && <span>Finished · {formatTaskTime(task.finishedAt)}</span>}
                      {(task.status === "pending" || task.status === "claimed") && <span>Expires · {formatTaskTime(task.expiresAt)}</span>}
                    </div>
                    {task.note && (
                      <div className="rounded-lg border border-border bg-muted/25 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">AI report</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{task.note}</p>
                      </div>
                    )}
                    {task.status === "done" && (
                      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Reported complete by the AI. Any profile or wishlist draft still needs your review and explicit Accept.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center px-5 py-9 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground"><Clock3 className="h-5 w-5" /></div>
              <h4 className="mt-3 font-semibold">No {status === "all" ? "" : `${status} `}tasks yet</h4>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Submit a task above. Your AI must poll the private queue; it will not receive a push notification or run without its tool.
              </p>
            </CardContent>
          </Card>
        )}

        {!tasksQuery.isLoading && !tasksQuery.isError && (offset > 0 || tasksQuery.data?.hasMore) && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Showing {offset + 1}–{offset + tasks.length}{tasksQuery.data?.hasMore ? " · more available" : ""}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setOffset((current) => Math.max(0, current - limit))} disabled={offset === 0 || tasksQuery.isFetching}>Previous</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setOffset(tasksQuery.data?.nextOffset ?? offset + limit)} disabled={!tasksQuery.data?.hasMore || tasksQuery.data.nextOffset === null || tasksQuery.isFetching}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
