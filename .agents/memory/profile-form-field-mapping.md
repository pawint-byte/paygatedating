---
name: Profile form field mapping
description: Why profile fields can save server-side yet appear blank after reload, and the silent-validation pitfall in the profile setup form.
---

# Profile setup form: field mapping & validation pitfalls

The member profile edit screen splits responsibility across two files: the page
(`client/src/pages/profile.tsx`) builds the `defaultValues` object from the saved
profile, and the form component (`client/src/components/dashboard/profile-setup-form.tsx`)
re-maps every field into its own `useForm({ defaultValues })`.

**Rule:** when adding a new persisted profile field, you must wire it in THREE
places or it will misbehave: the DB/shared schema, the page's `defaultValues`
mapping, AND the form's `useForm` defaults (`defaultValues?.x || ""`). Missing the
page mapping means the field saves server-side but always shows blank after reload
(symptom looked like "save didn't persist"). Missing the form default means the
field is uncontrolled.

**Why:** the form reads `defaultValues?.imAtYourGate`, but the page wasn't passing
`imAtYourGate` (or the shipping fields) — so the value round-tripped to the DB but
never came back into the input on reload.

## Silent validation failure
The form uses `form.handleSubmit(onValid)` with `termsAccepted` required
(`.refine(v => v === true)`) and defaulted to `false`. Without an onInvalid handler,
clicking Save with terms unchecked failed validation silently — no toast, no
network call — so a brand-new user's profile was never created and the UI looked
like it "saved". Fix: pass a second `onInvalid` arg to `handleSubmit` that fires a
destructive toast.

**How to apply:** any `form.handleSubmit` on a multi-field form with required
fields the user might not see (checkboxes, collapsed accordions) should pass an
onInvalid callback so validation failures are never silent.

## Known open friction (product decision, not yet changed)
- `termsAccepted` resets to `false` on every mount, so returning users must
  re-accept terms on every profile edit. Possibly intentional (legal re-consent).
- `hasUnsavedChanges` (based on `form.formState.isDirty` + initial media refs) is
  never reset after a successful save, so a stale "unsaved changes" banner can
  linger until reload.
