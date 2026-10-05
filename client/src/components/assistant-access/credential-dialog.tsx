import { useEffect, useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { copyAssistantSecret } from "./types";

export type OneTimeCredential = { name: string; token: string };

export function CredentialDialog({
  credential,
  onClose,
}: {
  credential: OneTimeCredential | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [credential?.token]);

  const copy = async () => {
    if (!credential) return;
    setCopyError(false);
    try {
      const success = await copyAssistantSecret(credential.token);
      setCopied(success);
      setCopyError(!success);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <Dialog open={!!credential} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Your connector secret</DialogTitle>
          <DialogDescription>
            {credential?.name} · shown once. Copy it into the private connector you control now. Closing this window clears it from the page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <code className="block break-all text-sm leading-6">{credential?.token}</code>
          </div>
          <Button className="w-full" onClick={() => void copy()}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy secret"}
          </Button>
          <p className="sr-only" role="status" aria-live="polite">{copied ? "Connector secret copied." : ""}</p>
          {copyError && <p role="alert" className="text-sm text-destructive">Couldn’t copy automatically. Select the secret above and copy it before closing this window.</p>}
          <p className="text-xs leading-5 text-muted-foreground">
            This secret is not saved in local storage, session storage, or the review history. If it is lost, rotate the key to create a new one-time secret.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close and clear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
