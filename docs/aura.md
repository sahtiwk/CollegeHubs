# Canonical Aura — P6.1

Core owns points, receipts, caps and shared activity days. MongoDB must be a replica set. No provider credentials, new environment variables or paid services are required for native scoring.

## Activated rules

Startup creates the immutable `native-v1` AuraRuleSet with MongoDB activation time and a hash of `config/auraRules.v1.json`. Restart reuses its timestamp; changing the same version's policy fails startup. A future policy needs an explicit version/migration implementation, not an edit to the persisted version. This release activates only implemented native facts:

| Qualified contribution | Points | Count/day |
| --- | ---: | ---: |
| Study completion with nonempty acknowledged work | 25 | 2 |
| Another person's answer permanently accepted by the question author | 15 | 3 |
| Code share | 5 | 5 |
| HTTPS resource share | 5 | 5 |

Native contributions combined earn at most 100 per India calendar day. A remaining budget below the normal weight receives a partial award. Zero-point cap receipts are final but qualifying participation still records the activity day. Posts, likes, login, reviews and casual play earn zero. Arcade/Interview/Learn completion scoring and live external bonuses remain disabled until their implementations ship. G3 injects separate fixture rules; these are not enabled in normal startup.

## Transactions and activation boundary

`nativeFactService` retains semantic uniqueness: Study by solution, acceptance by accepted answer, code by normalized content/user/Hub/day, and resource by normalized URL/user/Hub/day. The shared scorer writes the event receipt, day counter, activity row and balance in the domain transaction. Scoring failure rolls back the contribution transaction; callers retry the unchanged request. Study sealing remains durable first, with its pending reconciler retrying the completion transaction. One unique user/day/policy counter serializes concurrent awards, including across sources.

Native facts before activation stay `rules_inactive`; no historical score or stored User Aura is migrated. Pending Study facts whose occurrence predates activation also stay unscored. Identical events return the original receipt. Changed facts for the same event ID conflict. The API never accepts caller-selected points or rule versions.

Rules and receipts survive restarts. Demo reset preserves rule activation configuration while deleting only its authorized disposable records. Back up the database before any hosted release. If a scoring defect appears, stop the affected contribution endpoints/deploy the previous reviewed release while retaining all receipts and balances; do not delete rule versions or reissue facts to try to repair totals. Review a forward repair separately. No general runtime scoring toggle is introduced here.

## Read contracts

- `GET /api/me/aura` and `/api/me/progress`: authenticated current member only; no query selectors. Returns engagement, externalBonus, total, asOf, latest 20 minimized receipts, pending Study count, inactive fact count, scoring policy and streak. Missing balance means a real zero. Database failure returns unavailable, never a successful zero.
- `GET /api/hubs/:hubId/leaderboard?limit=50&cursor=...`: current active Hub only. Maximum 50 rows; signed cursor bound to Hub and ranking resource. Includes active zero-point members, plus own rank even outside the page. `/api/users/leaderboard` is the compatible alias.
- Ranking joins canonical balances and orders total descending then member ID ascending, with unique ordinal positions for ties. Mongo window running count computes own position before keyset filtering. A 3-second query deadline bounds failures; this MVP performs a college-wide join/sort and is not a large-scale ranking cache. Pagination is live, not a frozen snapshot: totals changing between pages can move members; refresh starts over.
- Public/profile compatible `auraPoints` and `currentStreak` come from canonical reads. Legacy stored scores, badges and rank titles never drive totals or ranking. Receipts expose no private draft, access binding or service metadata. Responses have `Cache-Control: no-store`.

DailyActivity identity is global user + Asia/Kolkata date + timezone-policy version, shared by all qualifying sources. Today extends the streak; if today is empty, yesterday's contiguous streak remains until the day ends. A missed full day resets it. Today is measured in India time, not the browser timezone. Streak reads use indexed user/day records with a 2-second deadline.

## UI and fixture math

The shared dashboard uses college theme tokens for Aura totals, split, shared streak, recent receipts and rules. Explicit refresh reloads the current account's summary; loading/unavailable/empty/pending are distinct. No fake ticker, level, quest or daily delta is shown. The college leaderboard shows own rank and cursor pages, with explicit refresh/retry.

Demo4 native total: **25 Study + 15 accepted answer + 5 code + 5 resource = 50 engagement**, zero external bonus. Repeating the same share/event cannot raise it. G3 separately tests concurrent caps, native rollback/replay/conflict, activation stability, legacy exclusion, rank beyond page 1, foreign cursor rejection and one day shared by native/module sources. Its external replacement fixture changes bonus 70 → 90 while keeping engagement unchanged. Future combined-module total 113 is not claimed as a live result in P6.1.

See [P6.1 verification](p6.1-evidence.md). P6.2 schedules and calendar are outside this release.
