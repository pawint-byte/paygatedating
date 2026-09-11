import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QA_TEST_REWARD_AMOUNTS, type QaTestRewardInput } from "@shared/qa-test-rewards";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export function QaTestRewardsControl({ disabled, onGranted }: {
  disabled: boolean;
  onGranted: () => Promise<void>;
}) {
  const [amount, setAmount] = useState<QaTestRewardInput["amount"]>(5);
  const [target, setTarget] = useState<QaTestRewardInput["target"]>("both");
  const [message, setMessage] = useState("");
  const grant = useMutation({
    mutationFn: async (input: QaTestRewardInput) => {
      const response = await fetch("/api/admin/qa-members/test-rewards", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "QA reward request failed.");
      return data as { amount: number; members: Array<{ displayName: string; balance: string }> };
    },
    onMutate: () => setMessage("Granting QA test rewards…"),
    onSuccess: async data => {
      setMessage(`Granted $${data.amount} to each selected QA member. ${data.members.map(member =>
        `${member.displayName}: $${Number(member.balance).toFixed(2)}`).join("; ")}. You can grant again for another test.`);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await onGranted();
    },
    onError: (error: Error) => setMessage(`Grant failed: ${error.message}`),
    retry: false,
  });
  const busy = disabled || grant.isPending;
  return (
    <section className="rounded-md border p-3 space-y-3" aria-labelledby="qa-test-rewards-heading">
      <h3 id="qa-test-rewards-heading" className="font-medium">Repeatable QA test rewards</h3>
      <p className="text-sm text-muted-foreground">
        Admin-only testing credits for seeded QA Alice and QA Bob, never real members.
        Each click adds the selected amount per member and records a qa_test_reward ledger entry.
        Run Setup QA members first. This is not a Stripe payment or payment-verification bypass.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Amount per member
          <select className="rounded-md border bg-background p-2" value={amount} disabled={busy}
            onChange={event => setAmount(Number(event.target.value) as QaTestRewardInput["amount"])}>
            {QA_TEST_REWARD_AMOUNTS.map(value => <option key={value} value={value}>${value}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">QA target
          <select className="rounded-md border bg-background p-2" value={target} disabled={busy}
            onChange={event => setTarget(event.target.value as QaTestRewardInput["target"])}>
            <option value="alice">Alice</option><option value="bob">Bob</option><option value="both">Both</option>
          </select>
        </label>
        <Button disabled={busy} aria-busy={grant.isPending} data-testid="grant-test-rewards"
          onClick={() => grant.mutate({ amount, target })}>Grant test rewards</Button>
      </div>
      {message && <p className="text-sm" role={grant.isError ? "alert" : "status"}>{message}</p>}
    </section>
  );
}