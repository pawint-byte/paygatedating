---
name: Amazon list response caveat
description: Live Amazon responses can look successful even when the requested wishlist does not exist.
---

Do not treat HTTP 200 or the presence of Amazon product links as proof that a public wishlist was found.

**Why:** A read-only request to an intentionally synthetic list identifier returned an HTML page containing a footer product promotion. A generic product-link fallback misclassified that promotion as a wishlist item.

**How to apply:** When Amazon changes markup, validate actual wishlist item context and fail clearly on unrecognized pages rather than broadening extraction to all product links. Keep missing-list and unrelated-promotion fixtures in regression coverage.