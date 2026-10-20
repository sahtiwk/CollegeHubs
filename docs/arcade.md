# Arcade - P7.1 and P7.2

Arcade is an independent Express/MongoDB service. The shared React shell renders NumberGuess, MathAmplitude, Sorting Complexity and Spot the Bug; no legacy router, navigation, global stylesheet or OpenAI client is imported. Core alone awards Aura. The pure shared game manifest drives catalogue cards, lazy game selection and the API release boundary. Other legacy games remain unavailable; no casual validator is released.

## Setup and ownership

Use Node 24.12+, root `npm ci`, and `services/arcade/.env`. Arcade defaults to port 5001, Core to 5000, Learn to 5003. Enable `learn,arcade` in Core `ENABLE_MODULES`; configure the web gateway's Arcade origin. `npm run dev` starts enabled services; `npm run dev:arcade` runs Arcade independently. `npm run build:arcade` checks its own source; `deploy/build.mjs arcade` installs/builds its workspace artifact.

Arcade requires its own MongoDB replica-set database and a database user restricted to that database. It imports no Core database models. Local fixtures use separate logical databases on a disposable replica set; this does not prove hosted database-user permissions. Configure exact APP_ORIGIN, CORE_API_BASE_URL, issuer, `collegehubs-arcade` audience, kid and RSA public key. Core retains the private signing key. Provision Arcade's Core credential using `provisionModuleService.js` with explicit `eventTypes: ["arcade.game_completed"]`; put that credential only in Arcade's environment. Use a separate random 32-byte base64url ARCADE_RECONCILE_KEY for operator recovery. Never expose either key in Vite variables, URLs or browser storage.

A3 handoff uses one-use state and Core grants. Arcade verifies the signed 15-minute credential and stores a hash of an opaque session cookie, bound to user + Hub + membership version. Cookies are HttpOnly, SameSite=Lax, path `/api/arcade`, Secure on HTTPS. Mutation requests require the exact Origin and session CSRF token. The gateway forwards only the selected module's cookies and strips browser Authorization for module routes. Session expiry requires a fresh handoff; logout/account changes clear client state.

## NumberGuess contract

All responses are no-store JSON. Owned game operations scope both user and Hub; foreign games return 404. Query selectors and extra body fields are rejected.

- `GET /api/arcade/games`: four ranked entries plus explicitly unavailable legacy entries. Global new-game disable is reflected in enabled flags.
- `POST /api/arcade/sessions`: `{gameId: "numberguess" | "mathamplitude" | "sorting" | "spotbug", clientSessionId: UUIDv4}`; identical creation IDs return the same game. At most five currently active games are allowed per owner (a request-time abuse bound).
- `GET /api/arcade/sessions/:id` and `GET /api/arcade/me/activity`: saved game and latest 20 owned games.
- `POST /api/arcade/sessions/:id/actions`: `{seq, guess}`. Integer guesses 1�100, ordered sequences 1�10, ten-minute immutable deadline. The crypto-random target is private; responses return only hints/history. Transactions serialize competing actions. Identical replay returns its original transition; a changed guess at that sequence conflicts. Wins/losses cannot be rewritten.
- `POST /api/arcade/sessions/:id/complete`: empty body only; NumberGuess/sorting read already-terminal results, MathAmplitude finalizes the server-assessed round. No client score is accepted.

A qualifying completion atomically saves its immutable completion envelope with the result. Loss/expiry emits no event. Core retains immutable `arcade-numberguess-v1` and activates prospective `arcade-three-games-v1` for the original three-game release. It chooses the policy active at event occurrence; old pending NumberGuess facts retain their previous policy. Only matching implemented game/rules versions qualify. Each first qualifying game per Asia/Kolkata day earns 5; further same-game wins receive a terminal zero receipt. That historical policy has three distinct games/day and source cap 30; current TP7 rules are described below. No validated trace proves human play.

## MathAmplitude

