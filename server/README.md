# SocialStream Core API

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

`POST /api/users/:username/refresh` and `POST /api/google/calendar` return 410 without provider calls or writes. Their UI controls are disabled. Feed behavior remains available. Hub isolation and ledger scoring remain later phases. P0.2 now awaits the database before listening and exposes `/health/live` and `/health/ready`; `/api/health` aliases readiness and returns 503 when the Core database is unavailable.

Verification and limitations are recorded in [P0.1 evidence](../docs/p0.1-evidence.md).

## P0.2 development and reset

See [development instructions](../docs/development.md) for independent package roots/ports, readiness behavior, and the manually confirmed demo reset. `npm run seed` refuses. `npm run reset:demo` requires `NODE_ENV=development` or `test`, `DEMO_RESET_ENABLED=true`, an exact `DEMO_DB_NAME_ALLOWLIST`, a matching URI/database/confirmation, and `--disposable-data-only`. Use `--dry-run` first. Never reset real data or a running app. No Hub/problem/calendar seeds exist yet.

## P1.1 Hub identity

Run `npm run provision:hubs` against the intended Core database before accepting signups. A MongoDB replica set (including Atlas) is required for Hub/channel/user transactions. Review `config/colleges.seed.json` first: real entries are **draft/inactive** until the developer confirms the exact college domain and records `verifiedAt` and `evidenceRef`. The source file owns registry/domain/channel/palette configuration; there is no student-controlled college assignment.

An active exact normalized domain maps to one Hub with DSA, Web Development, Machine Learning and Competitive Programming channels. Password registration sets membershipVerified=false/domain-claim; trusted Google identity sets true/google. Unknown domains remain unassigned with an onboarding-only token. Failure during provisioning rolls back Hub/channels/assignment and returns a retryable onboarding state.

- `GET /api/me`: current self DTO and current authorized Hub list.
- `PATCH /api/me`: allowlisted profile fields only.
- `POST /api/me/assignment/retry`: empty JSON object; uses stored email, returns updated user, assignment state and replacement token.
- Core tokens now contain sub, hubId, scope, membershipVersion and jti as well as pinned issuer/audience/expiry. Sign in again after this update. Current membership is rechecked; old membership-version tokens are rejected.
- Missing/disabled Hub membership cannot read tenant routes. Basic feed/profile/leaderboard/like filters use the authorized Hub; private profile mutation still requires the owner. Full pagination/theme/mobile shell remains P1.2.

Run `npm run test:guards` from `server/`, or `node --test tests/guards/hub-isolation.test.js` from the root. G1 uses isolated in-process fixtures; no DB or provider credentials are needed. See [P1.1 evidence](../docs/p1.1-evidence.md) for separate real local MongoDB transaction verification and remaining deployment steps.
