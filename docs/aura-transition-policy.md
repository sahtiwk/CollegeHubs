# Aura transition policy: TP5.1

## TP8.2 prospective path policy (2026-10-20)

`learn-foundations-paths-v1` activates only `learn.path_completed` for the five `foundations-v1` paths. The weight is 30, with at most five path facts per day and the existing shared Learn source cap of 100 (Asia/Kolkata). Actual receipts may therefore award less than 30 or zero. Existing quiz/mastery rules and receipts are unchanged. Activation is recorded by Core; events predating activation cannot use this policy.

The canonical path ID is `foundations:<domain>`. Its source identity is `<pathId>:foundations-v1`, and both required/completed counts must equal three. Semantic uniqueness is user + path + curriculum version, independent of Hub. Learn also retains a matching immutable SQL completion row and the snapshot of required canonical skills. Reset, re-enrollment, delivery retry and Hub copies cannot create another path award.

The A8 repeated-quiz decision remains **first-completion only**. Fixed reviewed banks do not earn repeated-checkpoint rewards. Remedial review steps are optional, have no reward events, do not count toward the required path denominator and do not substitute for passing an assessment. Thresholds stay 0.6 checkpoint / 0.8 test-out; theta remains `6 × ratio − 3`, a labeled heuristic rather than calibrated proficiency.

This is prospective: migration does not turn old completions into reward events. `demo-v1` has no path reward. An already-completed foundation path can be re-assessed after reset to record its first prospective path fact, without repeating quiz/mastery rewards. An explicit demo upgrade carries equivalent topic progress and qualifies for a path fact only after all required foundation topics are assessed complete.

TP6.2 addendum (2026-10-20): opt-in Codeforces snapshots can apply the
prospective `cf-current-rating-v1` bonus after verified account control. Both
statistics and bonus default off. Delta replacement preserves engagement;
unlink removes only the binding's applied bonus. See [external progress](external-progress.md).
The original TP5.1 decisions below describe that release, not later activation.

Decision recorded 2026-10-19. Core remains the sole reward authority. This release
adds non-point achievement projections and canonical read models; it does not
activate a new scoring rule or rewrite any balance, event, receipt or activity day.

## Continuity decisions

- Preserve current Hub-scoped semantic keys and all duplicate receipt aliases.
  Membership transfer remains disabled. Global identity migration is deferred to
  TP5.2 and must preserve original replay lookup; this ticket never rekeys events.
- Preserve native qualifying contribution days alongside module completions.
  Existing shared India-time policy 1 continues, including qualifying capped
  activity. No new activity days are inferred from old inactive facts.
- Retain first-node-completion Learn quiz/mastery emission. Repeated quizzes do
  not gain rewards from the fixed question bank. Any later expansion needs a
  reviewed pool and prospectively activated version; TP8 owns that decision.
- Retain native Study +25 (two/day), accepted answer +15 (three/day), code +5
  (five/day), resource +5 (five/day), and the native source cap of 100/day.
  Existing module weights, caps and activation timestamps remain authoritative.
  The earlier proposed three-resource limit is not applied retroactively.
- External bonuses remain disabled. Daily challenge and path completion event
  types are not activated by this release. No reward is granted for login,
  page views, likes or badges.

## Achievement policy achievements-v1

The implementation plan names four badges without numeric criteria. The initial
criteria below are explicit implementation choices, displayed beside each badge:

| Badge | Required canonical evidence |
| --- | --- |
| First Contribution | One durable native code/resource share, accepted answer or completed Study fact |
| Study Partner | One durable `study.completed` fact (already requires a nonempty acknowledged solution) |
| Consistent Learner | Seven distinct persisted qualifying activity days under India policy 1; not necessarily consecutive |
| Academic Explorer | Three distinct mastered Learn node IDs from canonical eligible receipts; repeating the node across attempts or curriculum versions does not count again |

Inactive native facts prove an action and can qualify for a non-point badge.
They never create retroactive Aura or streak days. Ineligible/duplicate module
receipts do not qualify; eligible zero-point capped mastery does. Old User title
and achievement fields are never used as proof. With transfer disabled, evidence
is read within the user's current Hub. Awards are unique globally by user/badge.

Awards record their evidence IDs, policy version, evidence qualification time
(`earnedAt`) and projection time (`recordedAt`). A previously earned award is
immutable, including when older evidence arrives later. Badge display starts
when this version is deployed; backfill may recognise earlier evidence. That is
recognition of historical facts, not a new historical point transaction.

## Titles, history and operational rollout

Titles derive from total committed Aura in one Core config: Seed 0, Contributor
100, Collaborator 300, Mentor 1000. Summary, leaderboard and profile DTOs share
that config; legacy User fields remain untouched. Total remains engagement plus
external bonus. Badge changes do not increment balance versions.

`GET /api/me/aura/history` returns 1–50 canonical receipt rows per page, newest
recorded ObjectId first. Cursors are signed and bound to resource, Hub and user.
It includes zero and partial awards, excluding duplicate deliveries; original
occurrence/day and recorded timestamps remain available. It does not imply that
unscored inactive facts or unacknowledged module deliveries are awarded receipts.
The summary separately explains inactive facts and pending Study completions.

`GET /api/me/aura/achievements` evaluates bounded, time-limited evidence queries
and returns the four definitions with earned state. Failed reads can be retried;
badge projection is outside scoring/message transactions. It never blocks Core
shell loading. Projection runs on this read and during backfill, so recognition
can lag the originating action until Progress is opened/refreshed.

Apply migration `0004_achievements` through the existing Core migration CLI after
its read-only dry run. Index preparation is additive/idempotent outside the data
transaction. User batches and their checkpoint commit together. A bounded stop
or interruption resumes from the checkpoint; rerunning never adds points or
duplicates a badge. Startup also prepares the award uniqueness index. Back up
retained data and use the existing target confirmation/restore procedure.

Safe stop: hide the Progress page or disable its reads while retaining awards,
receipts and balances. Do not downgrade past the recorded migration catalog or
delete earned state to roll back a visual release.
