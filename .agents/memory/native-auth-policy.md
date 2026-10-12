---
name: Native authentication product policy
description: Owner's native-first signup, verification boundaries, identity-preservation and launch approval requirements.
---

PayGate's primary signup/login is native email/password. Keep the Replit login button until the owner-first personal native-password/admin-login acceptance gate is met; retain underlying identity linking and the route afterward. Signup has two quick steps: email only first, persisted server-side as pending before any password exists, then password and existing adult/legal affirmations. Profile questions belong in the existing onboarding.

The email-first screen must plainly promise a continuation link. Incomplete signup records remain emailable with their timestamp, referral source and pending status; the resume route lands on password completion. No drip system is authorized in this pass.

Email verification happens in the background and must not block entry or profile setup. Only paid checkout/gifting is blocked until verified. Keep existing member/profile identities and never silently merge accounts to resolve email ambiguity.

**Why:** The owner requested removing developer-platform signup friction while preserving existing members and the existing private onboarding/value exchange.

**How to apply:** Do not collapse email capture back into a password form, replace the native front door with default Replit/Clerk signup, introduce extra signup questions, or expand verification gates without an explicit new requirement. Native-auth launch requires Scout preview verification and owner approval; development completion is not publishing consent.

Existing members originally joined through Replit and have no native password. Detect registration before password checking: passwordless members receive the registered-member message and a rate-limited sign-in link, not an incorrect-password error. Registered signup emails use the same flow; unknown auth emails get only a no-account message and signup route.

**Why:** The owner reproduced the incorrect-password experience for existing members and explicitly required the registered-first behavior.

**How to apply:** Email submission never grants access. An expiring, single-use link proves ownership before sign-in/password setup. Offer one persisted skip, then a gentle reminder until password creation; preserve member IDs, data, and Replit sign-in.

The owner requires proactive, admin-triggered one-time password-upgrade mail for existing email-bearing/passwordless members. Only credentials are missing; do not copy member/profile/history data. Respect saved email opt-outs and existing QA/test exclusions. Migration links must land on password setup even after an earlier skip.

**Why:** The owner directed “copy over existing to the new way and prevent this”: prevent existing members meeting the new login wall without advance notice.

**How to apply:** Owner migrates first. Sequence login detection → built/tested migration capability → personally verified owner native-password/admin login → hide the advertised Replit login button. The owner fires the campaign only after release and owner-first verification; development work must never trigger the send or publish. Preserve auditable one-time per-member claims; uncertain/interrupted outcomes must not silently resend.

The owner states “my admin accounts can't be a problem for me.” Personal owner email/password admin login must be verified in preview before step (c), and re-verified in production after approved publishing. If verification cannot be completed, step (c) does not ship.

**Why:** The owner explicitly added this acceptance gate to prevent loss of admin access.

**How to apply:** A synthetic fixture, existing session, email-link login, or password hash does not count as personal owner verification. Never handle or change the real owner's password. Keep the fallback advertised and stage release if production verification remains unestablished.
