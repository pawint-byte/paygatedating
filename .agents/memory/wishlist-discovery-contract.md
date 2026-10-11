---
name: Wishlist discovery contract
description: Approved wishlist search and paste-save scope, retailer eligibility boundaries, and development-only delivery.
---

The full approved wishlist search/paste-save spec is in `docs/wishlist-scrape-save-spec.md`. This work is development-only; production requires the owner's explicit approval.

**Why:** The user approved the entire downloaded spec and explicitly prohibited production publishing without approval.

**How to apply:** Check the original acceptance criteria rather than treating a disconnected search UI or mocked browser results as completed live integration. Search and real Amazon/Viator previews need authorized provider access; never substitute fabricated products or bypass retailer crawler restrictions.

Wishlist saving and retailer gifting eligibility are separate: the spec permits public HTTPS product links, including manual entry when preview fails. Existing retailer/payment/shipping restrictions must still apply when someone attempts to gift that item.

**Why:** Keeping partner-only validation on wishlist saving creates a dead end for the spec's arbitrary-URL/manual-save path. Removing gifting safeguards would violate the existing privacy and paid-gifting constraints.

**How to apply:** Do not reintroduce the partner-only wishlist-save restriction. Explain unsupported gifting availability without blocking wishlist creation. Preserve the member's edits and visibility choice before saving, and never silently treat unknown/foreign prices as USD.
