# TP8.1 — five versioned learning paths

Completed locally on 2026-10-20. This records disposable local acceptance, not hosted deployment.

## Publication and preservation

- `foundations-v1`: DSA (arrays, iteration, complexity), Web (HTML, CSS, HTTP), ML (data, training, evaluation), Backend (requests, validation, persistence), DevOps (Git, CI, containers). Three required nodes per domain; 15 nodes and 225 questions in total.
- Every node has five checkpoint and ten test-out questions. The deterministic offline publisher reproduces the checked-in files and refuses a changed overwrite. Four legacy topics retain their questions and explicit canonical equivalence; new topic IDs are stable across Hub copies.
- Metadata records original CC0 content and a Codex static review dated 2026-10-20. This is bounded foundations practice, not independent human certification or calibrated assessment. Source links point to official documentation; external articles are not redistributed or relicensed.
- The v3 migration retains old physical node IDs, immutable attempts/completions/events and protection triggers. Existing enrollments remain on `demo-v1`; explicit upgrade copies equivalent completed progress, preserves old readings/results, cancels unfinished old attempts and emits no additional completion rewards.
- Immutable canonical claims backfill old completions and prevent duplicate rewards across versions/Hub copies. Core activates the new prospective `learn-foundations-v1` policy alongside the historical policy. No path-completion award is introduced in TP8.1.

## Verification

| Check | Observed result |
| --- | --- |
| Learn and web production builds | Passed; existing large shader chunk warning remains |
| Full guard/identity regression | 166 tests: 165 passed; one PDF worker timed out while migration tests also ran. The exact PDF test passed in isolation (1/1). No timeout threshold was weakened. |
| Migration/restore suite | 10/10 passed, including retained SQL rows, migration dry-run/repeat/concurrency/failure-resume, disk dump/restore and Core BSON backup/restore |
| TP8.1 focused guards (included above) | Both passed: content rejection checks and retained-v2 migration, concurrent/idempotent upgrade, all five domains, locked/foreign node access, immutable history and cross-Hub reward deduplication |
| Offline publication | Reproduced 15 nodes / 225 questions without changing files |
| Existing-user browser acceptance | Real old checkpoint completed, live schema 2→3 migration stayed ready, explicit upgrade retained 1/3 completed topics, old attempt/readings remained accessible, archived new assessments unavailable |
| Five-domain browser acceptance | All five paths enrolled and first readings opened; new ML checkpoint received confirmed +5 quiz and +15 mastery Aura from Core |
| Fresh-user browser acceptance | Separate fresh account enrolled in all five paths; three topics per path, zero inherited completions, accessible list and no mobile horizontal overflow |
| Visual checks | 390×844 mobile and 1280×900 desktop, reduced motion; onboarding and dashboard screenshots inspected |

Browser acceptance used `tests/frontend/learn-curricula-browser.cjs` against the disposable P3.2 fixture. Default mode starts on schema v2 and exercises the upgrade; `FRESH_LEARN_BROWSER=true` subsequently verifies the fixture's separate peer account on v3. Private answer keys are read only by the Node test harness; the application grades on the server. Gemini, YouTube and optional reading lookup were disabled. No production database or provider key was used.

Reports remain in ignored `.local/p32-guards.tap` and `.local/tp81-migrations-final.tap`. Screenshots: [upgrade](screenshots/tp8.1-upgrade-mobile.png), [five paths](screenshots/tp8.1-onboarding-mobile.png), [dashboard](screenshots/tp8.1-dashboard-desktop.png), [confirmed rewards](screenshots/tp8.1-receipt-mobile.png), [fresh accessible list](screenshots/tp8.1-fresh-list-mobile.png).

## Operation and next scope

See [Learn operation](learn.md) for the explicit migration command and compatible rollout. Keep the old publication and historical reward policy. After migration, rollback requires the coordinated backup; do not deploy a v2-only service against v3. TP8.2 remains outstanding: path completion, assessments and bounded remedial progression.
