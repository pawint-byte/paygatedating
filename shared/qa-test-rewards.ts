import { z } from "zod";

export const QA_TEST_REWARD_SOURCE = "qa_test_reward";
export const QA_TEST_REWARD_AMOUNTS = [5, 10, 20] as const;
export const qaTestRewardSchema = z.object({
  amount: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  target: z.enum(["alice", "bob", "both"]),
}).strict();
export type QaTestRewardInput = z.infer<typeof qaTestRewardSchema>;