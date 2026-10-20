# External progress operations

The `/progress` page shows provider availability, the signed-in user's own
bindings and last-good statistics. No public profile lookup or caller-provided
user/Hub selector exists. Handle alone, uploaded scores and screenshots cannot
authorize an award. Provider calls occur only during explicit review or refresh,
never while reading the progress page.

## Configuration and acceptance

`CODEFORCES_STATS_ENABLED=false` and `EXTERNAL_BONUS_ENABLED=false` are the defaults.
Both accept only true/false or unset. Bonus requires the statistics flag. Keep
bonus false until an operator has validated a real consenting user's challenge,
refresh and unlink. Statistics may be enabled independently with zero bonus.
Clist/LeetCode have no activation switch: their access gates remain unresolved in
the [capability matrix](provider-capability-matrix.md). Do not put provider keys
in frontend configuration.

Core creates ExternalAccount, ExternalSnapshot and ProviderRequestLease plus
their additive indexes before listening. No historical receipts or engagement
records are reweighted, and no existing provider/profile fields are adopted as
ownership proof. Back up retained Core data before rollout. New collections
should be included in ordinary database backups. No production deployment has
been performed.

## Link and review

1. The user opens Your external progress and links their Codeforces handle.
   This creates a pending binding and a random 24-hour challenge; zero bonus.
   Same-handle retries preserve the challenge. Handle/challenge changes have a
   one-minute cooldown. Only one verified binding may own a normalized handle.
2. The user temporarily sets their Codeforces Organization field to the exact
   displayed code. They can restore their original organization after review.
   Never request their password, API secret or browser cookie.
3. An operator with Core server access uses the displayed account ID and binding
   version, a real reviewer identifier and the explicit database:

```powershell
node services/core/scripts/reviewExternalAccount.js --database=YOUR_CORE_DATABASE --account=ACCOUNT_ID --version=BINDING_VERSION --reviewer=OPERATOR_ID
```

The command checks the exact profile handle and organization through the fixed
official API endpoint. Arbitrary evidence strings do not bypass proof. The
transaction verifies challenge expiry, binding version, lease and current
membership again, then stores review time/reviewer and a proof hash. The raw
challenge is cleared. Failed reviews have a 15-minute cooldown. A duplicate
verified handle is rejected without exposing another user's identity.

4. The user selects Update Codeforces statistics. The verified current binding
   receives a snapshot and, only if enabled, the prospective CF formula. No
   points are awarded merely for review. Verify UI, source link, timestamps,
   refreshed balance and unlink behavior before approving live rollout.

There is no student-accessible approval endpoint. The operator's shell access
is the administrative boundary. Review proves control at that time; an account
transfer or compromise needs revocation/review. Automatic detection of external
account transfer is not claimed.

## Refresh, concurrency and arithmetic

Per-binding leases last 30 seconds; successful snapshots have a 24-hour cooldown,
failures 15 minutes. Network calls have a six-second total deadline, 32 KiB
limit, no redirects and fixed Codeforces user.info URL. Malformed,
wrong-handle and excessive fields are rejected. A 429 or outage preserves the
last-good snapshot and marks it stale. Ratings use current rating, not maxRating;
unrated is zero. Private contact fields and full raw responses are not retained.

When statistics are enabled, its calls and existing contest calls share a
persisted three-second request budget per Core database, stricter than the
documented two-second API limit. Independent deployments/databases must also
coordinate their shared provider/IP budget. Busy callers defer; no request queue
or background worker is added. Existing contest snapshots remain independent of
private student bindings.

Snapshot and bonus are committed together. Only the old-to-new difference is
added to `AuraBalance.externalBonus` and total; engagement is never overwritten.
Account writes serialize concurrent replacement/unlink operations. Handle change,
membership version and binding version prevent an old in-flight response from
updating a new binding. Unlink removes only this account's applied bonus, clears
its snapshot and invalidates its lease. Old transport receipts remain intact.

Disabling the bonus flag does not silently sweep existing balances: a subsequent
successful refresh removes that binding's prior bonus, or the user can unlink.
Disabling statistics prevents refresh/link but still permits unlink. Review
rollout impact before changing flags; the UI explains retained prior amounts.

The only production formula is `cf-current-rating-v1`. The LC easy/medium/hard
formula branch has tests but no enabled source adapter and cannot be submitted
through HTTP. Changing a formula requires a new reviewed version and prospective
activation; never regrade historical domain events.

## API

- GET `/api/me/external-accounts`: capabilities and owned records; no query fields.
- POST same path: exactly `{provider:"codeforces",handle:"..."}`.
- POST `/api/me/external-accounts/codeforces/refresh`: exactly `{}`; reports
  updated, deferred, discarded or unavailable. A deferred response may mean
  cooldown or unverified state; no provider call was made.
- DELETE `/api/me/external-accounts/codeforces`: no payload; idempotent unlink.

All routes require current authentication and active Hub membership. Existing
authentication/identity guards apply to frontend actions. No student-supplied
rating, ownership proof result, user ID or Hub ID is accepted.
