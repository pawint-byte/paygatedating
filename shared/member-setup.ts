import { z } from "zod";

export const setupGateSchema = z.enum(["serious_romance", "activity_partner"]);
const shortWords = z.string().trim().min(1, "Please enter a few words.").max(240);
export const setupDraftSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  gate: setupGateSchema,
  wants: shortWords,
  willNot: shortWords,
  photo: z.string().max(2_800_000).regex(
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    "Choose a JPEG, PNG, or WebP photo.",
  ).nullable().optional(),
}).strict();

export function makeSetupBio(wants: string, willNot: string): string {
  // Formatting only; never infer preferences or call a model.
  const fragment = (words: string) => words.trim()
    .replace(/[.!?]+/g, ",").replace(/[\r\n]+/g, " ")
    .replace(/,+/g, ",").replace(/[,;:\s]+$/, "");
  return `What I want: ${fragment(wants)}. What I will not do: ${fragment(willNot)}.`;
}

export function setupDestination(gate: string): string {
  return gate === "activity_partner" ? "/activity-partner" : "/serious-romance";
}
