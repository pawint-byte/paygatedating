import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, KeyRound, LoaderCircle, LockKeyhole, Plus, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { AssistantKeyCard } from "./assistant-key-card";
import { CredentialDialog, type OneTimeCredential } from "./credential-dialog";
import {
  ASSISTANT_ACCESS_QUERY_KEY,
  assistantScopeOptions,
  getAccessError,
} from "./types";
import type { AccessPageError, AssistantKey, AssistantKeyReviewInput, AssistantScope } from "./types";

export function ConnectorManager({
  keys,
  onRefresh,
  isRefreshing,
}: {
  keys: AssistantKey[];
  onRefresh: () => Promise<boolean>;
  isRefreshing: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [profileDraftScope, setProfileDraftScope] = useState(false);
  const [wishlistDraftScope, setWishlistDraftScope] = useState(false);
  const [actionError, setActionError] = useState<AccessPageError | null>(null);
  const [credential, setCredential] = useState<OneTimeCredential | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<AssistantKey | null>(null);

  const refreshAfterChange = () => queryClient.invalidateQueries({ queryKey: ASSISTANT_ACCESS_QUERY_KEY });
  const createKey = useMutation({
    mutationFn: async (input: { name: string; scopes: AssistantScope[] }) => {
      const response = await apiRequest("POST", "/api/agent/keys", input);
      const result = await response.json() as { key: AssistantKey; token: string };
      setCredential({ name: result.key.name, token: result.token });
      return result.key;
    },
    onSuccess: () => {
      setActionError(null);
      setName("");
      setProfileDraftScope(false);
      setWishlistDraftScope(false);
      void refreshAfterChange();
    },
    onError: (error) => setActionError(getAccessError(error, "connector key")),
  });

  const reviewKey = useMutation({
    mutationFn: async ({ id, action }: AssistantKeyReviewInput) => {
      const response = await apiRequest("POST", `/api/assistant/keys/${encodeURIComponent(id)}/review`, { action });
      if (action === "renew") {
        const result = await response.json() as { key?: AssistantKey; token: string };
        setCredential({ name: result.key?.name ?? "Renewed connector key", token: result.token });
      }
    },
    onSuccess: () => {
      setActionError(null);
      void refreshAfterChange();
    },
    onError: (error) => setActionError(getAccessError(error, "connector key")),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agent/keys/${encodeURIComponent(id)}`);
    },
    onSuccess: () => {
      setActionError(null);
      setKeyToRevoke(null);
      void refreshAfterChange();
    },
    onError: (error) => setActionError(getAccessError(error, "connector key")),
  });

  const mutationPending = createKey.isPending || reviewKey.isPending || revokeKey.isPending;
  const busy = mutationPending || !!actionError?.needsRefresh;
  const createConnector = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setActionError({ message: "Give this connector a name so you can recognize it later.", needsRefresh: false });
      return;
    }
    const scopes: AssistantScope[] = ["read"];
    if (profileDraftScope) scopes.push("profile_drafts");
    if (wishlistDraftScope) scopes.push("wishlist_drafts");
    setActionError(null);
    createKey.mutate({ name: trimmedName, scopes });
  };

  const refresh = async () => {
    const ok = await onRefresh();
    if (ok) setActionError(null);
    else setActionError({ message: "The latest connector data could not be loaded.", needsRefresh: true });
  };

  return (
    <>
      {actionError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-destructive">{actionError.message}</p>
          {actionError.needsRefresh && <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={mutationPending || isRefreshing}>Reload latest data</Button>}
        </div>
      )}

      <section aria-labelledby="key-create-heading" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground"><KeyRound className="h-5 w-5" /></div>
              <div>
                <CardTitle id="key-create-heading">Create a private connector</CardTitle>
                <CardDescription className="mt-1">The secret is shown once, after creation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={createConnector}>
              <div className="space-y-2">
                <Label htmlFor="connector-name">Connector name</Label>
                <Input id="connector-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="For example, my private writing tool" required />
                <p className="text-right text-xs text-muted-foreground">{name.length}/80</p>
              </div>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Permissions</legend>
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex gap-3">
                    <Checkbox id="scope-read" checked disabled />
                    <div>
                      <Label htmlFor="scope-read" className="font-medium">{assistantScopeOptions[0].label}</Label>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Required. Suggestions can only refer to your own member-owned content.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[{ state: profileDraftScope, set: setProfileDraftScope, id: "scope-profile", item: assistantScopeOptions[1] }, { state: wishlistDraftScope, set: setWishlistDraftScope, id: "scope-wishlist", item: assistantScopeOptions[2] }].map(({ state, set, id, item }) => (
                    <div key={id} className="flex gap-3 rounded-xl border border-border p-3">
                      <Checkbox id={id} checked={state} onCheckedChange={(checked) => set(checked === true)} />
                      <div>
                        <Label htmlFor={id} className="font-medium">{item.label}</Label>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
              <Button type="submit" className="w-full sm:w-auto" disabled={createKey.isPending}>
                {createKey.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create connector key
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></div>
              <div>
                <CardTitle>Access has a review window</CardTitle>
                <CardDescription className="mt-1">You stay in control of how long a key can read or propose drafts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-medium">30 days, then a 7-day grace period</p>
              <p className="mt-1 text-muted-foreground">At the review date, choose to rotate the token, extend the current token by 30 days, or stop access. If you leave the review unanswered for 7 days, new draft writes pause. Reads remain available unless you revoke the key.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <a href="/api/agent/openapi.json" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4">
                API specification <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href="/api/agent/health" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4">
                Connector health <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">The read, profile-draft, and wishlist-draft scopes are enforced by the server. No credentials are stored in this browser.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="active-keys-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="active-keys-heading" className="font-serif text-2xl">Your connectors</h2>
            <p className="mt-1 text-sm text-muted-foreground">Revoke anything you no longer recognize or use.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={mutationPending || isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
        {keys.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {keys.map((connector) => (
              <AssistantKeyCard
                key={connector.id}
                connector={connector}
                busy={busy}
                onReview={(input) => reviewKey.mutate(input)}
                onRevoke={() => setKeyToRevoke(connector)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center px-5 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground"><LockKeyhole className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">No connector keys yet</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Create a named key only for an external tool you trust. Nothing connects until you configure that tool yourself.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <CredentialDialog credential={credential} onClose={() => setCredential(null)} />

      <AlertDialog open={!!keyToRevoke} onOpenChange={(open) => { if (!open && !revokeKey.isPending) setKeyToRevoke(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this connector?</AlertDialogTitle>
            <AlertDialogDescription>{keyToRevoke?.name} will lose access immediately. This cannot be undone; you can create a new key later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeKey.isPending}>Keep access</AlertDialogCancel>
            <AlertDialogAction disabled={revokeKey.isPending} onClick={() => keyToRevoke && revokeKey.mutate(keyToRevoke.id)}>
              {revokeKey.isPending ? "Revoking…" : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
