import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Clock3, RefreshCw } from "lucide-react";
import type { Profile, RegistryItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DraftEditorCard } from "./draft-editor-card";
import {
  ASSISTANT_ACCESS_QUERY_KEY,
  currentDraftValues,
  formatAssistantDate,
  getAccessError,
} from "./types";
import type { AccessPageError, AssistantDraft, AssistantEvent, AssistantKey, DraftChangeInput, DraftDecisionInput } from "./types";

export function DraftReview({
  drafts,
  events,
  keys,
  onRefresh,
}: {
  drafts: AssistantDraft[];
  events: AssistantEvent[];
  keys: AssistantKey[];
  onRefresh: () => Promise<boolean>;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pageError, setPageError] = useState<AccessPageError | null>(null);
  const pendingDrafts = useMemo(() => drafts.filter((draft) => draft.status === "pending"), [drafts]);
  const reviewedDrafts = useMemo(() => drafts.filter((draft) => draft.status !== "pending"), [drafts]);
  const profileQuery = useQuery<Profile>({
    queryKey: ["/api/profile", "assistant", user?.id],
    queryFn: async () => (await apiRequest("GET", "/api/profile")).json(),
    enabled: pendingDrafts.some((draft) => draft.kind === "profile"),
  });
  const registryQuery = useQuery<RegistryItem[]>({
    queryKey: ["/api/registry", "assistant", user?.id],
    queryFn: async () => (await apiRequest("GET", "/api/registry")).json(),
    enabled: pendingDrafts.some((draft) => draft.kind === "wishlist"),
  });

  const saveDraft = useMutation({
    mutationFn: async ({ id, changes, revision }: DraftChangeInput) => {
      const response = await apiRequest("PATCH", `/api/assistant/drafts/${encodeURIComponent(id)}`, { changes, revision });
      return response.json();
    },
    onSuccess: () => {
      setPageError(null);
      void queryClient.invalidateQueries({ queryKey: ASSISTANT_ACCESS_QUERY_KEY });
    },
    onError: (error) => setPageError(getAccessError(error, "draft")),
  });

  const acceptDraft = useMutation({
    mutationFn: async ({ id, revision }: DraftDecisionInput) => {
      const response = await apiRequest("POST", `/api/assistant/drafts/${encodeURIComponent(id)}/accept`, { revision });
      return response.json();
    },
    onSuccess: () => {
      setPageError(null);
      void queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/registry"] });
      void queryClient.invalidateQueries({ queryKey: ASSISTANT_ACCESS_QUERY_KEY });
    },
    onError: (error) => setPageError(getAccessError(error, "draft")),
  });

  const rejectDraft = useMutation({
    mutationFn: async ({ id, revision }: DraftDecisionInput) => {
      const response = await apiRequest("POST", `/api/assistant/drafts/${encodeURIComponent(id)}/reject`, { revision });
      return response.json();
    },
    onSuccess: () => {
      setPageError(null);
      void queryClient.invalidateQueries({ queryKey: ASSISTANT_ACCESS_QUERY_KEY });
    },
    onError: (error) => setPageError(getAccessError(error, "draft")),
  });

  const mutationPending = saveDraft.isPending || acceptDraft.isPending || rejectDraft.isPending;
  const busy = mutationPending || !!pageError?.needsRefresh;
  const reloadLatest = async () => {
    const results: boolean[] = [await onRefresh()];
    if (pendingDrafts.some((draft) => draft.kind === "profile")) results.push(!(await profileQuery.refetch()).isError);
    if (pendingDrafts.some((draft) => draft.kind === "wishlist")) results.push(!(await registryQuery.refetch()).isError);
    if (results.every(Boolean)) setPageError(null);
    else setPageError({ message: "The latest access data could not be loaded. Do not review or accept stale drafts.", needsRefresh: true });
  };

  const keyNames = useMemo(() => new Map(keys.map((key) => [key.id, key.name])), [keys]);
  const accessError = profileQuery.isError || registryQuery.isError;

  return (
    <div className="space-y-7">
      {pageError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-destructive">{pageError.message}</p>
          {pageError.needsRefresh && <Button variant="outline" size="sm" onClick={() => void reloadLatest()} disabled={mutationPending || profileQuery.isFetching || registryQuery.isFetching}>Reload latest data</Button>}
        </div>
      )}

      <section className="space-y-4" aria-labelledby="draft-review-heading">
        <div>
          <h2 id="draft-review-heading" className="font-serif text-2xl">Drafts waiting for you</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nothing changes until you accept a specific profile or wishlist draft.</p>
        </div>
        {accessError && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Current profile or wishlist values could not be loaded. Update drafts remain unavailable for acceptance until the before view is ready.
          </div>
        )}
        {pendingDrafts.length ? (
          <div className="space-y-4">
            {pendingDrafts.map((draft) => (
              <DraftEditorCard
                key={draft.id}
                draft={draft}
                before={currentDraftValues(draft, profileQuery.data, registryQuery.data)}
                busy={busy}
                onSave={(input) => saveDraft.mutateAsync(input).then(() => undefined)}
                onAccept={(input) => acceptDraft.mutateAsync(input).then(() => undefined)}
                onReject={(input) => rejectDraft.mutateAsync(input).then(() => undefined)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex items-start gap-4 p-5 sm:p-6">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Check className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Nothing is waiting for approval</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Your assistant can only prepare drafts within the scopes you granted. Review and accept each one here.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="history-heading">
        <div>
          <h2 id="history-heading" className="font-serif text-2xl">Review history</h2>
          <p className="mt-1 text-sm text-muted-foreground">A record of connector and draft actions. Secrets are never included.</p>
        </div>
        {events.length ? (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {events.map((event) => {
                const draft = drafts.find((item) => item.id === event.draftId);
                const label = event.action.replace(/[_-]+/g, " ");
                const target = event.keyId ? keyNames.get(event.keyId) ?? "Connector key" : draft ? `${draft.kind} draft` : "Member action";
                return (
                  <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium capitalize">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{target}</p>
                    </div>
                    <time className="text-xs text-muted-foreground">{formatAssistantDate(event.createdAt)}</time>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Clock3 className="h-5 w-5 shrink-0" />
              Connector and review activity will appear here after your first action.
            </CardContent>
          </Card>
        )}
        {reviewedDrafts.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold">Resolved draft decisions</h3>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {reviewedDrafts.map((draft) => (
                  <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{draft.kind === "profile" ? "Profile draft" : "Wishlist draft"} · {draft.operation}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reviewed {formatAssistantDate(draft.createdAt)}</p>
                    </div>
                    <Badge variant={draft.status === "accepted" ? "default" : "secondary"}>{draft.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
