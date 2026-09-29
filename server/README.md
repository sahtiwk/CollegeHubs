# SocialStream Core API

Run `npm install`, copy `.env.example` to `.env`, configure the values below, then run `npm run dev` (or `npm start`). Keep secrets out of source control. P0.1 does not run or change the legacy seed command.

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

Google access tokens are checked through `getTokenInfo`, then checked for the configured audience, verified email, subject and expiry. Accounts are identified by a private, unique sparse `googleId`. An email collision with a password/legacy Google account returns 409; there is no automatic linking or migration in P0.1. New Google users get a randomized username suffix and a cryptographically random, bcrypt-hashed schema password that is never disclosed. See the [Google library documentation](https://github.com/googleapis/google-auth-library-nodejs#checking-access_token-information).

`POST /api/users/:username/refresh` and `POST /api/google/calendar` return 410 without provider calls or writes. Their UI controls are disabled. Feed behavior remains available. Hub isolation, readiness, demo reset and other phases are not implemented here; `/api/health` remains the legacy process response and does not establish DB readiness.

Verification and limitations are recorded in [P0.1 evidence](../docs/p0.1-evidence.md).
