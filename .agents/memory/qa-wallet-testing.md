---
name: Admin-supervised wallet QA
description: Scope and rationale for non-demo QA identities and payment-free QA credits.
---

Keep payment-free wallet QA restricted to clearly labeled fixtures operated by an
authenticated Admin. Never turn fixture identities into a shared-password login or
general impersonation capability; do not fund or alter real members for test setup.

**Why:** The app uses Replit OIDC, so locally seeded user rows do not create sign-in
identities. Admin-supervised fixture perspectives allow counterpart checks without
fabricated credentials, Stripe payments, or changes to ordinary promotional rewards.

**How to apply:** Keep QA credits explicitly labeled and one-time, reuse the normal
Interest/chapter handlers, and distinguish development results from verified live
results. Discover visibility for both fixtures must not require changing the Admin's
personal dating filters. Fixtures should not solicit paid interest from normal users.

Keep mutation locks around the awaited business operation, not response lifecycle events.

**Why:** A browser disconnect fires response close without cancelling database work.
Releasing a lock then lets retries overlap a still-running wallet debit.

**How to apply:** Release in the asynchronous operation's `finally`, and skip a new
operation if the request was already aborted before dispatch.