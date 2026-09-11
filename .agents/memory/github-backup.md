---
name: GitHub backup standing order
description: Back up completed, published, tested project state and report the verified outcome to CoS.
---

After every change is successfully published and tests are green for that final state, back up the final Replit project state to `https://github.com/pawint-byte/paygatedating`.

**Why:** The project owner requires a recoverable GitHub copy of completed releases and an explicit backup status for CoS.

**How to apply:** Confirm publication and passing tests cover the same final state before backing it up. Never back up secrets, credentials, private runtime data, or partial/unpublished work; review the backup contents before pushing. Use only Replit's existing GitHub link. Do not request a PAT, use alternative credentials, or initiate Cursor or GitHub reauthorization. Verify the remote contains the intended final commit before reporting success.

Report to CoS **backup succeeded** with the verified commit, or **AUTH BLOCK — backup not completed** and stop when Git authentication fails. Report other blockers accurately; do not label them authentication failures or claim success without verification.

This order does not authorize changes to application behavior, deployment configuration, or secrets. Recording this note alone does not publish or trigger a backup.