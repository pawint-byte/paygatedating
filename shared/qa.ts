// Fixed, clearly labeled QA fixtures. Never accept arbitrary members or amounts.
export const QA_MEMBERS = [
  { userId: "qa_track_a_alice", displayName: "QA Alice", age: 28, gender: "woman" },
  { userId: "qa_track_a_bob", displayName: "QA Bob", age: 30, gender: "man" },
] as const;

export const QA_INITIAL_CREDIT = 20;
export const QA_MEMBER_HEADER = "X-Paygate-QA-Member";
export const QA_GRANT_DESCRIPTION = "Track A QA: one-time $20 in-app test credit (not a payment)";

export function isQaMemberId(value: unknown): value is typeof QA_MEMBERS[number]["userId"] {
  return QA_MEMBERS.some(member => member.userId === value);
}