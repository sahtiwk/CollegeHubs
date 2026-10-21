# TP6.2 external progress evidence

Implemented locally on 2026-10-20 within the provider-specific gates documented
in the [capability matrix](provider-capability-matrix.md).

## Delivered

- Additive ExternalAccount/ExternalSnapshot models with private owner/Hub scope,
  binding versions, unique verified provider handle, expiring proof challenges,
  operator review metadata, refresh leases and last-good timestamps.
- Codeforces user.info adapter with fixed URL, exact current-handle matching,
  bounded bytes/deadline, redirect rejection and no retained contact fields.
- Three-second persisted provider budget shared with contest requests when
  statistics are enabled; per-binding cooldowns and conditional stale-write rejection.
- Snapshot/bonus delta transactions, unlink/relink revocation, prospective
  cf-current-rating-v1 formula and no changes to engagement, historical receipts
  or streak activity. LeetCode difficulty-only arithmetic is tested but not wired
  to any enabled data source.
- Owned APIs, operator review CLI, `/progress` link/status/statistics UI, honest
  disabled-provider descriptions and current Aura wording.

## Validation

- Full regression run: **155 passed, zero failed/skipped**, including seven
  TP6.1 calendar checks and the initial nine external-progress checks.
  Report: `.local/p32-guards.tap`.
- Final focused `tests/guards/external-progress.test.js`: **11 passed, zero
  failed/skipped** after adding failed-transaction and handle-change/expired-proof
  cases. Tests cover no unverified bonus, exact ownership proof, duplicate verified
  handles, per-user visibility, forbidden score injection, refresh concurrency,
  last-good preservation, delta arithmetic, snapshot rollback, unlink and handle
  races, persistent provider budgets, disabled flags, 429, malformed response,
  redirect/byte/time bounds and LC aggregate All exclusion.
- `tests/frontend/external-progress-browser.cjs`: Chrome passed real disposable
  login, link, pending challenge, zero bonus and unlink. Explicit UI fixtures
  cover verified stale ratings and disabled-provider views. Mobile overflow check
  passes; [mobile](screenshots/tp6.2-external-mobile.png) visually reviewed.
  [Ownership desktop](screenshots/tp6.2-ownership-desktop.png) captures the disposable
  pending flow. No actual external profile was modified.
- Official Codeforces public user.info returned 200/OK; the implemented adapter
  independently accepted a read-only `tourist` profile probe with exact handle and
  integer rating. This demonstrates permitted public API compatibility, not
  ownership of that account or permission to award it to a student.
- Web production build and diff whitespace check pass. Existing optional shader
  chunk warning remains.

## Explicit limitations and rollout

LeetCode direct statistics/contests and Clist contests are not implemented/enabled
without the access evidence listed in the matrix. No scraping workaround or paid
fallback was introduced. Existing Codeforces schedules remain available; academic
ICS export is unchanged.

CODEFORCES_STATS_ENABLED and EXTERNAL_BONUS_ENABLED remain off by default and
were not changed in retained service environment files. Real consenting-owner
review, live earned-bonus acceptance, production backup/rollout and deployment
remain pending. Test-only statistics enablement used a disposable fixture process
with bonus disabled. See [operations](external-progress.md) for the exact review
command and separate activation criteria. Carry unavailable features into TP11's
exception register; this is not a claim of full multi-provider coverage.

## Hosted follow-up - 21 October 2026

This supersedes the earlier rollout limitations for Codeforces and Clist. Core revision `31c06b4` is live with Codeforces statistics and bonuses enabled. Real owner proof passed for sahtiwk; hosted rating is 1297. Guarded reconciliation awarded 2594 external Aura; a repeat applied zero, and the live UI confirms it. Engagement was unchanged.

Approved free Clist API access is configured privately. The bounded v4 adapter and independent leased cache fetched 14 contests on the hosted service at 10:24:47 UTC; the live source selector displays LeetCode, AtCoder and CodeChef schedules. Twenty targeted tests passed before adding the provider-isolation guard; the final schedule suite passed all eight tests, yielding 21 relevant passing cases across the three suites. Web and Core builds passed. Direct LeetCode statistics and bonus remain disabled pending supported access and ownership proof. See the release evidence and capability matrix for current scope.
