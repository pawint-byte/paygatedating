import { z } from "zod";
import { QA_MEMBERS } from "./qa";

export const QA_CONTROL_GATES = [
  "gate1",
  "gate2",
  "gate3",
  "gate4",
  "gate5",
  "completed",
] as const;

export const qaGateControlSchema = z.object({
  gate: z.enum(QA_CONTROL_GATES),
}).strict();

export type QaGateControlInput = z.infer<typeof qaGateControlSchema>;

export type QaFixtureRecord = {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    isAdmin: boolean;
  } | null;
  profile?: {
    displayName: string;
    subscriptionTier: string | null;
  } | null;
  wallet?: {
    trialCreditsReceived: boolean;
  } | null;
};

/**
 * A fixture is valid only while the complete Setup QA members contract still
 * holds. This is intentionally shared by direct gate controls and the normal
 * message impersonation gate; names alone are never sufficient.
 */
export function isValidQaFixtureRecord(userId: unknown, record: QaFixtureRecord | undefined) {
  const fixture = QA_MEMBERS.find(member => member.userId === userId);
  return !!fixture &&
    !!record?.user &&
    !record.user.isAdmin &&
    record.user.email === null &&
    record.user.firstName === "QA" &&
    record.user.lastName === fixture.displayName.slice(3) &&
    !!record.profile &&
    record.profile.displayName === fixture.displayName &&
    record.profile.subscriptionTier === "free" &&
    !!record.wallet &&
    record.wallet.trialCreditsReceived === true;
}