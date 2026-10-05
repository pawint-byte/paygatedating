import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

type Gate = "serious_romance" | "activity_partner";
type SetupState = {
  accepted: boolean;
  gate: Gate | null;
  draft: unknown | null;
};

function gatePath(gate: Gate) {
  return gate === "serious_romance" ? "/serious-romance" : "/activity-partner";
}

async function copyWithFallback(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through for browsers that deny clipboard permissions.
    }
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.style.position = "fixed";
  field.style.opacity = "0";
  field.style.pointerEvents = "none";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, field.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(field);
  return copied;
}

export default function MemberGate({ gate }: { gate: Gate }) {
  const { user } = useAuth();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [copying, setCopying] = useState(false);
  const setupQuery = useQuery<SetupState>({
    queryKey: ["/api/setup", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/setup");
      return response.json();
    },
    enabled: !!user,
  });

  if (setupQuery.isLoading || (!setupQuery.data && !setupQuery.isError)) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10">
        <div className="w-full max-w-md animate-pulse space-y-5" aria-label="Loading your profile link">
          <div className="mx-auto h-8 w-48 rounded bg-muted" />
          <div className="mx-auto h-72 w-full rounded-3xl bg-muted" />
        </div>
      </main>
    );
  }

  if (setupQuery.isError || !setupQuery.data) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center">
          <h1 className="font-serif text-2xl">Your profile link isn’t ready</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">We couldn’t check your selected gate. Try again to continue.</p>
          <Button className="mt-5 w-full" onClick={() => setupQuery.refetch()}>Try again</Button>
        </section>
      </main>
    );
  }

  const setup = setupQuery.data;
  if (!setup.accepted) return <Redirect to="/setup" />;
  if (!setup.gate) return <Redirect to="/discover" />;
  if (setup.gate !== gate) return <Redirect to={gatePath(setup.gate)} />;
  if (!user?.id) return <Redirect to="/" />;

  const profileUrl = `${window.location.origin}${gatePath(gate)}/p/${encodeURIComponent(String(user.id))}`;
  const gateHeading = gate === "serious_romance" ? "Serious Romance" : "Activity Partner";

  const handleCopy = async () => {
    setCopying(true);
    setCopyState("idle");
    try {
      const copied = await copyWithFallback(profileUrl);
      setCopyState(copied ? "copied" : "failed");
    } catch {
      setCopyState("failed");
    } finally {
      setCopying(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div className="pointer-events-none absolute -left-24 top-[-5rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-[-6rem] h-80 w-80 rounded-full bg-accent/50 blur-3xl" />
      <section className="relative w-full max-w-lg rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-primary">Your gate</p>
        <h1 className="mt-3 text-center font-serif text-3xl tracking-tight sm:text-4xl">{gateHeading}</h1>

        <div className="mt-8 flex justify-center rounded-2xl bg-background p-5 sm:p-7">
          <QRCodeSVG
            value={profileUrl}
            size={216}
            level="M"
            title="QR code for your profile link"
            className="h-auto max-w-full"
          />
        </div>

        <a
          href={profileUrl}
          className="mt-6 block break-all rounded-xl border border-border bg-background px-4 py-3 text-center text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {profileUrl}
        </a>

        <Button className="mt-4 h-12 w-full rounded-full" onClick={handleCopy} disabled={copying}>
          {copying ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : copyState === "copied" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copying ? "Copying…" : copyState === "copied" ? "Copied" : "Copy"}
        </Button>
        <p className="mt-6 text-center text-sm leading-6 text-foreground/80">
          send this to one person you would actually meet.
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {copyState === "copied" ? "Profile link copied to clipboard." : ""}
        </p>
        {copyState === "failed" && (
          <p role="alert" className="mt-3 text-center text-sm text-destructive">
            Couldn’t copy the link. Select and copy the profile link above.
          </p>
        )}
      </section>
    </main>
  );
}
