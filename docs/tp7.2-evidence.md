# TP7.2 acceptance — 2026-10-20

Daily Arcade and the catalogue redesign are implemented locally. Selection alternates Sorting Complexity and Spot-the-Bug; four ordinary ranked games remain playable. Optional casual reuse was not selected, so no unvalidated casual game is exposed.

## Checks

- Full disposable regression fixture: **163 passed, zero failed or skipped** (`.local/p32-guards.tap`). Covers retained historical rules alongside current daily scoring, concurrency, identity and recovery contracts.
- Final focused Aura/daily run: **25 passed**, two unrelated existing optional integrations skipped because their PostgreSQL/service configuration was not supplied (`.local/tp72-focused.tap`). Includes +15 canonical receipt replay, shared 30-Aura cap, forged challenge rejection, one qualifying activity day and projection into the existing Consistent Learner badge.
- Final daily tests rerun after midnight retry hardening: **2 passed**. Includes deterministic selection at 18:30 UTC, immutable publication inputs, two-tab creation/action races, owner/Hub denial, first-attempt retention, expiry without a fact, stale-day labels and daily-only sealing.
- Web build and Arcade source build pass. Existing optional shader size warning remains. `git diff --check` passes.
- Chrome browser acceptance (`tests/frontend/arcade-daily-browser.cjs`): real disposable login, daily creation, second-tab resume of the same session, server-validated win, **one Core +15 receipt under arcade-v4-daily-v1**, then successful ordinary NumberGuess, MathAmplitude, Sorting Complexity and Spot-the-Bug rounds. Math waits for the real 30-second minimum; no database clock shortcut. Private test answers are read only in the Node harness, not shipped in the client.
- Browser uses a 390px viewport and reduced-motion preference. Keyboard selection is exercised for Spot-the-Bug; native controls are used throughout. The main grid contains exactly four released games; unreleased entries are hidden in a labelled disclosure. Mobile has no horizontal document overflow.

## Visual evidence

- [Mobile catalogue](screenshots/tp7.2-catalogue-mobile.png)
- [Desktop catalogue](screenshots/tp7.2-catalogue-desktop.png)
- [Daily completion and +15 receipt](screenshots/tp7.2-daily-receipt.png)

Screenshots were visually inspected. The final desktop grid uses two columns. Existing theme, typography and warm-paper/electric-blue direction are retained.

## Operational boundaries

Daily publication and saved sessions are durable Mongo records. A unique user/day index prevents another attempt even across Hub changes. The deadline is the earlier of ten minutes or India midnight; no late result is scored. Only one daily fact is emitted for a qualified daily session. Core canonical challenge/day checks and existing ledger transactions enforce reward deduplication. Ordinary rewards, daily rewards and partial/zero cap receipts share one 30-Aura daily budget.

Daily accepted activity uses the same DailyActivity row as other qualifying work, feeding progress/streaks and the existing seven-day badge. No separate streak increment or badge bonus is introduced. Production activation requires the daily event scope on the Arcade service credential and the new prospective Core rules. Older rule files are retained unchanged. See [Arcade operations](arcade.md) for deployment and rollback requirements. No production rollout was performed.
