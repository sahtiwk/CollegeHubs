# TP8.2 — complete paths and bounded recovery

Local acceptance completed 2026-10-20. No production database, hosted deployment or paid inference was used.

## Delivered behavior

- Schema v4 migration adds immutable `path_completion` rows with the required canonical-node snapshot, version, final qualifying attempt and timestamp. The final assessment, topic progression, path fact and outbox event commit together under the owned learner lock.
- One completion per user/domain/version, independent of Hub. Reset/re-enroll and Hub copies cannot create another path reward. Old results and completion facts are immutable. No historical completion is automatically converted into a reward at migration.
- Core activates prospective policy `learn-foundations-paths-v1` for the five canonical foundation paths: up to 30 Aura, five path facts/day, shared Learn cap 100. Core validates path/source identity and three required/completed topics. Delivery accepts a path receipt up to 30, retaining the same event on transport failure. Existing generic pending-results/reconciliation routes cover the new event.
- Failed assessments attach one personal plan per topic/version, containing up to three reviewed concept/source steps selected from missed questions. Attachments form a validated forward-only chain; they never become required topics or reward-bearing clones. Marking review read does not unlock anything; passing a later assessment resolves it.
- Checkpoint/test-out thresholds remain 0.6/0.8. Theta remains the explicitly labeled practice heuristic; self-rating does not imply assessed ability. A8 keeps first-completion-only quiz rewards with the fixed banks.
- Result, reading, milestones and progress screens expose recovery and completion. Graph/list preview opening focuses the selected heading; Escape restores the trigger. Summary delegation exposes only bounded numeric counts; Core accepts older Learn summaries during rollout.

## Verification

| Check | Result |
| --- | --- |
| Full regression fixture | 168/168 tests passed |
| Migration/restore suite | 10/10 passed, including retained rows/IDs, immutable triggers, dry-run/concurrent/repeated apply, interrupted resume, SQL dump/restore and Core BSON restore |
| Focused TP8.2 guards | 2/2 passed, rerun after the final readiness fix |
| Learn and web builds | Passed; existing large shader bundle warning remains |
| Browser acceptance | Passed all five complete three-topic paths, plus a failed checkpoint → review → successful recovery |
| Actual receipt acceptance | First DSA path showed +30 path, +15 mastery and +5 quiz confirmations; all five path events settled, with later awards bounded by the shared daily cap |
| Accessibility/visual | 390×844 mobile, 1280×900 desktop, reduced motion, no horizontal overflow, keyboard activation/focus/Escape; mobile progress, remediation and receipt screenshots inspected |
| Whitespace check | `git diff --check` passed |

Focused guards cover incomplete finalize and private answer omission; owner isolation; cyclic/foreign/unsafe remedial attachments; all domains; concurrent repeated finalization and two final nodes in a branched fixture; immutable old attempts/path facts; reset and cross-Hub deduplication; lost-response retry with a 30-point receipt; and actual schema-v4 readiness. Core guards verify prospective activation, missing scope, semantic duplicate receipts, canonical counts and the shared 100 cap.

The full regression initially caught the expanded summary contract and an outdated synthetic path identity. Those were corrected before the passing run. Browser acceptance then caught a readiness SQL filter that still excluded v4; it was fixed and a real-v4 readiness assertion added to the focused guards. These were resolved failures, not waived checks.

`tests/frontend/learn-paths-browser.cjs` runs against a disposable local P3.2 fixture with Core sessions enabled, Learn migrated to v4, and a fresh preview user. Private answer keys stay in the Node test harness; the browser uses ordinary server-issued questions and finalization. Gemini, YouTube and optional reading lookup were disabled. The complete run produced five SQL path facts and five settled Core path confirmations.

Reports: ignored `.local/p32-guards.tap` and `.local/tp82-migrations.tap`. Screenshots: [optional review](screenshots/tp8.2-remediation-mobile.png), [path receipt](screenshots/tp8.2-path-receipt-mobile.png), [mobile progress](screenshots/tp8.2-progress-mobile.png), [desktop progress](screenshots/tp8.2-progress-desktop.png).

## Rollout and limits

See [Learn operation](learn.md) for migration and explicit credential scope provisioning, and [Aura policy](aura-transition-policy.md) for prospective scoring. Missing path scope needs operator correction; browser authorization cannot replace it. Rollback after v4 requires the coordinated backup and compatible code.

Remediation is bounded reviewed practice, not a dynamically generated adaptive curriculum. No psychometric calibration or independent human certification is claimed. Runtime model-generated learning graphs remain conditional on TP9.1.
