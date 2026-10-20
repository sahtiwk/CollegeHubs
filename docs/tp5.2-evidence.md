# TP5.2 reward contracts and recovery

Implemented and locally verified on 2026-10-19. Daily/path facts have strict
consumer contracts, global semantic identities and inactive versioned rules.
Existing keys, weights and receipts are retained. All scoring and streak paths
share India timezone policy 1. Core coordinates bounded, leased module recovery;
expired or rejected delivery is retained for operator review.

## Verification

- Existing full regression suite: **129 passed, zero failed/skipped**. Includes
  receipt loss, concurrent caps, retained grants, membership isolation, Study,
  identity and schedules. Local report: `.local/p32-guards.tap`.
- `tests/guards/reward-recovery.test.js`: **10 passed, zero failed/skipped** on
  a disposable Mongo replica set. Covers inactive production rules and scopes,
  invalid day policy, delayed original-day scoring, exact/semantic duplicate
  receipts, changed-payload conflicts, concurrent old/new source caps, cross-Hub
  path alias replay, persisted Arcade/Interview expired attention and no retries,
  multi-coordinator lease contention, six-second all-module failure, responsive
  Core health during the failure, persistent backoff and successful recovery.
- `tests/migrations/transition.test.js`: **10 passed, zero failed/skipped**.
  Includes concurrent/repeated migration, rollback/resume, SQL dump/restore and
  Mongo BSON restore. New Learn attention handling persists unchanged expired
  payloads, permits one delivery attempt under contention, prevents further
  retries and retains the immutable-payload trigger.
- `tests/frontend/reward-recovery-browser.cjs`: passed in headless Chrome with
  real disposable login and module handoffs. Explicit UI-only result fixtures
  verify pending → settled in Arcade, operator-review in all three modules,
  Learn hiding the pending refresh action and no mobile horizontal overflow.
  Screenshots: [Arcade](screenshots/tp5.2-arcade-review-mobile.png),
  [Learn](screenshots/tp5.2-learn-review-mobile.png). Learn screenshot visually reviewed.
- Web production build and Learn TypeScript build pass. Existing optional
  shader chunk warning remains; TP5.2 adds no visual dependency. Diff whitespace
  check passes.

## Rollout boundaries

See the [reconciliation contract and checklist](../packages/contracts/reconciliation.md).
Learn's additive `0002_delivery_attention` migration must precede its new adapter
on retained stores. Production migration and deployment were not performed.
Core needs each enabled module's dedicated reconciliation key to schedule it;
missing configuration leaves that target disabled. The operator command honors
the same persisted leases/backoff.

Future daily/path rewards remain inactive. TP7 must seal exactly one ordinary
or daily fact per session; TP8 must prove path completion. Their producer phases
must extend receipt bounds/alias handling, pass acceptance and introduce released
prospective rule versions. No historical events are reweighted. Expired delivery
does not receive a replacement timestamp/JTI. Automatic recovery runs only while
hosts are awake and available; no sleeping-host delivery guarantee is claimed.
