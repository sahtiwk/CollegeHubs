# TP7.1 acceptance — 2026-10-20

Implemented Spot the Bug at `/arcade/spotbug`: eight original versioned puzzles, five frozen questions per round, four correct answers to qualify, ten-minute server deadline, saved explanations and the existing durable reward delivery flow. No snippets execute.

## Verified locally

- Full disposable regression fixture: **161 passed, zero failed or skipped** (`.local/p32-guards.tap`). Includes new content validation, correct/wrong/pass-boundary, forged totals, foreign questions, expiry, ordered/replayed/conflicting actions, concurrent duplicate writes, immutable snapshots, foreign user/Hub denial, one completion fact and historical/new Core rule selection tests.
- `npm run build:web`: passes. Existing optional shader bundle size warning remains.
- Built browser asset scan: none of the bank's snippets or explanations are bundled. Start DTO checks expose no answer key or future explanations; submitted feedback is intentionally visible.
- `tests/frontend/spot-bug-browser.cjs`: real disposable Core login and module handoff, keyboard radio selection/submission at 390px, reload after two answers, five correct answers, saved/pending message, then +5 awarded receipt. The test verifies exactly one corresponding Core ledger event under `arcade-v3-four-games-v1`. Test answers are read from the disposable DB in the Node harness, never embedded in the browser. No mocked completion or receipt.
- Mobile page has no horizontal document overflow. Mobile screenshot inspected: [completion and receipt](screenshots/tp7.1-spot-bug-mobile.png). The desktop resize capture was blank and is excluded from evidence.
- `git diff --check`: passes.

## Reproduction and boundaries

Use the guarded `scripts/p32-fixture.cjs` with a fresh local Learn PostgreSQL database. Run `guards` with `CORE_SESSION_ENABLED=false` (legacy token fixtures); run browser acceptance with `CORE_SESSION_ENABLED=true`. An initial regression run with the browser session setting failed its legacy bindings; rerunning under the required setting passed. The existing catalogue assertion was updated to include the fourth ranked game. The final regression includes prospective-rule coverage using a fresh test owner/issuance binding.

Content provenance and static explanation review are recorded in the bank and [Arcade documentation](arcade.md). Original content is CC0; review was by Codex, not an independent human. The fixed practice bank is learnable and rewards are capped. Old scoring files remain unchanged; the new ordinary-game cap is four and source cap stays 30. No production deployment or hosted permissions claim is made. TP7.2 daily challenges remain separate.
