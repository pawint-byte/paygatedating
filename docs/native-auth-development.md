# Native PayGate authentication — development handoff

Status: implemented in development. **Not published.** Scout preview verification and owner approval are required before publishing.

## Delivered behavior

- `/signup` step 1: **email only**, with plain copy promising an emailed link to continue. Submitting saves a server-side pending record with normalized email, timestamp, referral source and `status=pending` **before any account or password exists**.
- `/signup/complete` step 2: password only, visible requirements/show-hide toggle, and the existing 18+/Terms-and-Privacy affirmations. The saved email is shown as text. No Replit signup option.
- The same browser can continue immediately using its secure anonymous session. The emailed continuation restores step 2 on another browser/device, including the captured referral code for the unchanged onboarding.
- Step 2 atomically creates the account and changes the pending status to `completed`, invalidating all its continuation tokens. It then saves the signed-in session before background verification delivery and routes to the existing `/setup` first-name onboarding, without changing its five inputs, private draft, or explicit acceptance.
- Abandoned email captures remain pending and emailable even after a continuation link expires. A future explicitly requested finish-signup message can issue a fresh resume link. **No drip, scheduler, marketing subscription, or admin campaign interface was added.**
- `/login`: registration-first native login, email sign-in link, password recovery, and secondary “Continue with Replit.” Existing passwordless members get the registered-member message and sign-in link rather than an incorrect-password error.
- Verification banner persists while unverified. Only wallet deposit, subscription checkout, and gift checkout initiation require verification; existing chapter spending and other member functions are unchanged.
- Email verification clicks also sign in. Verification links expire after 24 hours; sign-in and reset links after 30 minutes. All are single-use, purpose-bound, stored only as SHA-256 hashes, and checked atomically.
- `/reset-password` works even when already signed in. Reset and confirmation pages scrub tokens from the address bar and exclude third-party analytics/affiliate scripts.
- `/account` is available before profile acceptance; existing Settings contains the same account security panel.
- Get Cozy and signup CTAs lead to `/signup`; login/re-auth links lead to `/login`. The legacy `/api/login` remains solely a Replit fallback.

## Identity linking and recovery rules

1. Existing Replit subject IDs keep their original account and profile IDs. A changed provider email does not overwrite the canonical PayGate email.
2. A new Replit subject can link to a unique, normalized existing email only when the provider explicitly supplies `email_verified: true`.
3. Signup never creates a second identity for an existing normalized email. Existing members can use email sign-in/recovery or add a password to their original account.
4. Known Replit identities with ambiguous duplicate emails retain access to their original profiles, but native email selection/linking fails closed. No accounts are merged. Development had no normalized-email duplicates before migration.
5. Adding the first password requires verified email and a sign-in proof less than 15 minutes old. Changing an existing password requires the current password.
6. Password reset/change advances the native-session version. Old native sessions and earlier-version email tokens cannot authenticate. Replit provider sessions remain independent; this change does not add an all-provider/device sign-out control.

## Storage and security

Six additive development tables: `native_auth_accounts`, `native_auth_tokens`, `replit_auth_identities`, `native_auth_rate_limits`, `pending_signups`, and `pending_signup_tokens`. Existing tables were not rewritten or converted. Credential hashes are separate from public User DTOs; pending signup records contain no password.

The registered-member correction adds only `password_prompt_skipped_at` to development auth credentials. It does not alter profiles, member IDs, purchases, or Replit identities. Production schema/publication is outside this correction's scope.

Continuation tokens are hashed, expire after 24 hours and are invalidated together on completion. Pending records do not expire with their tokens. Initial capture returns no bearer token: same-device continuation uses the server-side session. Email-link pages scrub tokens and exclude tracking; completion from a token-only page loads a clean document so the true persisted-account signup receipt can still be recorded.

Passwords use bcrypt cost 12: at least 12 characters, uppercase, lowercase, number, and at most 72 UTF-8 bytes. Sessions reuse the existing seven-day PostgreSQL/Passport store with secure, HttpOnly, SameSite=Lax cookies and session rotation on sign-in.

Persisted limits apply by IP, normalized email, and authenticated account as appropriate. Authentication POSTs require same-origin JSON and an approved request host. Passwords, tokens, and native-auth response bodies are excluded from API/error logging. Email links use the validated site origin, not a client-supplied return URL.

## Change inventory

