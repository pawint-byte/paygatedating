import { useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  draftFieldLabels,
  draftFormValues,
  formatAssistantDate,
  safeDraftChanges,
  serializeDraftFormValues,
  stringifyDraftValue,
  profileDraftFields,
} from "./types";
import type { AssistantDraft, DraftChangeInput, DraftDecisionInput } from "./types";

export function DraftEditorCard({
  draft,
  before,
  busy,
  onSave,
  onAccept,
  onReject,
}: {
  draft: AssistantDraft;
  before: Record<string, unknown>;
  busy: boolean;
  onSave: (input: DraftChangeInput) => Promise<void>;
  onAccept: (input: DraftDecisionInput) => Promise<void>;
  onReject: (input: DraftDecisionInput) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState("");
  const changes = safeDraftChanges(draft);
  const fields = draft.kind === "profile" ? profileDraftFields : ["title", "description", "affiliateUrl", "price", "visibility", "priceTier"] as const;
  const changedFields = fields.filter((field) => Object.prototype.hasOwnProperty.call(changes, field));

  const startEditing = () => {
    setValues(draftFormValues(draft, before));
    setEditError("");
    setEditing(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextChanges = serializeDraftFormValues(draft, values, before);
    if (draft.kind === "wishlist" && draft.operation === "add") {
      const missing = ["title", "affiliateUrl", "price"].filter((field) => !String(nextChanges[field] ?? "").trim());
      if (missing.length) {
        setEditError("A new wishlist item needs a title, product link, and price.");
        return;
      }
    }
    if (draft.kind === "wishlist" && String(nextChanges.price ?? "").trim()) {
      const price = String(nextChanges.price).trim();
      if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
        setEditError("Enter a positive price with up to two decimal places.");
        return;
      }
    }
    setEditError("");
    try {
      await onSave({ id: draft.id, changes: nextChanges, revision: draft.revision });
      setEditing(false);
    } catch {
      // Parent surfaces API errors and requires refresh after stale conflicts.
    }
  };

  const actOnDraft = async (action: "accept" | "reject") => {
    setEditError("");
    try {
      const input = { id: draft.id, revision: draft.revision };
      await (action === "accept" ? onAccept : onReject)(input);
    } catch {
      // Keep this pending draft visible; parent supplies reload feedback.
    }
  };

  const shownFields = changedFields.length ? changedFields : fields.filter((field) => Object.prototype.hasOwnProperty.call(before, field));

  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="gap-3 border-b border-border/70 bg-muted/25 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{draft.kind === "profile" ? "Profile draft" : "Wishlist draft"}</CardTitle>
            <Badge variant={draft.status === "pending" ? "outline" : draft.status === "accepted" ? "default" : "secondary"}>{draft.status}</Badge>
            <Badge variant="secondary">{draft.operation}</Badge>
          </div>
          <CardDescription className="mt-2">Prepared {formatAssistantDate(draft.createdAt)} · revision {draft.revision}</CardDescription>
        </div>
        {draft.status === "pending" && !editing && (
          <Button type="button" variant="outline" size="sm" onClick={startEditing}>Edit draft</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        {editing ? (
          <form className="space-y-4" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2">
              {draft.kind === "profile" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`displayName-${draft.id}`}>Display name</Label>
                    <Input id={`displayName-${draft.id}`} value={values.displayName ?? ""} maxLength={100} onChange={(event) => setValues((old) => ({ ...old, displayName: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`lookingFor-${draft.id}`}>Looking for</Label>
                    <Input id={`lookingFor-${draft.id}`} value={values.lookingFor ?? ""} maxLength={100} onChange={(event) => setValues((old) => ({ ...old, lookingFor: event.target.value }))} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`bio-${draft.id}`}>Bio</Label>
                    <Textarea id={`bio-${draft.id}`} value={values.bio ?? ""} rows={3} onChange={(event) => setValues((old) => ({ ...old, bio: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`interests-${draft.id}`}>Interests</Label>
                    <Textarea id={`interests-${draft.id}`} value={values.interests ?? ""} rows={2} onChange={(event) => setValues((old) => ({ ...old, interests: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`dealBreakers-${draft.id}`}>Deal breakers</Label>
                    <Textarea id={`dealBreakers-${draft.id}`} value={values.dealBreakers ?? ""} rows={2} onChange={(event) => setValues((old) => ({ ...old, dealBreakers: event.target.value }))} />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Separate interests and deal breakers with commas. Only these five profile fields can be drafted here.</p>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`title-${draft.id}`}>Title</Label>
                    <Input id={`title-${draft.id}`} value={values.title ?? ""} maxLength={200} onChange={(event) => setValues((old) => ({ ...old, title: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`price-${draft.id}`}>Price</Label>
                    <Input id={`price-${draft.id}`} inputMode="decimal" value={values.price ?? ""} onChange={(event) => setValues((old) => ({ ...old, price: event.target.value }))} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`description-${draft.id}`}>Description</Label>
                    <Textarea id={`description-${draft.id}`} value={values.description ?? ""} rows={2} onChange={(event) => setValues((old) => ({ ...old, description: event.target.value }))} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`affiliateUrl-${draft.id}`}>Product link</Label>
                    <Input id={`affiliateUrl-${draft.id}`} type="url" value={values.affiliateUrl ?? ""} onChange={(event) => setValues((old) => ({ ...old, affiliateUrl: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`visibility-${draft.id}`}>Visibility</Label>
                    <select id={`visibility-${draft.id}`} value={values.visibility ?? ""} onChange={(event) => setValues((old) => ({ ...old, visibility: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Choose visibility</option>
                      <option value="public">Public</option>
                      <option value="matches_only">Matches only</option>
                      <option value="after_gate1">After gate 1</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`priceTier-${draft.id}`}>Price tier</Label>
                    <select id={`priceTier-${draft.id}`} value={values.priceTier ?? ""} onChange={(event) => setValues((old) => ({ ...old, priceTier: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Choose price tier</option>
                      <option value="starter">Starter</option>
                      <option value="impressive">Impressive</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  {draft.operation === "add" && <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">A new wishlist item needs a title, product link, and price.</p>}
                </>
              )}
            </div>
            {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save edits"}</Button>
              <Button type="button" variant="outline" onClick={() => { setEditing(false); setEditError(""); }}>Cancel</Button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-border bg-background p-4" aria-label="Current values">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Before</h3>
                {draft.operation === "add" ? (
                  <p className="mt-3 text-sm text-muted-foreground">No existing item — this is a proposed addition.</p>
                ) : shownFields.length ? (
                  <dl className="mt-3 space-y-3">
                    {shownFields.map((field) => (
                      <div key={field}>
                        <dt className="text-xs text-muted-foreground">{draftFieldLabels[field]}</dt>
                        <dd className="mt-0.5 break-words text-sm">{stringifyDraftValue(before[field])}</dd>
                      </div>
                    ))}
                    {changedFields.length === 0 && <p className="text-xs text-muted-foreground">Current values shown for context.</p>}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Current value is unavailable. Reload before accepting.</p>
                )}
              </section>
              <section className="rounded-xl border border-primary/25 bg-primary/[0.035] p-4" aria-label="Proposed values">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">After review</h3>
                {changedFields.length ? (
                  <dl className="mt-3 space-y-3">
                    {changedFields.map((field) => (
                      <div key={field}>
                        <dt className="text-xs text-muted-foreground">{draftFieldLabels[field]}</dt>
                        <dd className="mt-0.5 break-words text-sm">{stringifyDraftValue(changes[field])}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No field changes were supplied.</p>
                )}
              </section>
            </div>
            {draft.status === "pending" && (
              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => actOnDraft("reject")} disabled={busy}>
                  <X className="mr-2 h-4 w-4" />Reject draft
                </Button>
                <Button type="button" onClick={() => actOnDraft("accept")} disabled={busy || (draft.operation === "update" && Object.keys(before).length === 0)}>
                  <Check className="mr-2 h-4 w-4" />Accept these changes
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
