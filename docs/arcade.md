# Arcade — P7.1

Arcade is an independent Express/MongoDB service. The shared React shell renders the ported NumberGuess; no legacy router, navigation, global stylesheet or OpenAI client is imported. Core alone awards Aura. MathAmplitude and sorting remain unavailable until P7.2.

## Setup and ownership

Use Node 24.12+, root `npm ci`, and `services/arcade/.env.example`. Arcade defaults to port 5001, Core to 5000, Learn to 5003. Enable `learn,arcade` in Core `ENABLE_MODULES`; configure the web gateway's Arcade origin. `npm run dev` starts enabled services; `npm run dev:arcade` runs Arcade independently. `npm run build:arcade` checks its own source; `deploy/build.mjs arcade` installs/builds its workspace artifact.

Arcade requires its own MongoDB replica-set database and a database user restricted to that database. It imports no Core database models. Local fixtures use separate logical databases on a disposable replica set; this does not prove hosted database-user permissions. Configure exact APP_ORIGIN, CORE_API_BASE_URL, issuer, `collegehubs-arcade` audience, kid and RSA public key. Core retains the private signing key. Provision Arcade's Core credential using `provisionModuleService.js` with explicit `eventTypes: ["arcade.game_completed"]`; put that credential only in Arcade's environment. Use a separate random 32-byte base64url ARCADE_RECONCILE_KEY for operator recovery. Never expose either key in Vite variables, URLs or browser storage.

A3 handoff uses one-use state and Core grants. Arcade verifies the signed 15-minute credential and stores a hash of an opaque session cookie, bound to user + Hub + membership version. Cookies are HttpOnly, SameSite=Lax, path `/api/arcade`, Secure on HTTPS. Mutation requests require the exact Origin and session CSRF token. The gateway forwards only the selected module's cookies and strips browser Authorization for module routes. Session expiry requires a fresh handoff; logout/account changes clear client state.

## NumberGuess contract

All responses are no-store JSON. Owned game operations scope both user and Hub; foreign games return 404. Query selectors and extra body fields are rejected.

- `GET /api/arcade/games`: only NumberGuess is enabled.
- `POST /api/arcade/sessions`: `{gameId: "numberguess", clientSessionId: UUIDv4}`; identical creation IDs return the same game. At most five currently active games are allowed per owner (a request-time abuse bound).
- `GET /api/arcade/sessions/:id` and `GET /api/arcade/me/activity`: saved game and latest 20 owned games.
- `POST /api/arcade/sessions/:id/actions`: `{seq, guess}`. Integer guesses 1–100, ordered sequences 1–10, ten-minute immutable deadline. The crypto-random target is private; responses return only hints/history. Transactions serialize competing actions. Identical replay returns its original transition; a changed guess at that sequence conflicts. Wins/losses cannot be rewritten.
- `POST /api/arcade/sessions/:id/complete`: empty body only, reads an already-terminal result. No client score is accepted.

A winning action atomically saves its immutable completion envelope with the result. Loss/expiry emits no event. Core persists `arcade-numberguess-v1` on enabled startup: only `numberguess-v1` facts occurring after activation qualify. First successful NumberGuess per Asia/Kolkata day earns 5; further same-game wins receive a terminal zero receipt. Policy retains three distinct games/day and source cap 30 for future validators, but P7.1 enables only one game. No validated trace proves human play.

## Pending results and outages

A win remains saved if Core is down: the UI says Aura pending, never invents points. Delivery uses the saved envelope, a 4-second HTTP deadline, a database lease, and persisted exponential backoff from 30 seconds to one hour. Reads/actions may trigger a due retry. Lost replies repeat the same event ID and receive Core's canonical receipt. A read does not bypass backoff; users can reload later. There is no always-on worker or free-tier delivery guarantee.

For an operator with the separate reconcile key, call the **direct Arcade service**, not the public gateway:

- `GET /api/arcade/integration/pending-results` with `Authorization: Bearer <reconcile key>`: latest bounded pending diagnostics (maximum 20).
- `POST /api/arcade/integration/reconcile` with that header and `{}` JSON: attempts at most three due results. Honors leases/backoff. Browser Origin/Sec-Fetch-Site requests are denied.

Core validates retained access issuance and current membership. A revoked principal or event beyond the 30-day retention contract remains pending for operator review; reconciliation cannot fabricate a new identity/time to bypass rejection. `ARCADE_GAMES_ENABLED=false` stops new games while preserving saved reads/completions/recovery. `/health/live` checks the process; `/health/ready` checks only Arcade's own database. Stopping Arcade must leave Core usable. Free deployment configuration and quota limits are in [deployment](../deploy/README.md); hosted acceptance is separate from local acceptance.