- New backend: `server/native-auth/{repository,service,routes,origin}.ts`.
- New shared definitions: `shared/native-auth.ts`, `shared/password-policy.ts`; additive schema export.
- Backend wiring: existing auth session integration, route registration, Resend auth email sender, signup receipt method, sensitive logging and token-page response headers.
- New frontend: `client/src/pages/auth.tsx`, `client/src/components/auth/{account-security,verification-banner}.tsx`.
- Frontend wiring: App routes, Settings security card, existing login/re-auth destinations, landing signup/Get Cozy destinations, invite destination only, and signup analytics method.
- SPA path allowlist includes the eight new browser routes, including protected `/set-password`. Token-page third-party tracking is suppressed in `client/index.html`; ordinary signup retains GA4 tracking.
- Tests: native-auth regression suite, native SPA path assertions, and the old referral regression assertion updated to inspect the existing `/api/setup/accept` handler where referral handling already lives.

**Preserved:** Wishlist discovery implementation; profile/onboarding/chapter/referral runtime handlers; payment business handlers; existing member IDs and profile data; `.replit`, workflow command/ports, deployment settings, and secrets. Payment handlers receive only the new verification middleware.

## Verification

- `npm run check`: passed.
- `npx tsx --test --test-concurrency=1 tests/*.test.ts`: **192 passed, zero failed/skipped** with the registered-member correction and migration addendum.
- Additional real-database regressions prove capture without any user/password, retained abandoned records after token expiry, fresh later-resume issuance, concurrent completion/replay protection, preserved referral source, and no overwrite if Replit creates the same email's identity before step 2.
- Real development-database tests cover identity collisions/linking, concurrent single-use consume, expiry/replay/purpose, password changes/reset, session rotation and revocation, persisted rate limits, immediate session creation before mail delivery, and all three checkout verification gates.
- Original native-auth browser walkthrough: **passed** on the public HTTPS preview, at desktop and 402px mobile widths. Evidence screenshots are attached to the browser report in the conversation.
- A fresh synthetic signup stayed on PayGate, entered the original private first-name onboarding, retained its session and verification banner on reload, and was blocked from deposit before any Stripe interaction.
- Resend returned a provider-acceptance acknowledgment. Own-account verification/sign-in/reset fixtures then exercised the actual browser pages, removed tokens from the address bar, retained the same account ID, removed the verification banner, and rejected reset-link replay.
- Password change preserved the active session; native logout/login worked with the changed and reset passwords. Replit appeared only as a secondary login.
- Profile setup was not accepted and no real payment was submitted. Only the newly-created QA account and its auth tokens were removed afterward; existing member records were not changed.

### Email-first amendment browser evidence

Passed on the public HTTPS preview, with desktop and 402px mobile evidence:

- The initial form displayed exactly the promised email-link copy and one email field, with no password, affirmations, or Replit signup option.
- Before any password entry, database reads confirmed the pending timestamp, referral source/code and pending status, with zero matching users/credentials and unauthenticated API responses.
- Clearing cookies/storage abandoned the flow without losing the pending record or creating an account.
- A fresh-browser continuation fixture reopened password completion, scrubbed its token, restored the original referral code, and displayed only password plus the existing affirmations.
- Completing once marked the same pending record completed and created exactly one account, immediately signed in to the original untouched private onboarding. Reload preserved the session and verification banner; wallet deposit remained verification-blocked without contacting Stripe.
- Replaying the completed continuation showed a clear recovery screen and created no additional account.
- Only the synthetic browser lead/account and their tokens were removed after evidence capture. No existing member records were changed.

The emailed-resume document deliberately excludes tracking while holding a token. After creation, a clean document restores normal signup-receipt handling. This does not claim receipt in GA4 DebugView.

## Registered-member correction — preview only

- Login checks registration before password validation. A member without a native password is sent a sign-in link and sees exactly: “You're already registered with this email — we've sent you a sign-in link. Tap it to get in.” Resend is available.
- Existing signup emails enter the same waiting flow, including password-bearing members, without creating a conflicting pending signup. Passwordless forgot-password requests also send sign-in links; password-bearing accounts retain normal reset/password-login behavior.
- Unknown login/link/reset emails receive only a clear no-account message and signup route. Incorrect passwords for password-bearing accounts remain an error with the email-link option.
- Email submission alone never signs in. Sign-in-link sends share the unchanged three-per-email/nine-per-IP budget across entry points; failed delivery returns an error, never a false “sent” claim.
- Ownership-proved passwordless sign-ins open protected `/set-password`. One skip is saved account-wide; afterward, the account stays usable with a gentle reminder until password creation. Password changes reuse the existing verified/recent-proof checks.
- Real-database HTTP regressions verify original user-row equality and Replit identity mapping, anonymous status before proof, known/unknown classification, send-budget enforcement, proof/skip/password/replay states, and failed delivery.
- HTTP QA budgets are isolated from preview traffic. The initial browser resend encountered a test-contaminated shared loopback budget; production security limits were not changed to resolve it.
- Focused preview browser verification covered registered login/resend, registered signup with no pending record, ownership-link sign-in, password prompt, persisted skip/reminder, password-created state, wrong/correct password login, unknown-email signup CTA, and consumed-link rejection. The original QA identity and private onboarding stayed unchanged.
- A browser-worker timeout lost the generated QA password after the UI save succeeded in the database. A credential-only update of that same synthetic fixture allowed the final normal-login assertion; it was not a second UI password-save claim. All QA identity/token records were removed afterward.

