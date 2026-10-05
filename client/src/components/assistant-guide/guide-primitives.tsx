import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuideSectionHeading({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-6 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>}
    </div>
  );
}

export function GuideSteps({ steps }: { steps: Array<{ title: string; body: ReactNode }> }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">{step.title}</h3>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CopyPanel({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    setFailed(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopied(true);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-6 sm:text-sm"><code>{value}</code></pre>
      <p className="sr-only" role="status" aria-live="polite">{copied ? `${label} copied.` : ""}</p>
      {failed && <p role="alert" className="px-4 pb-4 text-xs text-destructive">Copy was unavailable. Select the text and copy it manually.</p>}
    </div>
  );
}
