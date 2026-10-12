# Native PayGate authentication — development handoff

Status: implemented in development. **Not published.** Scout preview verification and owner approval are required before publishing.

## Delivered behavior

- `/signup` step 1: **email only**, with plain copy promising an emailed link to continue. Submitting saves a server-side pending record with normalized email, timestamp, referral source and `status=pending` **before any account or password exists**.
- `/signup/complete` step 2: password only, visible requirements/show-hide toggle, and the existing 18+/Terms-and-Privacy affirmations. The saved email is shown as text. No Replit signup option.
- The same browser can continue immediately using its secure anonymous session. The emailed continuation restores step 2 on another browser/device, including the captured referral code for the unchanged onboarding.
- Step 2 atomically creates the account and changes the pending status to `completed`, invalidating all its continuation tokens. It then saves the signed-in session before background verification delivery and routes to the existing `/setup` first-name onboarding, without changing its five inputs, private draft, or explicit acceptance.
- Abandoned email captures remain pending and emailable even after a continuation link expires. A future explicitly requested finish-signup message can issue a fresh resume link. **No drip, scheduler, marketing subscription, or admin campaign interface was added.**
- `/login`: native password login, email sign-in link, password recovery, and secondary “Continue with Replit.”
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

Continuation tokens are hashed, expire after 24 hours and are invalidated together on completion. Pending records do not expire with their tokens. Initial capture returns no bearer token: same-device continuation uses the server-side session. Email-link pages scrub tokens and exclude tracking; completion from a token-only page loads a clean document so the true persisted-account signup receipt can still be recorded.

Passwords use bcrypt cost 12: at least 12 characters, uppercase, lowercase, number, and at most 72 UTF-8 bytes. Sessions reuse the existing seven-day PostgreSQL/Passport store with secure, HttpOnly, SameSite=Lax cookies and session rotation on sign-in.

Persisted limits apply by IP, normalized email, and authenticated account as appropriate. Authentication POSTs require same-origin JSON and an approved request host. Passwords, tokens, and native-auth response bodies are excluded from API/error logging. Email links use the validated site origin, not a client-supplied return URL.

## Change inventory

- New backend: `server/native-auth/{repository,service,routes,origin}.ts`.
- New shared definitions: `shared/native-auth.ts`, `shared/password-policy.ts`; additive schema export.
- Backend wiring: existing auth session integration, route registration, Resend auth email sender, signup receipt method, sensitive logging and token-page response headers.
- New frontend: `client/src/pages/auth.tsx`, `client/src/components/auth/{account-security,verification-banner}.tsx`.
- Frontend wiring: App routes, Settings security card, existing login/re-auth destinations, landing signup/Get Cozy destinations, invite destination only, and signup analytics method.
- SPA path allowlist includes the seven new browser routes. Token-page third-party tracking is suppressed in `client/index.html`; ordinary signup retains GA4 tracking.
- Tests: native-auth regression suite, native SPA path assertions, and the old referral regression assertion updated to inspect the existing `/api/setup/accept` handler where referral handling already lives.

**Preserved:** Wishlist discovery implementation; profile/onboarding/chapter/referral runtime handlers; payment business handlers; existing member IDs and profile data; `.replit`, workflow command/ports, deployment settings, and secrets. Payment handlers receive only the new verification middleware.

## Verification

- `npm run check`: passed.
- `npx tsx --test --test-concurrency=1 tests/*.test.ts`: **183 passed, zero failed/skipped** for the email-first amendment.
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

## Limits of the evidence

Test emails use reserved synthetic addresses; fixture links exercise the same stored-token consumption and browser flow but do not establish receipt in a real inbox. Real Resend inbox delivery and an actual existing member's Replit provider callback remain human/Scout acceptance checks. No real payments are made by these tests.

The native fallback removes the need to use Replit for signup. It does not claim to remove or explain provider-owned phone/security challenges on the optional Replit login.

No production migration, publish action, or GitHub backup of a newly published release was performed.
