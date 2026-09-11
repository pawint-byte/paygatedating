# Track A QA

## Scope and setup

Only the authenticated Replit Admin can use **Admin → Members → Track A QA
members**. The panel runs fixture requests under that Admin session; it does
not log in as a fixture or change the Admin session. There is no shared
password, secret, or arbitrary-member selector.

`POST /api/admin/qa-members/setup` accepts `{}` only. The IDs, names, and
initial credit are fixed:

| Member | ID | Initial wallet credit |
| --- | --- | --- |
| QA Alice | `qa_track_a_alice` | $20.00 once |
| QA Bob | `qa_track_a_bob` | $20.00 once |

The fixtures have no login identity or email address. Setup is repeatable and
does not top up an existing fixture or create duplicate matches. It is also
available only in the Replit development workspace:

```sh
NODE_ENV=development npx tsx script/seed-track-a-qa.ts --confirm-track-a-qa
```

This script is not part of startup, build, or publishing. For a live check,
run setup from the authenticated Admin panel after publishing; development
data is not evidence of live data.

## Wallet and chapter flow

The existing panel scopes these fixture-only requests with
`X-Paygate-QA-Member` and still requires the real Admin:

- `GET /api/wallet`
- `GET /api/wallet/transactions`
- `GET /api/matches`
- `POST /api/matches` between QA Alice and QA Bob
- `POST /api/matches/:id/advance` for the Gate 1 recipient

Choose an initiator, send Interest, and verify the sender's $5 wallet debit.
The recipient can then accept Chapter 1 and should also be debited $5. Refresh
both independently fetched perspectives and their ledgers; the pair should
agree on the same match and gate. Setup marks `first_match_free_used` so this
flow tests wallet credits rather than a free-match or Premium path. No Stripe
payment or checkout is involved.

This paid Interest path remains available for the wallet-charge diagnostic. It
is separate from the no-charge match setup used by the gate and Messages API
checks below.

## Direct gate override (QA/testing only)

The **Direct QA gate override** control is an Admin-only testing control, not a
normal member action. It reads only valid, distinct QA Alice/QA Bob pairs from:

```text
GET /api/admin/qa-members/matches
```

If the list is empty, use **Create QA Alice ↔ QA Bob match** in the empty
state. The action accepts no member input and calls:

```text
POST /api/admin/qa-members/matches
{}
```

The response is `{ "match": Match, "created": boolean }`. It is
fixture-only and idempotent: `created: true` means the pair was created and
`created: false` means the existing pair was reused. Either result is a
testing-state operation with no wallet charge and no Stripe activity.

For the no-charge Messages check, follow these steps:

1. Create or reuse the fixed QA Alice / QA Bob pair.
2. Select the returned pair, choose `gate3`, and click **Set gate**.
3. In **Messages API QA test**, select acting **QA Alice**, send a message,
   then switch to **QA Bob** and click **Mark read** (or use **Refresh
   thread**) to verify the other perspective.

Select a returned pair, choose `gate1`, `gate2`, `gate3`, `gate4`, `gate5`, or
`completed` (shown as Connected), then use **Set gate**:

```text
POST /api/admin/qa-members/matches/:id/gate
{ "gate": "gate1|gate2|gate3|gate4|gate5|completed" }
```

The control reports pending, error, success, and refresh states. This direct
override intentionally never charges a wallet and never calls Stripe. It does
not replace or change the ordinary paid gate flow; it exists to put a returned
fixture pair at a chapter for QA.

## Messages API QA test

The compact **Messages API QA test** in the same panel is an API-level check,
not a fixture login and not a normal `/messages` full-UI E2E test. It uses the
exact shared `QA_MEMBERS` constants and sends the existing
`X-Paygate-QA-Member` header while keeping the Admin session intact.

1. Create or reuse the fixed pair when the match list is empty, then select it
   and choose acting **QA Alice** or **QA Bob**.
2. Set the pair to Gate 3 (or later). The panel reads
   `GET /api/matches/:id/messages`, sends `{ "content": "..." }` to
   `POST /api/matches/:id/messages`, and displays each sender, content, and
   time in the thread readback.
3. Send as **QA Alice**, switch the acting member to **QA Bob**, and verify the
   message with **Refresh thread** or **Mark read**. **Refresh thread** performs
   a fresh read, and **Mark read** calls
   `POST /api/matches/:id/messages/read` and refreshes the thread.

Sending and read actions are disabled below Gate 3 and for declined matches.
Loading, empty, and API errors are shown in the panel. No real-user match ID or
member ID can be entered.

## Evidence

The Admin remains the signed-in user throughout; these are Admin-supervised
fixture perspectives, not proof that separate Replit QA accounts can log in.
The route-contract tests use isolated storage and do not connect to a real
database, Stripe, or production account:

```sh
node --import tsx --test \
  tests/qa-access.test.ts tests/qa-wallet-flow.test.ts \
  tests/qa-controls.test.ts tests/qa-messaging.test.ts tests/qa-controls-ui.test.ts
```