# Arcade - P7.1 and P7.2

Arcade is an independent Express/MongoDB service. The shared React shell renders NumberGuess, MathAmplitude and Sorting Complexity; no legacy router, navigation, global stylesheet or OpenAI client is imported. Core alone awards Aura. The pure shared game manifest drives catalogue cards, lazy game selection and the API release boundary. Other legacy games remain unavailable; no casual validator is released.

## Setup and ownership

Use Node 24.12+, root `npm ci`, and `services/arcade/.env.example`. Arcade defaults to port 5001, Core to 5000, Learn to 5003. Enable `learn,arcade` in Core `ENABLE_MODULES`; configure the web gateway's Arcade origin. `npm run dev` starts enabled services; `npm run dev:arcade` runs Arcade independently. `npm run build:arcade` checks its own source; `deploy/build.mjs arcade` installs/builds its workspace artifact.

Arcade requires its own MongoDB replica-set database and a database user restricted to that database. It imports no Core database models. Local fixtures use separate logical databases on a disposable replica set; this does not prove hosted database-user permissions. Configure exact APP_ORIGIN, CORE_API_BASE_URL, issuer, `collegehubs-arcade` audience, kid and RSA public key. Core retains the private signing key. Provision Arcade's Core credential using `provisionModuleService.js` with explicit `eventTypes: ["arcade.game_completed"]`; put that credential only in Arcade's environment. Use a separate random 32-byte base64url ARCADE_RECONCILE_KEY for operator recovery. Never expose either key in Vite variables, URLs or browser storage.

A3 handoff uses one-use state and Core grants. Arcade verifies the signed 15-minute credential and stores a hash of an opaque session cookie, bound to user + Hub + membership version. Cookies are HttpOnly, SameSite=Lax, path `/api/arcade`, Secure on HTTPS. Mutation requests require the exact Origin and session CSRF token. The gateway forwards only the selected module's cookies and strips browser Authorization for module routes. Session expiry requires a fresh handoff; logout/account changes clear client state.

## NumberGuess contract

All responses are no-store JSON. Owned game operations scope both user and Hub; foreign games return 404. Query selectors and extra body fields are rejected.

- `GET /api/arcade/games`: three ranked entries plus explicitly unavailable legacy entries. Global new-game disable is reflected in enabled flags.
- `POST /api/arcade/sessions`: `{gameId: "numberguess" | "mathamplitude" | "sorting", clientSessionId: UUIDv4}`; identical creation IDs return the same game. At most five currently active games are allowed per owner (a request-time abuse bound).
- `GET /api/arcade/sessions/:id` and `GET /api/arcade/me/activity`: saved game and latest 20 owned games.
- `POST /api/arcade/sessions/:id/actions`: `{seq, guess}`. Integer guesses 1–100, ordered sequences 1–10, ten-minute immutable deadline. The crypto-random target is private; responses return only hints/history. Transactions serialize competing actions. Identical replay returns its original transition; a changed guess at that sequence conflicts. Wins/losses cannot be rewritten.
- `POST /api/arcade/sessions/:id/complete`: empty body only; NumberGuess/sorting read already-terminal results, MathAmplitude finalizes the server-assessed round. No client score is accepted.

A qualifying completion atomically saves its immutable completion envelope with the result. Loss/expiry emits no event. Core retains immutable `arcade-numberguess-v1` and activates prospective `arcade-three-games-v1` for P7.2. It chooses the policy active at event occurrence; old pending NumberGuess facts retain their previous policy. Only matching implemented game/rules versions qualify. Each first qualifying game per Asia/Kolkata day earns 5; further same-game wins receive a terminal zero receipt. The policy has three distinct games/day and source cap 30 (the three released five-point games total at most 15/day). No validated trace proves human play.

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
