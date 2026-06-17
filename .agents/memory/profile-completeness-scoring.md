---
name: Profile completeness scoring
description: Reward eligibility must match the UI's completeness score, which uses weighted criteria — not a naive field-count
---

# Profile completeness has ONE canonical definition

The user-facing completeness % comes from `GET /api/profile/completeness`: a **weighted** score (hasProfile 10, displayName 10, bio>20chars 15, photos>=1 20, interests>=3 15, location 10, age 5, lookingFor 10, wishlistItems>=1 5 = 100). The sidebar `profile-progress.tsx` renders tasks from these same flags.

**Why:** the "100% profile completion → Premium" reward originally used a *different* naive 6-field presence check, so users could claim it while the UI still showed <100% (e.g. 70%). Bug report June 2026.

**How to apply:** any feature that gates on "profile complete" must reuse the weighted scoring above (require 100), not invent its own field list. If you change the criteria, change it in `/api/profile/completeness`, the reward-claim route, and `profile-progress.tsx` together — they are duplicated and will drift. Consider extracting a shared helper if touching this again.

# Public profile route
Public profile detail page is `/p/:userId` (component PublicProfile), NOT `/profile/:id`. Link to `/p/${userId}` for viewing someone's profile/wishlist.
