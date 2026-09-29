# CollegeHubs Core API

Run `npm install`, copy `.env.example` to `.env`, configure the values below, then run `npm run dev` (or `npm start`). Keep secrets out of source control. The legacy seed command is disabled; ordinary setup never deletes or seeds data.

## Configuration

- `MONGO_URI`: your MongoDB connection string.
- `JWT_SECRET`: required, high-entropy server-only signing secret; generate it securely. Missing or blank values stop startup before connecting or listening.
- `ALLOWED_ORIGINS`: required comma-separated exact frontend origins, such as `http://localhost:5173`. No wildcard, trailing slash, path, or implicit development fallback. Requests with other Origin headers receive 403; requests without Origin still require route authentication.
- `PORT`: defaults to 5000.
- `CORE_TOKEN_ISSUER`: defaults to `collegehubs-core`.
- `CORE_ACCESS_AUDIENCE`: defaults to `collegehubs-core-api`.
- `CORE_ACCESS_TTL_SECONDS`: integer from 1 to 86400; defaults to 86400 (24 hours).
- `GOOGLE_CLIENT_ID`: optional for password login; required for Google login, matching the UI's `VITE_GOOGLE_CLIENT_ID`.

Examples contain names only. Configure real origins and secrets locally and in the deployment console.

## P0.1 behavior

Core signs and verifies HS256 JWTs with pinned issuer/audience and an expiry. Existing tokens without these claims require sign-in again. Protected requests use `Authorization: Bearer <token>` and reload the current user. The browser keeps the existing localStorage approach, clears cached identity on expiry/401/logout, and exposes Sign out in the profile sidebar. Logout is local: a copied token remains usable until expiry. There is no refresh-token or server revocation subsystem.

Registration normalizes email, permits usernames of 3-50 letters/numbers/dots/underscores/hyphens, and accepts passwords of at least 8 characters and at most 72 UTF-8 bytes. Bcrypt cost 12 remains in the model save hook. Login retains compatibility with shorter existing passwords. Auth/profile inputs reject objects and arrays where strings are required. JSON bodies are limited to 64 KiB.

`PUT /api/users/:username` requires the authenticated owner and updates by their database ID. `PUT /api/users/onboarding` also updates only the authenticated user. Both allowlist and bound profile fields and run model validators; identity, reward and verification fields cannot be submitted. `GET /api/users/:username` requires authentication; email and onboarding state are returned only for the owner. Public leaderboard/post author responses contain no email or password.

