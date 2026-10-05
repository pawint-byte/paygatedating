# PayGate member-owned AI pilot: owner testing

This version is for development testing. It is not published or approved for release.

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
