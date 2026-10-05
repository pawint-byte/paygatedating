# PayGate member-owned AI pilot: owner testing

This version is for development testing. It is not published or approved for release.

## Scout polling queue: six acceptance checks

Use only owned QA fixtures; never paste keys into tasks, model chat, screenshots, notes, or logs. No task text is executed by PayGate.

1. Open `/assistant-guide`. Its full-documentation link/copy uses the actual site origin plus `/assistant-openapi.json`. Fetch that URL: it must return OpenAPI JSON documenting bearer auth, all five scopes, member-session submission, bearer queue reads/updates, and human draft review. `/api/agent/openapi.json` is the assistant-only import, excluding member-session submission/cookie auth so AI tools do not receive human approval or submission operations.
2. On PayGate, create a private connection with `read`, `tasks_read`, `tasks_write`, and `profile_drafts`. Existing keys are not upgraded. Submit `Add 'QA test' to the end of my bio` in Assistant access. Bearer `GET /api/assistant/tasks?status=pending` returns the request; the live bio must not change.
3. Bearer `PATCH /api/assistant/tasks/:id` with `{"status":"claimed"}`, then `{"status":"done","note":"AI reported completion; member approval is still required."}`. Refresh the member queue after each state. A second connection must not finish the first connection's claim. Done is not evidence of an accepted or applied draft.
4. A second fixture member's key returns none of the first member's tasks. Knowing another member's task ID must not allow claiming or completion.
5. Read the current bio, save a private bio proposal using `/api/agent/profile-drafts` with a new JSON `requestId`, verify it in the member's draft-review UI, and explicitly Accept as the member. The live bio changes only then. Reject before acceptance leaves live data unchanged; accepted changes have no automatic revert endpoint and require an ordinary manual profile/wishlist edit to correct.
6. Backdate only owned QA pending/claimed tasks beyond their 24-hour expiry. Poll pending: those requests disappear, show Expired in member history, and cannot be claimed or completed. Terminal done/failed records remain history. Expiry is applied on queue read/update, not by a background prompt runner.

Poll every 2–5 minutes. GET accepts `status`, `offset`, and `limit` (1–10, default 10), returns `{tasks,hasMore,nextOffset}`, and sorts bearer results oldest first. Member-session results default to all statuses, newest first. Poll pending from offset 0 again after claims, since queue positions change. The per-key limit is 60 requests/minute across all agent and queue routes; 429 includes `Retry-After: 60`. Invalid/revoked keys return 401, missing scopes or paused writes 403, conflicting/expired work 409, and unavailable service 503. Do not retry by claiming success.

Read access covers own credits without spending/creating a wallet, own profile/wishlist, and permitted match/knock summaries. Notification reads expose only current incoming knock/payment-request metadata—not a general inbox, message text, or protected partner details. Initial five-field setup and member-controlled draft acceptance remain unchanged.

The API fixture tests simulate a polling client. They do not prove the owner's Scout app has connected successfully. An actual owner-client test, joint verification, and explicit acceptance are still required before publishing. Development schema changes do not update the live site until that approved release.

## What is included

- A private, member-authorized connection to an existing AI client that supports bearer-authenticated HTTP tools.
- Read-only profile preferences, incoming match requests, gate stages, pause status, and incoming requests to pay a gate.
- Private profile-management and wishlist drafts.
- Member-only Edit, Accept, and Reject controls.
- Explicit draft permissions, one-time key display, renewal/rotation, extension, revocation, and activity history.
- Thirty days before access review is due; after seven more days without review, new assistant drafts pause. Reads remain permitted until revocation.

The original five-field setup remains human-first. Profile management starts after that initial profile is accepted. The assistant cannot publish a draft, message anyone, invite someone, progress a gate, buy a gift, spend credits, or book a date.

## Connect the AI you actually use

1. Sign in to the development preview. If this is a new account, complete and accept the existing private first-time setup.
2. Open **Settings → Assistant access**, or the **Assistant access** sidebar item.
3. Create a connection with a recognizable name. Read access is included; explicitly enable profile and wishlist drafts for this test.
4. Copy the one-time key into your AI client's **private connector authentication settings**, never into chat, a public/shared assistant, notes, screenshots, or source code.
5. Open **API specification** on the page. A compatible client can import this OpenAPI specification and use the member key as HTTP bearer authentication.
6. The client must be able to reach the development URL. An OpenAPI interface is not automatically a native connector for every AI product. If your client requires MCP or OAuth instead, stop and identify that requirement rather than sharing the key elsewhere.

No AI provider API key or hosted model is required by PayGate. Connecting this interface does not import your existing conversations. Summaries appear when your AI requests the data; this pilot does not send background emails or push messages.

## Test one complete cycle

1. Ask your connected AI: “Read my PayGate context and summarize incoming gate requests. Do not send, pay, accept, or decline anything.”
2. Confirm the summary agrees with what you see on PayGate. It must not claim there are requests when the returned list is empty, invent deadlines, reveal protected partner details, or claim to have performed an action.
3. Ask it to prepare a **private** profile bio draft using only words you supply. Confirm your existing public profile has not changed.
4. On PayGate, inspect Before/After, edit the draft, and save. Accept only wording you actually want. Verify the profile now contains the accepted wording.
5. Ask it to prepare a wishlist draft using one real supported-retailer product link and the actual title and price. No purchase is authorized, and a product link does not prove private shipping.
6. Review or edit the pending item. Reject one draft and confirm no live item appears. Accept one desired draft and confirm exactly one item appears in your wishlist.
7. Extend the connection and confirm its existing key still works.
8. Renew the connection. Configure the new one-time key privately; the old one must fail.
9. Revoke the connection. Subsequent requests with its key must fail.
10. Inspect the activity history and repeat the member controls on a phone-sized screen.

An assistant retry must reuse its JSON `requestId` for the same draft. HTTP clients may alternatively use the `Idempotency-Key` header; GPT Actions do not support custom headers, so their schema uses the JSON field. Repeating a member Accept must not create another wishlist item. If an underlying profile or item changed since the proposal, expect a conflict and review again—not an overwrite.

## Acceptance and release

Record the AI client used, what worked, any error text without credentials, and any surprising behavior. Agent API/browser checks are not proof that your particular AI client is connected correctly.

Release requires Agent testing, owner testing with the actual AI, joint verification, and explicit owner acceptance. Do not publish, change production configuration, or apply production schema changes before that approval. Adult-eligibility safeguards remain a separate unresolved product/legal issue; this pilot does not verify age or establish legal compliance.
