import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assistantScopeOptions, formatAssistantDate } from "./types";
import type { AssistantKey, AssistantKeyReviewInput } from "./types";

function statusLabel(status: AssistantKey["status"]) {
  if (status === "review_due") return "Review due";
  if (status === "paused") return "Draft writes paused";
  if (status === "revoked") return "Revoked";
  return "Active";
}

function statusVariant(status: AssistantKey["status"]): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "revoked") return "destructive";
  if (status === "paused") return "secondary";
  return "outline";
}

export function AssistantKeyCard({
  connector,
  busy,
  onReview,
  onRevoke,
}: {
  connector: AssistantKey;
  busy: boolean;
  onReview: (input: AssistantKeyReviewInput) => void;
  onRevoke: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground/70"><KeyRound className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-base">{connector.name}</CardTitle>
              <CardDescription className="mt-1">Created {formatAssistantDate(connector.createdAt)}</CardDescription>
            </div>
          </div>
          <Badge variant={statusVariant(connector.status)}>{statusLabel(connector.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Permissions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {connector.scopes.map((scope) => <Badge key={scope} variant="secondary">{assistantScopeOptions.find((option) => option.value === scope)?.label ?? scope}</Badge>)}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Review date · {formatAssistantDate(connector.reviewDueAt)}</p>
        {connector.status === "paused" && (
          <p className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
            New draft writes are paused. Existing read access remains available until you revoke this key.
          </p>
        )}
        {connector.status !== "revoked" && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button size="sm" variant="outline" onClick={() => onReview({ id: connector.id, action: "renew" })} disabled={busy}>Rotate token</Button>
            <Button size="sm" variant="outline" onClick={() => onReview({ id: connector.id, action: "extend" })} disabled={busy}>Extend 30 days</Button>
            {connector.status === "review_due" || connector.status === "paused" ? (
              <Button size="sm" variant="outline" onClick={() => onReview({ id: connector.id, action: "stop" })} disabled={busy}>Stop access now</Button>
            ) : null}
            <Button size="sm" variant="destructive" onClick={onRevoke} disabled={busy}>Revoke now</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
