import { GATE_COSTS, SKIP_AHEAD_COST } from "./schema";

export const SKIP_LABEL = `Skip ahead — $${SKIP_AHEAD_COST}`;
export const SKIP_SUBCOPY = "Covers both of you so you can plan a date and start voice calls sooner.";
export const SKIP_EXPLANATION = `$${SKIP_AHEAD_COST} is a hasten-to-meet premium covering both people's costs, not a single chapter fee or only your share. It is not the same as one person paying Chapter 5 ($${GATE_COSTS.gate5}). One payment from your wallet unlocks all remaining chapters for this match. After payment, you both reach the same gate—the Connected stage—where you can plan a date and start voice calls sooner.`;
export const SKIP_SUCCESS = "You both landed at the Connected stage. All remaining chapters are unlocked for your match, so you can plan a date and start voice calls.";
export const SKIP_FAQ = {
  question: `Why does Skip ahead cost $${SKIP_AHEAD_COST}?`,
  answer: SKIP_EXPLANATION,
} as const;