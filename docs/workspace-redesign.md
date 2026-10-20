# TP4.1 workspace home and conversations

Implemented locally on 2026-10-19. The campus editorial treatment now covers
the signed-in home, shell, subject channels, composer, answer threads, resources
and feed. Channels and schedules precede progress and the feed; optional module
summaries load independently and cannot hold up navigation. Sidebar section
links focus their destination; profile and mobile navigation retain dialog focus.

Message/history contracts, literal channel-scoped search, cursor paging,
idempotency keys and immutable acceptance remain unchanged. The type selector
filters only the currently displayed page and says so. Search failure, empty
results, saved content and retry states are distinct. Feed drafts are scoped to
the signed-in account and Hub. An uncertain feed publication asks the user to
check saved posts before resubmitting; posts do not gain message idempotency.

## Code rendering

The pinned BSD-3-Clause highlight.js 11.11.1 core loads only JavaScript,
TypeScript, Python, JSON, HTML, CSS, Java, C++ and SQL grammars, as needed.
Plaintext and unknown languages stay literal. Inputs over 32 KiB are displayed
without highlighting. Each worker is terminated after completion, unmount or
three seconds; import failures retain the immediately visible plain source.
Generated markup is parsed into an allowlisted text/span tree, verified against
the exact source and rendered through React. It is never inserted as live HTML.
Copy uses the original source. Long lines scroll inside the block.
SubmissionComparison uses this same component.

License source: the installed package LICENSE, retained under docs/licenses and
in the distributed web notices. No service or database migration is introduced.
Literal search remains unchanged: no measured evidence justifies an index change.

## Validation

- Production web build passes, including separately emitted worker/grammar chunks.
- Full disposable-fixture regression run: 126 tests passed, zero failed/skipped,
  including Hub isolation, channel idempotency/immutable acceptance, Study, module
  grants, Aura, schedules and identity. Local report: `.local/tp41-guards.tap`.
- `tests/frontend/workspace-browser.cjs` passes against the disposable integration
  fixture: failed optional summaries, desktop/mobile layout, profile focus return,
  drawer keyboard trapping, lost-response retry with exactly one persisted message,
  literal search empty/error distinction, all nine grammars, HTML escaping,
  unknown-language/size/worker fallback and horizontal overflow containment.
- `tests/identity/renewal-browser.cjs` passes: two-tab renewal/logout, retained
  message and Study drafts, exact retry identity, no automatic write replay,
  module handoff renewal and account-isolated optional responses/drafts.
- Desktop and 390px mobile screenshots inspected; automated keyboard checks do
  not substitute for a physical mobile keyboard/device check.

Evidence: [desktop](screenshots/tp4.1-home-desktop.png),
[mobile home](screenshots/tp4.1-home-mobile.png),
[mobile channel](screenshots/tp4.1-channel-mobile.png).

Run the browser scripts with `PLAYWRIGHT_PATH` pointing to an installed Playwright
package and `CORE_SESSION_ENABLED=true` on the integration fixture. The fixture
uses disposable local data. TP4.2 owns Study cancellation and comparison layout.
