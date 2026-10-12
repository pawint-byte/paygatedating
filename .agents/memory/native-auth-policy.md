---
name: Native authentication product policy
description: Owner's native-first signup, verification boundaries, identity-preservation and launch approval requirements.
---

PayGate's primary signup/login is native email/password. Replit remains a secondary LOGIN option, not the signup front door. Signup has two quick steps: email only first, persisted server-side as pending before any password exists, then password and existing adult/legal affirmations. Profile questions belong in the existing onboarding.

The email-first screen must plainly promise a continuation link. Incomplete signup records remain emailable with their timestamp, referral source and pending status; the resume route lands on password completion. No drip system is authorized in this pass.

Email verification happens in the background and must not block entry or profile setup. Only paid checkout/gifting is blocked until verified. Keep existing member/profile identities and never silently merge accounts to resolve email ambiguity.

**Why:** The owner requested removing developer-platform signup friction while preserving existing members and the existing private onboarding/value exchange.

**How to apply:** Do not collapse email capture back into a password form, replace the native front door with default Replit/Clerk signup, introduce extra signup questions, or expand verification gates without an explicit new requirement. Native-auth launch requires Scout preview verification and owner approval; development completion is not publishing consent.