## Limits of the evidence

Test emails use reserved synthetic addresses; fixture links exercise the same stored-token consumption and browser flow but do not establish receipt in a real inbox. Real Resend inbox delivery and an actual existing member's Replit provider callback remain human/Scout acceptance checks. No real payments are made by these tests.

The native fallback removes the need to use Replit for signup. It does not claim to remove or explain provider-owned phone/security challenges on the retained, unadvertised Replit login route.

## Owner migration addendum — no production publish or campaign dispatch

Development audit: **59** accounts with an email and no native password, **51** excluded QA/test/demo accounts, **8** eligible recipients. These are preview-data counts, not a production inventory. The Admin report recalculates from its environment when opened.

Only credentials are missing: no member, profile, history, chapter, or payment data is copied. `/admin/users` now includes migration count/exclusion reporting, subject/body preview and a typed `SEND PASSWORD UPGRADE` confirmation. Admin access to this route does not require accepting/publishing a personal profile.

- Production-only, authenticated/admin/same-origin dispatch; preview dispatch is server-blocked, not merely button-disabled. No startup/timer/send script calls it.
- Existing Resend provider and hashed 30-minute, single-use sign-in tokens. A token-owned password-setup flag routes migration clicks to `/set-password` even after a previous skip; clients cannot supply that flag.
- Eligibility excludes passwords, no/invalid/ambiguous emails, known fixed QA identities, test/demo IDs and reserved/demo email patterns, saved email opt-outs, and previously claimed recipients.
- The previous Settings switches were not persisted. Email Notifications and Marketing Emails now save separately in `member_email_preferences`, accessible from Settings and the pre-profile Account page. This account-service migration respects Email Notifications off; marketing permission is separate, not required for account-service mail.
- A durable per-member claim plus a cross-process advisory lock prevents repeated/concurrent dispatch. The audit records initiator, attempted/finished timestamps, status and provider message ID, never link tokens. Failed, uncertain, or interrupted attempts are never automatically resent; review the audit rather than blindly retrying.
- New development-only schema: `member_email_preferences`, `password_migration_deliveries`, and `native_auth_tokens.password_setup`, mirrored in the Drizzle schema. No production schema commands ran.
- Six added regressions cover exclusions/consent, template escaping/copy, identity preservation and force-password proof, replay, one-time failed/uncertain outcomes, admin/origin/preview protections, typed confirmation and concurrent dispatch. All mail dispatch in tests is injected fake mail; no real migration messages are sent.
- Preview browser verified the admin report, server-side 403 send block with an empty ledger, persisted/restored QA-only email preferences, forced migration-purpose password setup after an earlier skip, and replay rejection. The subsequent owner-first addendum restores “Continue with Replit” pending personal owner verification. The underlying route/linking remains unchanged.

## Owner-first acceptance gate — required before step (c)

Owner direction (2026-10-12): “my admin accounts can't be a problem for me.”

**Owner account:** `pawint@me.com`, the existing Replit-linked admin/member identity. It migrates **first**, before the general legacy-member campaign. Preserve its original ID, admin permissions, member profile and history; do not create, copy, merge, or replace its account.

Acceptance criteria:

1. The owner personally sets a native password through the existing ownership-proof/password-setup flow in preview. The Agent must not set, request, read, store or handle the owner's password.
2. The owner signs out, then personally signs in from a fresh preview session using **email + password**. Confirm the same original account ID and working admin access, including `/admin/users`, with member data/history unchanged. A QA fixture, existing session, Replit callback, email-link login, or password-hash presence is **not** this acceptance check.
3. Record the owner's explicit confirmation of this successful preview password/admin login before approving removal of “Continue with Replit.” **If owner verification is incomplete or fails, step (c) does not ship.**
4. After an independently owner-approved publish, the owner personally re-verifies native email/password login and admin access on production. Do not assume preview success or credentials establish production readiness; complete production password setup through ownership proof if needed.
5. Keep the Replit fallback advertised through any release where the production owner-first check cannot yet be established. If that requires staging, release the login fix/migration capability with the fallback retained, verify the owner in production, then separately approve step (c). The general migration email remains an owner-triggered action only after release and owner-first verification; never send it automatically.

**Current gate state: pending personal owner verification.** The Replit button is retained. No owner credentials were changed or verification claimed. This addendum does not authorize publishing or sending migration emails.

No production migration, publish action, or GitHub backup of a newly published release was performed.
