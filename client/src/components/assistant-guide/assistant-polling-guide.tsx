import { AlertTriangle, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyPanel, GuideSectionHeading, GuideSteps } from "./guide-primitives";

const claimRequest = `PATCH /api/assistant/tasks/{task-id}
{
  "status": "claimed"
}

PATCH /api/assistant/tasks/{task-id}
{
  "status": "done",
  "note": "Prepared a private profile draft. It still awaits the member’s review and Accept."
}`;

const testTask = "QA test: append “QA test” to my bio. Read my current bio first, then propose a private profile draft with those words. Do not change live data or accept anything.";

export function AssistantPollingGuide() {
  return (
    <section aria-labelledby="polling-setup-heading" className="scroll-mt-8">
      <GuideSectionHeading
        id="polling-setup-heading"
        eyebrow="Part three · Member-controlled polling"
        title="Route a task through Scout or another private tool"
      >
        The member submits the work. A private bearer HTTP tool polls the queue, claims one task, and reports its status. Nothing runs by itself.
      </GuideSectionHeading>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">A new key is needed</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Create a new connection with <code>tasks_read</code> and <code>tasks_write</code>. Existing keys are not upgraded automatically.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Clock3 className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Polling, not push</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Poll every 2–5 minutes. There is no automatic push or webhook delivery in this pilot.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Drafts remain private</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Task scopes do not grant publishing rights. Draft review and Accept stay in the signed-in member UI.</p>
        </div>
      </div>

      <GuideSteps steps={[
        {
          title: "Member creates a new scoped connection",
          body: <>Select <code>tasks_read</code> to poll and <code>tasks_write</code> to claim/report tasks. Keep required <code>read</code>; add <code>profile_drafts</code> and/or <code>wishlist_drafts</code> only if the tool should prepare those private drafts. Replace an older key rather than expecting it to gain new scopes.</>,
        },
        {
          title: "Member submits a request on PayGate",
          body: <>The task form submits <code>{"{ prompt: string }"}</code> to <code>POST /api/assistant/tasks</code> using the member’s signed-in PayGate session. This member-only route is in the full documentation, not the assistant import schema. The member’s task history is newest-first. The AI does not log in with a PayGate password, browser cookie, or a new profile setup. The queue only stores the request; it does not execute it.</>,
        },
        {
          title: "Private AI polls for work",
          body: <>Configure the member-owned Bearer HTTP tool to call <code>GET /api/assistant/tasks?status=pending&amp;limit=10</code> every 2–5 minutes. Its private API credential is used for this request; <code>tasks_read</code> is required. The bearer view returns pending work oldest-first. Active tasks expire after 24 hours; finished records remain in history.</>,
        },
        {
          title: "Claim before doing permitted research or drafting",
          body: <>The tool claims a task with Bearer-authenticated <code>PATCH /api/assistant/tasks/:id</code> and <code>{"{ status: \"claimed\" }"}</code>; this requires <code>tasks_write</code>. Only the key that claimed a task may finish it. Read only the context its scopes allow, then prepare profile or wishlist drafts only when those specific draft scopes are enabled. Save drafts with a new JSON <code>requestId</code> for each intended change; reuse it only for an unchanged retry.</>,
        },
        {
          title: "Report a truthful result",
          body: <>Mark <code>done</code> with a concise note of up to 1,000 characters that says what was prepared and that any draft still awaits member review. If blocked or unsuccessful, use <code>failed</code> with a safe error note. If permission is missing, expired, or revoked, stop and ask the member to correct the connection; if rate-limited, wait. Never mark success after an error.</>,
        },
      ]} />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <CopyPanel label="Example PayGate task · no secret" value={testTask} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status updates are not approvals</CardTitle>
            <CardDescription>Task submission and draft acceptance have different authorities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>The member submits tasks and reviews or accepts drafts with their PayGate session. The private AI uses its own scoped Bearer key only for queue polling and claim/status updates. This page never calls the Bearer task PATCH endpoint.</p>
            <p>“Done” means the AI reported completion. It does not mean a profile or wishlist draft was accepted or applied. Reject discards a suggestion without changing live data. Undo for accepted drafts is not implemented; use the normal member profile editor for manual changes.</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <CopyPanel label="Task claim and result bodies · no credential" value={claimRequest} />
      </div>

      <Card className="mt-4 border-amber-500/25 bg-amber-500/[0.035]">
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm leading-6 text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">Scout client capability remains in owner testing</h3>
              <Badge variant="outline">Not externally verified</Badge>
            </div>
            <p className="mt-1">The exact Scout app/client credential setup has not been confirmed. Do not assume it can store this key or poll correctly until the owner tests it. Never paste the key into a chat or shared shortcut.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
