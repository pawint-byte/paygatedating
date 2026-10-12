import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, MailCheck, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface MigrationReport {
  counts: {
    emailNoPassword: number;
    eligible: number;
    test: number;
    optOut: number;
    alreadyAttempted: number;
    invalidEmail: number;
    ambiguousEmail: number;
  };
  logs: Array<{ status: string; count: number }>;
  subject: string;
  body: string;
  sendEnabled: boolean;
}

interface DispatchResult {
  sent: number;
  failed: number;
  uncertain: number;
  skipped: number;
}

const reportKey = ["/api/admin/password-migration"];
const confirmationPhrase = "SEND PASSWORD UPGRADE";

const exclusions = [
  ["Test / demo accounts", "test"],
  ["Opted out of email notifications", "optOut"],
  ["Previously attempted", "alreadyAttempted"],
  ["Invalid email address", "invalidEmail"],
  ["Ambiguous email address", "ambiguousEmail"],
] as const;

function Count({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{value.toLocaleString()}</span>;
}

export function PasswordMigrationPanel() {
  const [confirmation, setConfirmation] = useState("");
  const [dispatchStarted, setDispatchStarted] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);

  const reportQuery = useQuery<MigrationReport>({
    queryKey: reportKey,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/password-migration/send", {
        confirmation: confirmationPhrase,
      });
      return (await response.json()) as DispatchResult;
    },
    onSuccess: (result) => setDispatchResult(result),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reportKey }),
  });

  const report = reportQuery.data;
  const sendErrorMessage = sendMutation.error?.message || "The request did not return a confirmed result.";
  const sendErrorCode = sendErrorMessage.match(/^(\d{3}):/)?.[1];
  const sendWasRejected = !!sendErrorCode && Number(sendErrorCode) >= 400 && Number(sendErrorCode) < 500;
  const sendWasBusy = sendErrorCode === "409";
  const canSend = report?.sendEnabled === true &&
    confirmation === confirmationPhrase &&
    !dispatchStarted &&
    !sendMutation.isPending;

  const handleDispatch = () => {
    if (!canSend) return;
    setDispatchStarted(true);
    sendMutation.mutate();
  };

  return (
    <Card className="overflow-hidden border-amber-900/15 shadow-sm" data-testid="password-migration-panel">
      <CardHeader className="border-b border-border/70 bg-amber-50/55 dark:bg-amber-950/10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-800 dark:text-amber-300" />
              <CardTitle>Password migration</CardTitle>
            </div>
            <CardDescription>
              Preview the one-time sign-in upgrade for members who do not yet have a password.
            </CardDescription>
          </div>
          {report && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${report.sendEnabled ? "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100" : "bg-muted text-muted-foreground"}`}>
              {report.sendEnabled ? "Release send enabled" : "Preview only"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4 md:p-6">
        {reportQuery.isLoading && (
          <div className="space-y-3" aria-label="Loading migration report">
            <Skeleton className="h-16 w-full" />
            <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-8" />)}</div>
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {reportQuery.isError && (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">Migration report unavailable</p>
                <p className="text-sm text-muted-foreground">{reportQuery.error.message || "The report could not be loaded."}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
              Retry report
            </Button>
          </div>
        )}

        {report && (
          <>
            <section className="grid gap-3 sm:grid-cols-[1.15fr_2fr]">
              <div className="rounded-xl bg-primary/[0.07] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Members with email, no password</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  <Count value={report.counts.emailNoPassword} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Count value={report.counts.eligible} /> currently eligible for the upgrade
                </p>
              </div>
              <div className="rounded-xl border border-border/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Excluded from migration</h3>
                </div>
                <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
                  {exclusions.map(([label, key]) => (
                    <div key={key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <Count value={report.counts[key]} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/80 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">One-time delivery ledger</h3>
              </div>
              {report.logs.length ? (
                <div className="flex flex-wrap gap-2">
                  {report.logs.map(({ status, count }) => (
                    <span key={status} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm">
                      <span className="capitalize text-muted-foreground">{status}</span>
                      <Count value={count} />
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No delivery attempts are recorded yet.</p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Each member gets at most one ledger claim. Interrupted or uncertain attempts are not automatically resent.
              </p>
            </section>

            <section className="rounded-xl border border-border/80 bg-muted/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <MailCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Email preview</h3>
              </div>
              <div className="space-y-3 rounded-lg border border-border/70 bg-background p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
                  <p className="mt-1 text-sm font-medium">{report.subject}</p>
                </div>
                <div className="border-t border-border/70 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Message</p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed">{report.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">The link is single-use and expires after 30 minutes. Existing profiles remain unchanged.</p>
                </div>
              </div>
            </section>

            <section className={`space-y-4 rounded-xl border p-4 ${report.sendEnabled ? "border-destructive/35 bg-destructive/[0.035]" : "border-border/80 bg-muted/20"}`}>
              <div className="flex gap-3">
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${report.sendEnabled ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="space-y-1">
                  <h3 className="font-semibold">Irreversible, one-time dispatch</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Sending creates a permanent attempt for each eligible member. There is no resend: even a network interruption can leave delivery uncertain, and affected members must be checked in the ledger.
                  </p>
                  {!report.sendEnabled && (
                    <p className="text-sm font-medium text-foreground">
                      Sending is disabled in this preview. The preview owner should send only after release.
                    </p>
                  )}
                </div>
              </div>

              {dispatchResult && (
                <div className="rounded-lg border border-emerald-800/20 bg-emerald-50/70 p-3 text-sm text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100" role="status">
                  <div className="mb-2 flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Dispatch request completed; ledger report refreshed.</div>
                  <p className="font-mono text-xs">Sent {dispatchResult.sent} · Failed {dispatchResult.failed} · Uncertain {dispatchResult.uncertain} · Skipped {dispatchResult.skipped}</p>
                </div>
              )}

              {dispatchStarted && sendMutation.isError && (
                <div className="rounded-lg border border-amber-800/25 bg-amber-50/70 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" role="alert">
                  <p className="font-semibold">
                    {sendWasBusy ? "Another migration dispatch is already running." : sendWasRejected ? "The request was rejected." : "Outcome not confirmed — do not retry."}
                  </p>
                  <p className="mt-1">{sendErrorMessage} The migration report has been refreshed so you can inspect the ledger. Do not submit another send; check the ledger before taking any further action.</p>
                </div>
              )}

              {report.sendEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="migration-confirmation">Type <span className="font-mono">{confirmationPhrase}</span> to enable the one-time send</Label>
                  <Input
                    id="migration-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    disabled={dispatchStarted || sendMutation.isPending}
                    placeholder={confirmationPhrase}
                    data-testid="input-migration-confirmation"
                  />
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={handleDispatch}
                    disabled={!canSend}
                    data-testid="button-send-password-migration"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendMutation.isPending ? "Dispatch in progress…" : dispatchStarted ? "Dispatch already requested" : "Send once to eligible members"}
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
