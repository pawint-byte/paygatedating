import type { Profile, RegistryItem } from "@shared/schema";

export type AssistantScope = "read" | "profile_drafts" | "wishlist_drafts";
export type AssistantKeyStatus = "active" | "review_due" | "paused" | "revoked";
export type AssistantKey = {
  id: string;
  name: string;
  scopes: AssistantScope[];
  reviewDueAt: string;
  revokedAt: string | null;
  status: AssistantKeyStatus;
  createdAt: string;
};
export type DraftKind = "profile" | "wishlist";
export type DraftStatus = "pending" | "accepted" | "rejected";
export type AssistantDraft = {
  id: string;
  kind: DraftKind;
  operation: "update" | "add";
  targetId: string | null;
  changes: Record<string, unknown>;
  status: DraftStatus;
  revision: number;
  createdAt: string;
};
export type AssistantEvent = {
  id: string;
  action: string;
  keyId: string | null;
  draftId: string | null;
  createdAt: string;
};
export type AssistantAccessData = {
  keys: AssistantKey[];
  drafts: AssistantDraft[];
  events: AssistantEvent[];
  capabilities: Record<string, unknown>;
};
export type AccessPageError = { message: string; needsRefresh: boolean };
export type DraftChangeInput = { id: string; changes: Record<string, unknown>; revision: number };
export type DraftDecisionInput = { id: string; revision: number };
export type AssistantKeyReviewInput = { id: string; action: "renew" | "extend" | "stop" };

export const ASSISTANT_ACCESS_QUERY_KEY = ["/api/assistant/access"];
export const assistantScopeOptions: Array<{ value: AssistantScope; label: string; description: string }> = [
  {
    value: "read",
    label: "Read profile, wishlist, and gate-request context",
    description: "Summarize gate requests and refer to your own profile or wishlist without sending anything.",
  },
  {
    value: "profile_drafts",
    label: "Propose profile drafts",
    description: "Prepare editable profile-field suggestions for your review.",
  },
  {
    value: "wishlist_drafts",
    label: "Propose wishlist drafts",
    description: "Prepare editable wishlist-field suggestions for your review.",
  },
];

export const profileDraftFields = ["displayName", "bio", "lookingFor", "interests", "dealBreakers"] as const;
export const wishlistDraftFields = ["title", "description", "affiliateUrl", "price", "visibility", "priceTier"] as const;
export const draftFieldLabels: Record<string, string> = {
  displayName: "Display name",
  bio: "Bio",
  lookingFor: "Looking for",
  interests: "Interests",
  dealBreakers: "Deal breakers",
  title: "Title",
  description: "Description",
  affiliateUrl: "Product link",
  price: "Price",
  visibility: "Visibility",
  priceTier: "Price tier",
};

export function formatAssistantDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function getAccessError(error: unknown, subject: string): AccessPageError {
  const message = error instanceof Error ? error.message : "";
  const status = Number(message.match(/^(\d{3}):/)?.[1] ?? 0);
  if (status === 409) {
    return {
      message: `This ${subject} changed after you opened it. Reload the latest access data before reviewing it again.`,
      needsRefresh: true,
    };
  }
  if (status === 404) {
    return {
      message: `This ${subject} is no longer available. Reload access data to see the current state.`,
      needsRefresh: true,
    };
  }
  if (status === 401 || status === 403) {
    return { message: "Your session or permission changed. Sign in again, then reload this page.", needsRefresh: false };
  }
  return {
    message: `We couldn’t update this ${subject}. Your existing access and pending review were not intentionally changed.`,
    needsRefresh: false,
  };
}

export async function copyAssistantSecret(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Use the temporary selection fallback when clipboard permissions are denied.
    }
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.setAttribute("aria-hidden", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, input.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(input);
  return copied;
}

export function currentDraftValues(
  draft: AssistantDraft,
  profile: Profile | undefined,
  registry: RegistryItem[] | undefined,
): Record<string, unknown> {
  if (draft.kind === "profile") {
    if (!profile) return {};
    return {
      displayName: profile.displayName,
      bio: profile.bio,
      lookingFor: profile.lookingFor,
      interests: profile.interests ?? [],
      dealBreakers: profile.dealBreakers ?? [],
    };
  }
  const item = registry?.find((entry) => entry.id === draft.targetId);
  if (!item) return {};
  return {
    title: item.title,
    description: item.description,
    affiliateUrl: item.affiliateUrl,
    price: item.price,
    visibility: item.visibility,
    priceTier: item.priceTier,
  };
}

export function safeDraftChanges(draft: AssistantDraft) {
  const allowedFields = draft.kind === "profile" ? profileDraftFields : wishlistDraftFields;
  const changes: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(draft.changes, field)) {
      changes[field] = draft.changes[field];
    }
  }
  return changes;
}

export function stringifyDraftValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "—";
  return String(value);
}

export function draftFormValues(draft: AssistantDraft, before: Record<string, unknown>): Record<string, string> {
  const initial = { ...before, ...safeDraftChanges(draft) };
  const fields = draft.kind === "profile" ? profileDraftFields : wishlistDraftFields;
  return Object.fromEntries(fields.map((field) => [
    field,
    Array.isArray(initial[field]) ? (initial[field] as unknown[]).join(", ") : String(initial[field] ?? ""),
  ]));
}

export function serializeDraftFormValues(
  draft: AssistantDraft,
  values: Record<string, string>,
  before: Record<string, unknown>,
) {
  const fields = draft.kind === "profile" ? profileDraftFields : wishlistDraftFields;
  const originalChanges = safeDraftChanges(draft);
  const changes: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field] ?? "";
    const value: unknown = field === "interests" || field === "dealBreakers"
      ? raw.split(",").map((part) => part.trim()).filter(Boolean)
      : raw.trim();
    const baseline = before[field];
    const baselineText = Array.isArray(baseline) ? baseline.join(", ") : String(baseline ?? "");
    const nextText = Array.isArray(value) ? value.join(", ") : String(value);
    if (draft.operation === "add") {
      if (nextText !== "") changes[field] = value;
    } else if (Object.prototype.hasOwnProperty.call(originalChanges, field) || nextText !== baselineText) {
      changes[field] = value;
    }
  }
  return changes;
}
