# Track A wallet QA

## Setup and scope

Only the authenticated Replit Admin can use **Admin → Members → Track A QA members**.
`POST /api/admin/qa-members/setup` accepts an empty JSON object. Member IDs and amounts
are fixed; arbitrary user IDs or amounts are rejected.

| Member | ID | Initial wallet credit |
| --- | --- | --- |
| QA Alice | `qa_track_a_alice` | $20.00 once |
| QA Bob | `qa_track_a_bob` | $20.00 once |

The same setup service is available **only in the Replit development workspace**:

```sh
NODE_ENV=development npx tsx script/seed-track-a-qa.ts --confirm-track-a-qa
```

This script is not part of startup, build, or publishing. Run live setup through the
authenticated Admin endpoint after publishing; development data is not evidence of
live data. There is no new password, shared secret, or bypass of Replit authentication.

The fixtures have no login identities or email addresses. The panel makes narrowly
scoped requests on their behalf under the real Admin's session. It never changes that
session. Normal members cannot use the QA mechanism or send paid interest to these
fixtures; Admin Discover includes both even when saved age/gender filters exclude one.
The fixtures remain visibly labeled as test members. Existing demos are untouched.

## Credit accounting

No schema migration or payment is needed:

- `wallets.user_id`, `wallets.balance`, `wallets.trial_credits_received`
- `transactions.wallet_id`, `amount`, `type`, `description`
- One `trial_bonus` ledger entry per fixture with description:
  `Track A QA: one-time $20 in-app test credit (not a payment)`
- `user_rewards.first_match_free_used = true` and free-tier profiles ensure the
  two checks charge actual wallet credit, not a free-match or Premium benefit.

Provisioning is transactional, with advisory and wallet-row locking. Re-running setup
does not reset balances, matches, or ledger entries and cannot repeat the grant.
An existing unrelated identity at a reserved ID/name makes setup fail without partial
changes. The welcome/referral marketing and ordinary rewards paths are unchanged.

## Check both perspectives

The panel scopes `X-Paygate-QA-Member` to its own requests. Every such request requires
the real authenticated Admin. Only these routes are allowed:

- `GET /api/wallet`
- `GET /api/wallet/transactions`
- `GET /api/matches`
- `POST /api/matches` between the two fixtures
- `POST /api/matches/:id/advance` for their pair at Gate 1 only

No Stripe, subscription, gift-payment, authentication, arbitrary-member, or other
Admin routes are available under the QA header. QA writes are serialized against
each other and setup. Both responses are read independently, not inferred from the
initiating response.

1. Set up members and refresh both perspectives.
2. **Send Interest** as Alice to Bob: confirm the $5 spend. Alice should go from
   $20 to $15; both should see the same pending pair at `gate1`.
3. **Unlock Chapter 1** as Bob: confirm the $5 spend. Bob should go from $20 to
   $15; both should see the same active match at `gate2`, with Bob as `gate1PaidBy`.
4. Repeated setup must not grant more credit. Repeated interest/Chapter 1 actions
   must not create duplicate matches or advance additional chapters.

The Admin remains the signed-in user throughout. These are Admin-supervised fixture
perspectives, not proof that separate real Replit QA accounts can log in.

DM's Coming Soon page and unimplemented Boost purchase/activation surfaces are product
gaps, not infrastructure failures. Verification has an existing `/verification` page
and API; navigation/exposure issues should be reported separately. No card entry,
Stripe payment, or checkout is necessary for this flow.