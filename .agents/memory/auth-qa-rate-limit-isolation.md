---
name: Auth QA rate-limit isolation
description: HTTP regression traffic and the preview proxy can share the same loopback send budget.
---

Isolate HTTP auth-test IP budgets from the preview, and clean up only test-owned buckets. Never loosen production rate limits to make a browser test pass.

**Why:** The HTTP suite and preview proxy shared a loopback IP; suite traffic exhausted its email-send budget, causing the first browser resend to return 429 despite only one send for that QA email.

**How to apply:** Test-only servers can trust a distinct synthetic forwarded IP per fixture. Preserve the real application's proxy/security settings, recipient limits, and shared send limits across endpoints.
