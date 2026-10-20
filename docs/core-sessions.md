# Core sessions (TP2.1)

Implemented behind `CORE_SESSION_ENABLED=true`. TP2.2 now supplies the memory-only browser, bootstrap/renewal and server logout; see [browser session recovery](browser-session-recovery.md). Deploy that browser with session mode enabled consistently across Core instances. This change does not enable the flag or deploy services.

## Lifecycle

Registration, password login and Google login create an AuthSession when enabled. Access JWTs include `sid` and `sessionVersion` and last at most 900 seconds (`CORE_ACCESS_TTL_SECONDS` may shorten this). Verification, assignment retry and Google linking retain that session while issuing updated membership claims. Every authenticated HTTP request and realtime authorization checks the session row, user session version, expiry and disabled status. Existing membership-version checks remain. Logout rejects subsequent authorization with old access immediately; operations already authorized may finish. Realtime recipient checks reject revoked sessions before sending subsequent data; socket reconnect/renewal belongs to TP2.2.

Refresh credentials are opaque to clients: session selector, monotonic generation and a domain-separated HMAC using the Core signing secret. Only the SHA-256 digest of the current credential is stored. A valid signed obsolete generation proves replay without retaining an ever-growing token history. Invalid signatures never revoke a family. Keep JWT_SECRET private and identical across Core instances; rotating it invalidates access, refresh and CSRF proofs.

The family expires absolutely after seven days, with a one-day idle deadline and at most 10,000 rotations. Rotation never extends the absolute deadline. Each family uses one fixed-size document; the absolute-expiry TTL index eventually removes it, but authorization always checks both deadlines without waiting for TTL cleanup. Auth abuse limits are TP2.2; a deployment should not enable this mode before that work.

## Browser/gateway contract

All routes below are `/api/auth/...`, return `Cache-Control: no-store`, and require an exact configured `Origin`, including the read bootstrap route. No missing-Origin exemption is made for session endpoints. Cookie-authorized writes additionally require `X-Core-CSRF`; bearer-authorized identity mutations remain bearer protected and require Origin in session mode. Login/register/Google login require Origin before their handlers run.

| Route | Success | Authorization |
| --- | --- | --- |
| `GET csrf` | 200 `{csrfToken}` | Current refresh cookie plus exact Origin; bootstrap after reload |
| `POST refresh` | 200 `{token,user,csrfToken}` and rotated cookie | Current refresh cookie, exact Origin, CSRF |
| `POST logout` | 204 and expired cookie | Current refresh cookie, exact Origin, CSRF; revokes this family |
| `POST logout-all` | 204 and expired cookie | Same; increments user sessionVersion and revokes user families |

Login responses expose `X-Core-CSRF`; this is a CSRF proof, not the refresh secret. Bootstrap can retrieve it after reload. The refresh cookie is `ch_core_refresh`, HttpOnly, Secure, SameSite=Strict, Path=/api, host-only (no Domain), with absolute family expiry. Secure is omitted only for test/development when every configured origin is HTTP localhost/127.0.0.1. Production must use same-origin HTTPS gateway access.

The Pages gateway and Vite development/preview gateway share `proxyApi`: only `ch_core_refresh`, Core bearer and `X-Core-CSRF` go to Core. Each module receives only its own state/session cookies and its own `X-CSRF-Token`, never Core cookies/bearer/CSRF. Response cookies are filtered by the same ownership allowlist, and Core CSRF response headers are never passed from modules. Vite already preserves individual Set-Cookie headers; no separate proxy implementation was added.

## Races and errors

Atomic compare-and-swap rotation allows exactly one response to issue a successor. The immediately previous generation receives **409 CORE_REFRESH_CONCURRENT**, Retry-After: 1, for five seconds after the committed rotation. It receives no token and no Set-Cookie, so a late response cannot overwrite the winner. The grace period never extends with reuse. Older generations, or previous-generation reuse after grace, revoke the family with **401 CORE_REFRESH_REPLAY**. Clients must coordinate renewal across tabs and retry with the browser's winning cookie, not a saved credential. A lost winning response may require sign-in again; there is deliberately no reusable old-token recovery path.

Other lifecycle responses: **401 CORE_SESSION_INVALID** for absent/duplicate/malformed/forged cookie; **401 CORE_SESSION_REVOKED** for missing, expired, revoked, disabled or version-invalid family; **401 CORE_SESSION_EXHAUSTED** for the rotation cap; **403 CORE_ORIGIN_REQUIRED**, **403 CORE_CSRF_REQUIRED**; **404 CORE_SESSIONS_DISABLED** while off; **503 CORE_SESSION_UNAVAILABLE** for store failures. The outer application may return its existing generic Origin denial first for foreign origins. Invalid/replayed requests do not clear cookies, avoiding late-response cookie clobber. Repeat logout after revocation is 401; the client should still clear its local state. Access middleware retains existing 401 responses for expired JWTs, retired legacy JWTs and changed membership.

Refresh re-reads current membership and may issue an onboarding token following a cutover; it never restores prior membership. Disabled accounts cannot refresh. Module sessions retain their independent maximum lifetime (15 minutes); Core logout does not retroactively erase them. Keep ModuleGrant and domain-fact receipt bindings so valid pending outcomes can settle under the existing membership rules.

## Migration and deliberate cutover

1. Back up retained stores using the TP0.2 procedure. Dry-run/apply `0003_core_sessions` with the existing migration CLI and explicit database confirmation. It only backfills missing user sessionVersion=0; it does not change IDs, membership, content or ModuleGrant. Startup creates AuthSession and its indexes before listening.
2. Ship server/gateway support with the flag off. Complete TP2.2 browser memory-only storage, bootstrap, cross-tab renewal, server logout, draft recovery and abuse limits.
3. At the announced cutover, deploy the compatible browser and set the flag true consistently on every Core instance. All legacy JWTs without sid are rejected immediately, even if their exp remains in the future. Users sign in again. Do not leave mixed-mode instances serving traffic.
4. Keep the flag true after cutover. Turning it off would restore legacy-token acceptance; it is not a safe rollback. If rollback is essential, rotate the signing secret across all instances to retire old authority and require fresh sign-in, or restore a session-capable build with the flag still true. Preserve pending module bindings and follow their drain policy.

## Validation

`npm run test:sessions` runs a real Mongo replica set and HTTP Core behind the actual gateway function. It covers cookie flags, origin/CSRF bootstrap, retired bearer rejection, concurrent refresh vs delayed replay, forged proofs, expiry, individual/all-session revocation, membership changes and all three module cookie boundaries. Existing TP1.2 onboarding tests also run successfully with session mode enabled, exercising verification/email replacement and Google link reissuance. Google credentials there are synthetic verified payloads, not a live provider check.

Local validation on 2026-10-19: 6 session checks passed; 118 existing integration guards passed with no skips; 9 migration/restore checks passed; 10 identity checks passed in legacy-compatible mode and 5 onboarding checks passed with session mode enabled. Core syntax validation and the web production build passed. Hosted gateway deployment and live Google-provider verification were not performed.
