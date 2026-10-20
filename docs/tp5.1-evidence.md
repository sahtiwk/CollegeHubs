# TP5.1 titles, achievements and reward history

Implemented locally on 2026-10-19. The [policy](aura-transition-policy.md)
records the badge criteria and retained scoring decisions. New `/progress` entry
is protected, preserves sign-in return intent, and is linked from the sidebar
and Aura card. Titles derive from the same Core configuration in summary,
leaderboard and profile responses. Badge reads are independent of Aura summary
and history, with separate loading/failure/retry states.

## Validation

- Full regression suite: **129 passed, zero failed/skipped**, covering identity,
  Hub isolation, reward arithmetic, channels, Study, module grants and schedules.
  Local report: `.local/tp51-guards.tap`.

- `tests/guards/achievements.test.js`: threshold boundaries; legacy fields excluded
  as evidence; concurrent projection uniqueness; all four awards from canonical
  evidence; repeated mastery IDs deduplicated; eligible zero-point receipt retained;
  owner/Hub-bound signed cursors, tamper and selector rejection; bounded migration
  interruption/resume/repeat; original balances, receipts and User fields unchanged.
- `tests/migrations/transition.test.js`: all nine tests pass, including read-only
  dry run, concurrent migration application, interrupted batch rollback/resume,
  SQL backup/restore and Mongo BSON restore retaining indexes, old reads and
  newly added award records. Original retained collections compare exactly.
- `tests/frontend/progress-browser.cjs`: real login return to `/progress`, a real
  code contribution earning First Contribution, all four criteria visible,
  canonical Seed title and leaderboard title, anonymous history denial and
  no mobile horizontal overflow. Explicit UI-only mock responses exercise history
  outage/retry, multi-page append, pending completion and zero/partial awards; ledger pagination and
  arithmetic preservation are separately tested against Mongo.
- Production web build passes. The pre-existing optional shader size warning
  remains; no dependencies were added for TP5.1.

Screenshots: [desktop](screenshots/tp5.1-progress-desktop.png),
[mobile](screenshots/tp5.1-progress-mobile.png). Both were visually inspected.
The browser script accepts `PLAYWRIGHT_PATH` and optional `BROWSER_CHANNEL=chrome`
when bundled Chromium is not installed. It uses the disposable session-enabled
fixture; no deployment or retained production data modification was performed.

Apply the additive migration through the documented Core operator workflow before
rollout. Projection reads can recognise newly qualifying evidence after backfill;
they never rescore old receipts. TP5.2 owns delivery reconciliation and new event
versions. Physical device and hosted rollout acceptance remain release work.