Google sign-in now accepts `{credential}` containing a Google ID token from the frontend GoogleLogin callback. The installed Google library verifies signature, issuer, audience and expiry; Core also requires a stable subject and verified-email claim. Identity is stored in private `googleSubject`, with no password for OAuth-only accounts. Google is authoritative for Gmail or a matching hosted Workspace domain; other third-party email claims do not receive `membershipVerified=true`. There is no silent email merge or email/domain transfer. Legacy P0.1 Google accounts need a deliberate linking path; no backfill is performed. See [Google's verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

`POST /api/users/:username/refresh` and `POST /api/google/calendar` return 410 without provider calls or writes. Their UI controls are disabled. Feed behavior remains available. Hub isolation is implemented through P1.2; ledger scoring remains a later phase. P0.2 now awaits the database before listening and exposes `/health/live` and `/health/ready`; `/api/health` aliases readiness and returns 503 when the Core database is unavailable.

Verification and limitations are recorded in [P0.1 evidence](../docs/p0.1-evidence.md).

## P0.2 development and reset

See [development instructions](../docs/development.md) for independent package roots/ports, readiness behavior, and the manually confirmed demo reset. `npm run seed` refuses. `npm run reset:demo` requires `NODE_ENV=development` or `test`, `DEMO_RESET_ENABLED=true`, an exact `DEMO_DB_NAME_ALLOWLIST`, a matching URI/database/confirmation, and `--disposable-data-only`. Use `--dry-run` first. Never reset real data or a running app. Hub seeds now follow the confirmed registry; problem/calendar seeds remain later phases.

## P1.1 Hub identity

Run `npm run provision:hubs` against the intended Core database before accepting signups. A MongoDB replica set (including Atlas) is required for Hub/channel/user transactions. Review `config/colleges.seed.json` first: real entries are **draft/inactive** until the developer confirms the exact college domain and records `verifiedAt` and `evidenceRef`. The source file owns registry/domain/channel/palette configuration; there is no student-controlled college assignment.

An active exact normalized domain maps to one Hub with DSA, Web Development, Machine Learning and Competitive Programming channels. Password registration sets membershipVerified=false/domain-claim; trusted Google identity sets true/google. Unknown domains remain unassigned with an onboarding-only token. Failure during provisioning rolls back Hub/channels/assignment and returns a retryable onboarding state.

- `GET /api/me`: current self DTO and current authorized Hub list.
- `PATCH /api/me`: allowlisted profile fields only.
- `POST /api/me/assignment/retry`: empty JSON object; uses stored email, returns updated user, assignment state and replacement token.
- Core tokens now contain sub, hubId, scope, membershipVersion and jti as well as pinned issuer/audience/expiry. Sign in again after this update. Current membership is rechecked; old membership-version tokens are rejected.
- Missing/disabled Hub membership cannot read tenant routes. Basic feed/profile/leaderboard/like filters use the authorized Hub; private profile mutation still requires the owner. P1.2 adds the pagination/theme/mobile shell documented below.

Run `npm run test:guards` from `server/`, or `node --test tests/guards/hub-isolation.test.js` from the root. G1 uses isolated in-process fixtures; no DB or provider credentials are needed. See [P1.1 evidence](../docs/p1.1-evidence.md) for separate real local MongoDB transaction verification and remaining deployment steps.

## P1.2 scoped presentation and pagination

All API responses use `Cache-Control: no-store`. Each protected route reloads current membership before reading data. The server applies the Hub filter before population, sorting, or limits.

- `GET /api/me/hub` and `GET /api/hubs/:hubId/theme`: authorized Hub name, ID, timezone, theme version, sanitized `tokens`, and optional approved HTTPS `logoUrl`. Private registry domains/evidence are never included. A foreign Hub is 403.
- `GET /api/hubs/:hubId/channels`: `{items}` with public channel fields only; archived/foreign channels excluded. These are discovery endpoints, not chat delivery.
- `GET /api/posts?limit=20&cursor=...`: `{items,nextCursor}`, ordered by creation time descending, ID ascending for ties. Limit is 1-50. Cursors are HMAC-signed and bound to Hub and resource; invalid, foreign, or altered cursors return 400 without data.
- `PUT /api/posts/:id/like` adds the current user once; `DELETE` removes them. Both are atomic and idempotent. Missing/foreign post IDs return 404. PUT no longer toggles.
- `GET /api/users/leaderboard?limit=50&cursor=...`: `{items,nextCursor,ownRank}`. Every item includes its server-calculated rank. `ownRank` contains `rank` and `auraPoints`, including when the caller is outside the first 50. Active college members only; Aura descending, ID ascending for ties. No global/city/client-label filtering.
- Post text is bounded at 8 KiB UTF-8. Post author population uses active membership in the same Hub and a public projection; invalid legacy authors become null.

Configure branding in `config/colleges.seed.json`. All 11 theme tokens must be six-digit hex values. Optional logos must use HTTPS on an exact origin in `assetOrigins` (empty by default). Unsafe stored branding falls back to the generic configured palette and no logo. Names render as plain React text. Increment `themeVersion` whenever name, logo, or palette changes; provisioning refuses changed branding without a version increase, syncs Hub metadata, and preserves IDs/channel sequence counters. No theme-write or college-selection endpoint is exposed to students.

P1.2 adds no environment variable. The existing names-only examples remain sufficient. See [P1.2 evidence](../docs/p1.2-evidence.md).

## P2.1 one-use module handoff

`GET /api/auth/modules` exposes gated navigation metadata to current Hub members. `POST /api/auth/module-grants` requires current Core authentication, active Hub membership and exact APP_ORIGIN; it accepts only module/state/relative returnPath. `POST /api/auth/module-grants/exchange` requires a module-specific service Bearer credential and no browser Origin. Grant/state are hashed, valid for at most 60 seconds, and consumed atomically. Exchange rechecks current membership and returns a locally verifiable RS256 module token, sanitized theme and allowlisted return path. Access expires within 15 minutes; the subject/Hub/JTI binding persists for 30 days for later event retries.

Leave `ENABLE_MODULES` empty until module backends are released. To enable a module, explicitly list its name (arcade/interview/learn) and configure APP_ORIGIN, CORE_MODULE_PRIVATE_KEY, CORE_MODULE_KEY_ID, CORE_MODULE_PUBLIC_KEYS, and the optional bounded lifetime names in `.env.example`. Public keys are an allowlisted JSON kid-to-public-PEM map. Production APP_ORIGIN must be HTTPS. No RSA key is generated at startup, and no module key belongs in Vite configuration. Missing/invalid enabled configuration fails startup; disabled configuration does not require keys.

`npm run provision:module-service` reads `{service,keyId,key,status}` JSON from stdin using the intended MONGO_URI. Supply high-entropy key material through protected input; never arguments or source files. Key format is `<keyId>.<32 random bytes in base64url>`; only its SHA-256 hash is saved. Event/read scopes default empty. The same key ID cannot switch services. See the [complete contract](../packages/contracts/module-handoff.md) for provisioning, rotation, strict-origin referrer policy, cookie/CSRF, gateway routing and revocation limits.

Single-instance in-memory limits are 10 grants/minute/user and 120 exchanges/minute/service key, with Retry-After. New indexes are ready before accepting requests. Demo reset now deletes module grants and preserves servicecredentials as operator configuration; all existing reset safety checks remain. Do not use reset to rotate/revoke service credentials.

Run `npm run test:guards` for G1 and G2. [P2.1 evidence](../docs/p2.1-evidence.md) includes real isolated MongoDB concurrency and a manual browser callback stub; real module apps and production credentials remain later activation work.

## P2.2 Aura receipts and recovery

`POST /api/aura/events` accepts only an active source/type-scoped service credential and typed domain facts. Core user JWTs, browser requests, reward fields, foreign/stale issuance bindings and unsupported types fail closed. Mongo transactions atomically store immutable receipt/business identity, balance, day counter and qualifying activity. Replay returns the original receipt; altered IDs conflict; capped zero receipts are terminal. Requests are capped at 64 KiB and 120/minute/service key. No client can choose weights or rule versions.

Normal startup deliberately has no active scoring rules and valid authorized events receive retryable `503 AURA_RULES_INACTIVE`. Test composition injects only `fixture-*` rules. P6 will activate the versioned rules and native scoring/reads; real module result adapters follow in P7/P8/P9. No live external bonus, worker, outbox or periodic coordinator is introduced. Existing UI totals are unchanged.

Four new models are indexed before listening and included in guarded disposable demo reset: AuraEvent, AuraBalance, AuraDayCounter, DailyActivity. Service credentials remain preserved. See [reconciliation](../packages/contracts/reconciliation.md) for exact fields/errors and future module recovery routes. There are no new runtime environment variables; GUARD_MONGO_URI belongs only to the guard runner and is never read by Core startup. Full G3 transaction verification needs an explicitly supplied local replica set; absent it, the guard prints a skip rather than pretending it tested transactions.
