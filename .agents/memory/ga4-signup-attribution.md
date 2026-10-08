---
name: GA4 signup attribution
description: Truthful signup conversion instrumentation and verification boundaries for the dating site.
---

Count a GA4 signup only after a new account is durably created, not on form start, a returning login, or profile acceptance. Use the actual sign-in method and never send member identity or free-form content as event parameters. Keep this instrumentation additive; it must not alter authentication behavior, database schema, or UI.

**Why:** The owner uses signup completion for paid-ad decisions and explicitly requires one conversion per new account, with no PII, while preserving the site's existing signup flow.

**How to apply:** Observe the persisted creation result atomically to avoid a pre-insert race. Test in preview before publishing. A successful GA4 collection request is transport evidence, not confirmation that the event appears in GA4 DebugView; report those separately.
