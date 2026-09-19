// Internal release checklist. Do not render this content in public product copy.
// Code presence is not the same as confirmed production availability.
export const INTERNAL_NONLIVE_CAPABILITY_CHECKLIST = [
  {
    capability: "Link-only hidden profile",
    status: "not_live",
    evidence: "The visibility toggle removes profiles from browse, but the public-profile API also rejects invisible profiles.",
    publishWhen: "A hidden profile remains reachable by its owner-selected public link and that behavior is covered by production verification.",
  },
  {
    capability: "Travel-area scan",
    status: "production_unconfirmed",
    evidence: "Nearby has current, saved, and searched-city map code, but repository implementation does not confirm the deployed production path.",
    publishWhen: "The deployed Nearby route, city lookup, live toggle, and privacy behavior are verified end to end.",
  },
] as const;