`mathamplitude-v1` has a server-created 60-second deadline and 40 private arithmetic questions. Only the current question ID/operands/operator are exposed. Each action is `{seq, questionId, answer}` with a bounded integer answer. Correct answers advance; three wrong attempts skip to the next question. The saved answer ledger, current index and correct count are authoritative. Same action replay cannot raise the count; another question ID or altered replay conflicts. Maximum 120 answers. No answer key or future question pool is returned.

`complete` requires at least 30 seconds on the server clock. Five correct answers produce a qualified win; fewer produce a saved loss with no event. At 60 seconds new answers are rejected; the UI closes its form and asks the owner to finish the saved round. The UI clock is display-only, based on server timestamps, and its interval is cleaned up on navigation/reset. Qualification happens only on explicit finalization, which atomically saves the result and pending event. Reconnect authorization for the same owner if the module session expires before finalization. Play again creates a new round/UUID and resets score, answer, feedback and deadline.

## Sorting Complexity

`sorting-v1` seeds six distinct crypto-random integers and stores the original permutation privately. The current array and next adjacent pair are public. Actions are `{seq,type:"compare"|"swap",left,right}`; compare the exact bubble-sort pair before swapping, swap only an inverted pair, and complete all five passes. Every ordered comparison/swap is persisted, including zero-swap comparisons. There are exactly 15 comparisons and at most 15 swaps. A premature/missing/reordered trace, arbitrary array/code or out-of-range pair cannot finish.

After the trace, `{seq,type:"complexity",choice:"linear"|"linearithmic"|"quadratic"}` requires the correct worst-case choice, quadratic. A wrong choice is rejected without advancing or awarding; the owner may reconsider. Correct choice plus sorted original permutation seals the win. At most 31 accepted actions, ten-minute expiry, no minimum duration, no eval or arbitrary code execution. Keyboard buttons/radio choices and touch-friendly controls work without dragging, WebGL, sound or animation.

## Pending results and outages

A win remains saved if Core is down: the UI says Aura pending, never invents points. Delivery uses the saved envelope, a 4-second HTTP deadline, a database lease, and persisted exponential backoff from 30 seconds to one hour. Reads/actions may trigger a due retry. Lost replies repeat the same event ID and receive Core's canonical receipt. A read does not bypass backoff; users can reload later. There is no always-on worker or free-tier delivery guarantee.

For an operator with the separate reconcile key, call the **direct Arcade service**, not the public gateway:

- `GET /api/arcade/integration/pending-results` with `Authorization: Bearer <reconcile key>`: latest bounded pending diagnostics (maximum 20).
- `POST /api/arcade/integration/reconcile` with that header and `{}` JSON: attempts at most three due results. Honors leases/backoff. Browser Origin/Sec-Fetch-Site requests are denied.

Core validates retained access issuance and current membership. A revoked principal or event beyond the 30-day retention contract remains pending for operator review; reconciliation cannot fabricate a new identity/time to bypass rejection. `ARCADE_GAMES_ENABLED=false` stops new games while preserving saved reads/completions/recovery. `/health/live` checks the process; `/health/ready` checks only Arcade's own database. Stopping Arcade must leave Core usable. Free deployment configuration and quota limits are in [deployment](../deploy/README.md); hosted acceptance is separate from local acceptance.

## TP7.1: Spot the Bug

`spotbug-v1` freezes five distinct questions sampled from the eight original CC0 puzzles in `services/arcade/src/data/bug-puzzles.v1.json`, their order and a four-correct pass threshold. Ten-minute expiry is enforced by server time. Questions are displayed as text using the shared CodeBlock; no snippet runs. Actions contain only `{seq, questionId, choice}`. Each question accepts one choice, then reveals its explanation. Five answers seal a win or loss in the same transaction as the completion fact.

The private challenge is immutable and excluded from DTOs. Only the current unanswered question is disclosed; answered-question feedback is explicitly allowlisted. Identical sequence replay returns the original transition and current saved state, even after expiry; changed replay conflicts. Out-of-order choices, foreign question IDs and supplied scores fail. Another user or Hub receives 404 for reads and actions.

