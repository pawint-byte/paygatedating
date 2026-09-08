import { z } from "zod";

export const HEARD_VIA_VALUES = [
  "tiktok",
  "x",
  "reddit",
  "youtube",
  "friend",
  "search",
  "other",
] as const;

export type HeardVia = typeof HEARD_VIA_VALUES[number];

export const HEARD_VIA_OPTIONS: ReadonlyArray<{ value: HeardVia; label: string }> = [
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "friend", label: "Friend" },
  { value: "search", label: "Search" },
  { value: "other", label: "Other" },
];

export const heardViaInputSchema = z.object({
  heardVia: z.enum(HEARD_VIA_VALUES),
  heardViaOther: z.string().trim().max(200).optional(),
}).superRefine((value, context) => {
  if (value.heardVia === "other" && !value.heardViaOther) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["heardViaOther"],
      message: "Please tell us where you heard about PayGate",
    });
  }
});