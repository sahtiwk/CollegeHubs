# TP4.2 local implementation evidence

Implemented 2026-10-19. Waiting-room cancellation, editor save-state clarity,
participant status labels, editorial lobby/room screens, mobile solution selection
and retained peer-note retries are implemented. Explicit saving is retained;
no autosave, deadline extension, pause, late join or execution engine is added.

## Checks

- Full regression suite: **128 passed, zero failed/skipped**. Local report:
  `.local/tp42-guards.tap`. Includes identity, Hub isolation, channel durability,
  Study, module grants, Aura and schedules.

- G4 service checks cover host-only cancellation, unexpected fields, nonparticipant
  denial, retained records, repeated cancellation, zero completion facts, rejected
  late writes/joins, and a concurrent start/cancel with exactly one winner.
- Existing G4 checks cover revision races, sealed content, process-kill recovery,
  deadline-crossing rollback, single closure, socket privacy and clock skew.
  Socket cancellation also checks host and waiting-state enforcement.
- `tests/frontend/study-browser.cjs` passed against the disposable integration
  fixture with two authenticated browser contexts. It exercises HTTP cancellation
  and reload, nonhost UI permissions, +120/-120 second browser clock offsets,
  a real 30-second offline interval, exact draft retry and reload recovery,
  deadline expiry with unsaved local edits retained, sealed source equality,
  mobile single-solution selection, saved peer review and contained overflow.
  Only the disposable test room's deadline is accelerated through the fixture DB.
- `tests/identity/renewal-browser.cjs` passed: renewal and reauthentication preserve
  message/Study retry bodies and drafts; account switching isolates private state.
- Production web build passes. The existing optional shader bundle still produces
  its size warning; this ticket adds no dependencies.

The browser script runs with `study-browser` in `scripts/p32-fixture.cjs`,
`CORE_SESSION_ENABLED=true`, and `PLAYWRIGHT_PATH` pointing to an installed
Playwright package. It refuses nonlocal/nonfixture Mongo targets. Service guards
run with the fixture's legacy compatibility flag off, as in previous phases.

Screenshots inspected at 1280px desktop and 390px mobile:
[waiting room](screenshots/tp4.2-waiting-desktop.png),
[editor](screenshots/tp4.2-editor-mobile.png),
[desktop review](screenshots/tp4.2-review-desktop.png),
[mobile review](screenshots/tp4.2-review-mobile.png).
The final closed-room label was subsequently clarified from “Changes to save”
to “Local copy only”; screenshots retain the earlier wording.

These are local browser/service checks, not hosted deployment or physical mobile
keyboard certification. Records and source remain available after cancellation or
expiry; no retained application data was migrated or reset.