The bank records original provenance, CC0 notice, content version, difficulty, and a Codex static review dated 2026-10-20. Review checked each intended behavior and explanation (array bounds, numeric sorting, callback returns, assignment, string addition, object aliasing, Boolean ranges and initialization). This is not an independent human review. Startup and offline validation reject duplicate IDs/snippets/choices, missing metadata, unbounded content and invalid answer keys. Run `node --test tests/guards/spot-bug.test.js` for offline checks; supply a disposable local `GUARD_MONGO_URI` for database checks.

Core prospectively activates `arcade-v3-four-games-v1`: +5 for the first qualifying completion of each game per India day, four ordinary game awards maximum and the unchanged 30-Aura source cap. Old v1/v2 files remain unchanged and events retain their original occurrence-time policy. New Spot-the-Bug events before activation or with an unknown rules version do not score. Repeated practice can be memorized and is not a bot-proof assessment.

See [TP7.1 acceptance evidence](tp7.1-evidence.md). TP7.2 daily challenges are described below.

## TP7.2 daily challenge and catalogue

The main grid contains only four released ranked games. Unavailable legacy games are in a labelled disclosure. No additional casual game is released. Shared game controls now have a consistent reward strip, deadline display, large radio targets, keyboard focus, mobile layout and explicit reduced-motion styling. Daily rounds never offer Play again; ordinary practice still does.

Authenticated GET /api/arcade/daily publishes or reads the canonical India-day challenge and returns only its public descriptor plus the caller’s existing attempt. POST with {challengeId} starts or resumes that attempt. Both routes use the existing module identity, CSRF and exact-Origin boundaries. Daily selection alternates Sorting Complexity and Spot-the-Bug, using the versioned day definition in packages/contracts/arcade-daily.cjs. NumberGuess and MathAmplitude remain ordinary practice games. The saved DailyChallenge records a deterministic seed, immutable private content and content/rules version; all users receive the same puzzle for that day. No answer key, private seed or unattempted explanation is sent.

A unique user/day index on GameSession makes two tabs share one attempt, including a loss or timeout. It spans Hubs; a changed membership cannot create a second attempt or read the previous Hub’s round. The deadline is the earlier of ten minutes or midnight IST. No late answers or late completion are accepted; expired attempts have no reward. Replaying an already committed action returns its original transition and current state. Old saved rounds show their day and a Past daily challenge label. Retry recovery uses the original attempted day even when a concurrent write crosses midnight.

A qualified daily round atomically seals only arcade.daily_completed. Its metadata contains the canonical challenge ID/day and daily-v1 rules; no ordinary completion is also emitted. Core’s prospective arcade-v4-daily-v1 policy awards up to 15, replacing that session’s ordinary +5, with one daily award and the shared 30-Aura Arcade source cap. Ordinary game awards retain the four-game limit. Earlier policies/files remain immutable. Core validates the canonical challenge ID at occurredAt and rejects unsupported versions; repeated deliveries and semantic aliases return one canonical receipt. Partial/zero-cap receipts are final.

Daily receipts enter the existing Aura ledger/progress ticker, module completion totals and DailyActivity projection. The existing Consistent Learner badge counts the qualifying day; another completion that day adds no streak day. No extra badge reward is added. Version daily-v1 must remain frozen; publish a new version with an explicit activation-day transition when changing selection/content, preserving historical definitions.

Deployment: build Core, Arcade and web together. Arcade startup creates the DailyChallenge collection/indexes and the partial unique user/day session index. Extend the Arcade service credential to allow both arcade.game_completed and arcade.daily_completed before enabling traffic. Core startup prospectively activates v4; without that activation a saved daily result stays pending. ARCADE_GAMES_ENABLED=false blocks new attempts but keeps existing reads/results. Rollback must preserve publication/session records and daily service scope until pending facts settle; do not remove v4 from Core while deliveries remain. Never activate the unrelated disabled future Learn-path rules. No hosted rollout was performed here.

See [TP7.2 evidence](tp7.2-evidence.md). The fixed puzzle bank is educational practice, not proof of human play.
