---
name: Browser auth QA fixture durability
description: Keep synthetic test credentials available across browser-worker resets without persisting real secrets.
---

Keep generated, test-only credentials outside the browser worker's transient variables until verification ends; delete the temporary fixture afterward. Never put them in Git, project memory, or reports.

**Why:** A worker timeout after a successful password write erased the generated QA password, preventing the final correct-password login assertion until a narrow QA-only credential recovery.

**How to apply:** Use private temporary storage for synthetic QA data only. Any recovery must be restricted to the exact test-owned identity; never modify a real member or substitute a fake authenticated session for ownership proof.
