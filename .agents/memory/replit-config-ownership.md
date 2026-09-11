---
name: Replit configuration ownership
description: Ownership boundaries for runtime, deployment, and secret configuration during application work.
---

Treat the existing Replit runtime, workflow, and deployment configuration as project-owner/platform-owned settings, not incidental application implementation details. Routine feature, test, or documentation work does not authorize changing `.replit`, publishing settings, build/run commands, port mappings, or environment/secret configuration.

**Why:** Application changes must not silently alter how development or production runs, publishes, or obtains credentials. The project owner requires this ownership boundary to be documented without changing deployment or secrets behavior.

**How to apply:** Preserve those settings unless the user explicitly authorizes a relevant configuration change. For an authorized change, use the appropriate Replit configuration or secrets tooling and keep unrelated settings intact. Never copy secret values into code, logs, documentation, or memory. Creating or updating this ownership note alone must not trigger configuration changes, workflow restarts, or publishing.