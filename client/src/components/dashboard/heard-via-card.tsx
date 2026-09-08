import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { HEARD_VIA_OPTIONS, type HeardVia } from "@shared/referral-source";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function HeardViaCard() {
  const { toast } = useToast();
  const [skipped, setSkipped] = useState(false);
  const [selection, setSelection] = useState<HeardVia | null>(null);
  const [other, setOther] = useState("");

  const mutation = useMutation({
    mutationFn: async (heardVia: HeardVia) => {
      const response = await apiRequest("PATCH", "/api/auth/heard-via", {
        heardVia,
        ...(heardVia === "other" ? { heardViaOther: other } : {}),
      });
      return await response.json() as User;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({ title: "Thanks for sharing!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save your answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (skipped) return null;

  const choose = (value: HeardVia) => {
    setSelection(value);
    if (value !== "other") mutation.mutate(value);
  };

  return (
    <section className="mb-4 rounded-lg border bg-card p-4 md:p-5" aria-labelledby="heard-via-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="heard-via-title" className="font-semibold">How did you hear about us?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Optional — one answer helps us understand what’s working.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSkipped(true)}>
          Skip
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {HEARD_VIA_OPTIONS.map(option => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={selection === option.value ? "default" : "outline"}
            disabled={mutation.isPending}
            aria-pressed={selection === option.value}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {selection === "other" && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={other}
            maxLength={200}
            autoFocus
            aria-label="Where did you hear about PayGate?"
            placeholder="Tell us where"
            onChange={event => setOther(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && other.trim()) mutation.mutate("other");
            }}
          />
          <Button
            type="button"
            disabled={!other.trim() || mutation.isPending}
            onClick={() => mutation.mutate("other")}
          >
            Save
          </Button>
        </div>
      )}
    </section>
  );
}