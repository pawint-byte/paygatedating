import {
  GATE_COSTS,
  PREMIUM_GATE_DISCOUNT,
  SKIP_AHEAD_COST,
  type Profile,
  type UserRewards,
  type Wallet,
} from "@shared/schema";

export type WalletSpendQuote = {
  amount: number;
  balance: number;
  resultingBalance: number;
  paymentType: "wallet" | "premium" | "first_match_free";
  discountLabel?: string;
};

export type ConfirmedSpend = {
  confirmedGate: keyof typeof GATE_COSTS;
  confirmedAmountCents: number;
};

export function confirmedSpend(
  gate: keyof typeof GATE_COSTS,
  quote: Pick<WalletSpendQuote, "amount">,
): ConfirmedSpend {
  return {
    confirmedGate: gate,
    confirmedAmountCents: Math.round(quote.amount * 100),
  };
}

export function isStaleSpendConfirmation(error: Error): boolean {
  return /^409:/.test(error.message);
}

export function submissionLockAfterOpenTransition(
  wasOpen: boolean,
  isOpen: boolean,
  wasSubmitted: boolean,
): boolean {
  return isOpen && !wasOpen ? false : wasSubmitted;
}

export function walletBalance(wallet?: Pick<Wallet, "balance"> | null): number {
  const balance = Number(wallet?.balance);
  return Number.isFinite(balance) ? balance : 0;
}

export function chapterSpendQuote(
  gate: keyof typeof GATE_COSTS,
  wallet: Pick<Wallet, "balance"> | null | undefined,
  subscriptionTier?: Profile["subscriptionTier"],
  premiumInitiatorGateOneFree = false,
): WalletSpendQuote {
  const baseAmount = GATE_COSTS[gate];
  const isPremium = subscriptionTier === "premium";
  const amount = premiumInitiatorGateOneFree && gate === "gate1" && isPremium
    ? 0
    : isPremium
      ? baseAmount * PREMIUM_GATE_DISCOUNT
      : baseAmount;
  const balance = walletBalance(wallet);
  return {
    amount,
    balance,
    resultingBalance: balance - amount,
    paymentType: isPremium ? "premium" : "wallet",
    discountLabel: isPremium
      ? premiumInitiatorGateOneFree && gate === "gate1"
        ? "Premium Gate 1 benefit"
        : "50% Premium discount"
      : undefined,
  };
}

export function skipSpendQuote(wallet?: Pick<Wallet, "balance"> | null): WalletSpendQuote {
  const balance = walletBalance(wallet);
  return {
    amount: SKIP_AHEAD_COST,
    balance,
    resultingBalance: balance - SKIP_AHEAD_COST,
    paymentType: "wallet",
  };
}

export function knockSpendQuote(
  wallet: Pick<Wallet, "balance"> | null | undefined,
  subscriptionTier?: Profile["subscriptionTier"],
  rewards?: Pick<UserRewards, "firstMatchFreeUsed"> | null,
): WalletSpendQuote {
  const balance = walletBalance(wallet);
  const paymentType = subscriptionTier === "premium"
    ? "premium"
    : rewards && !rewards.firstMatchFreeUsed
      ? "first_match_free"
      : "wallet";
  const amount = paymentType === "wallet" ? GATE_COSTS.gate1 : 0;
  return {
    amount,
    balance,
    resultingBalance: balance - amount,
    paymentType,
    discountLabel: paymentType === "premium"
      ? "Premium Gate 1 benefit"
      : paymentType === "first_match_free"
        ? "First-match-free reward"
        : undefined,
  };
}

export function formatWalletAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}