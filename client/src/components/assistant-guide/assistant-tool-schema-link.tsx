import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AssistantToolSchemaLink() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const importUrl = `${window.location.origin}/api/agent/openapi.json`;

  const copyImportUrl = async () => {
    setCopied(false);
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(importUrl);
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/[0.035]">
      <CardHeader>
        <CardTitle className="text-base">Assistant-tool import schema</CardTitle>
        <CardDescription>
          Import this assistant-only specification into GPT Actions or another private Bearer HTTP connector. It excludes member-session task submission and cookie authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <code className="block break-all rounded-lg border border-border bg-background p-3 text-xs leading-5">{importUrl}</code>
        <div className="flex flex-wrap items-center gap-3">
          <a href={importUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4">
            Open assistant-only schema<ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button type="button" size="sm" variant="outline" onClick={() => void copyImportUrl()}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy import URL"}
          </Button>
        </div>
        <p role={copyFailed ? "alert" : undefined} className="text-xs text-muted-foreground">
          {copyFailed ? "Copy unavailable. Select the URL above and copy it manually." : "This URL uses the origin currently serving the guide."}
        </p>
      </CardContent>
    </Card>
  );
}
