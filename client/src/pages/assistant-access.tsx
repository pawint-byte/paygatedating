import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectorManager } from "@/components/assistant-access/connector-manager";
import { DraftReview } from "@/components/assistant-access/draft-review";
import { AssistantTaskQueue } from "@/components/assistant-access/assistant-task-queue";
import { ASSISTANT_ACCESS_QUERY_KEY } from "@/components/assistant-access/types";
import type { AssistantAccessData } from "@/components/assistant-access/types";

export default function AssistantAccess() {
  const { user } = useAuth();
  const accessQuery = useQuery<AssistantAccessData>({
    queryKey: [...ASSISTANT_ACCESS_QUERY_KEY, user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/assistant/access");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  const healthQuery = useQuery({
    queryKey: ["/api/agent/health"],
    queryFn: async () => {
      const response = await fetch("/api/agent/health", { credentials: "include" });
      if (!response.ok) throw new Error("Connector health is unavailable");
      return response.json();
    },
    staleTime: 30000,
  });

  if (accessQuery.isLoading && !accessQuery.data) {
    return (
      <div className="mx-auto max-w-5xl space-y-7 p-4 md:p-8" aria-label="Loading assistant access">
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (accessQuery.isError && !accessQuery.data) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-xl items-center justify-center p-5">
        <Card className="w-full border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />Assistant access unavailable</CardTitle>
            <CardDescription>We could not load your saved connectors and draft review queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => accessQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const access = accessQuery.data;
  if (!access) return null;

  const refreshAccess = async () => !(await accessQuery.refetch()).isError;

  return (
    <div className="mx-auto max-w-6xl space-y-7 p-4 md:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Member-controlled access</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Assistant access</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect an external AI that you choose. PayGate does not host an assistant or sign in to your AI account.
            </p>
            <Link href="/assistant-guide" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4">
              <BookOpen className="h-4 w-4" />Read the connection guide
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${healthQuery.data ? "bg-emerald-600" : healthQuery.isError ? "bg-destructive" : "bg-muted-foreground"}`} />
            {healthQuery.data ? "Connector API available" : healthQuery.isError ? "Connector API unavailable" : "Checking connector API"}
          </div>
        </div>
      </header>

      <Card className="border-primary/20 bg-primary/[0.035]">
        <CardContent className="flex gap-4 p-5 sm:p-6">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="font-semibold">No actions happen on your behalf</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              With read access, your external AI can see credits, your profile and wishlist, permitted matches and knocks, and notification metadata only—never messages, private partner content, or shipping details. Draft scopes only propose editable profile or wishlist fields. Task scopes only allow polling and reporting task status; they do not grant publishing rights. It cannot message anyone, send gate requests, create pending payments, book dates, purchase items, or publish a profile. Review every draft here; only your explicit acceptance applies permitted changes.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              This uses a private connector or custom action that supports bearer-authenticated HTTP tools. Not every AI client supports that, and PayGate never syncs your AI chat history.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="flex gap-4 p-5 sm:p-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">The first profile stays human-first</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The five-field setup and its initial Accept remain your decision. Assistant profile management is only for an already-accepted profile; the server returns 409 for assistant profile-management requests until that acceptance exists.
            </p>
          </div>
        </CardContent>
      </Card>

      <ConnectorManager keys={access.keys} onRefresh={refreshAccess} isRefreshing={accessQuery.isFetching} />

      <AssistantTaskQueue key={user?.id} memberId={user?.id ?? ""} />

      <DraftReview
        drafts={access.drafts}
        events={access.events}
        keys={access.keys}
        onRefresh={refreshAccess}
      />

      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Private connector setup</CardTitle>
          <CardDescription>Use a private connector or custom action with bearer-authenticated HTTP tools.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">Not all AI tools can call authenticated HTTP endpoints. Check your tool’s connector support and review its privacy settings before adding a key. A key does not import chat history or authorize actions outside its scopes.</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-background p-4">
            <pre className="whitespace-pre text-xs leading-6"><code>{`export PAYGATE_URL="https://your-paygate-origin"
export AGENT_PATH_FROM_OPENAPI="/api/agent/..."

curl "$PAYGATE_URL/api/agent/health"
curl "$PAYGATE_URL/api/agent/openapi.json"
curl -H "Authorization: Bearer YOUR_KEY" \\
  "$PAYGATE_URL$AGENT_PATH_FROM_OPENAPI"`}</code></pre>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Replace the URL and path with your PayGate origin and an operation from the API specification. The example contains a placeholder only; never paste a key into notes, prompts, or public tools.</p>
        </CardContent>
      </Card>
    </div>
  );
}
