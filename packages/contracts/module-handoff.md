# Core-to-module handoff (P2.1 security, P3.2 JSON transport)

This contract separates the Core HS256 browser credential (up to 24 hours) from a module's RS256 credential (at most 15 minutes). P2.1 supplies issuance/exchange and verification; P3.2 adds Learn's real JSON/PostgreSQL adapter and SPA bootstrap. Full module journeys ship later. No second account system or Core refresh session is added.

## Routes and configuration

Core exposes:
- `GET /api/auth/modules`: current active Hub required; public module labels, release flags and relative start paths.
- `POST /api/auth/module-grants`: Core Bearer credential, current active Hub, and exact `Origin: APP_ORIGIN`. JSON is exactly `{module,state,returnPath}`. Returns 201 `{grant,expiresAt,callbackPath}`.
- `POST /api/auth/module-grants/exchange`: server-to-server `Authorization: Bearer <keyId>.<secret>`, no Origin header. JSON is exactly `{module,grant,state}`. Returns `{token,tokenType,expiresAt,returnPath,theme}`. Never expose this response to the browser.

All responses are no-store. Invalid service authentication is 401; service/module mismatch or changed membership 403; expired/used/mismatched grant 409; rate limiting 429 with Retry-After; disabled modules/dependencies 503. New route errors use `{error:{code,message,retryable}}`; inherited Core authentication/membership middleware retains its earlier error shape.

`ENABLE_MODULES` is an explicit comma-separated subset of `arcade,interview,learn`; empty/false keeps all links unavailable and requires no RSA configuration. Enabling a module is an operator release gate: do so only after its backend callback/session implementation and gateway paths are deployed. Core does not probe optional module availability on ordinary feed requests.

Enabled configuration:
- `APP_ORIGIN`: exact gateway origin, also included in ALLOWED_ORIGINS; HTTPS in production. Localhost HTTP is accepted only outside production.
- `CORE_MODULE_PRIVATE_KEY`: server-only RSA PEM (at least 2048 bits), literal or escaped newlines.
- `CORE_MODULE_KEY_ID`: active pinned signing key ID.
- `CORE_MODULE_PUBLIC_KEYS`: JSON map from allowed key IDs to public SPKI PEM strings, including the matching active key.
- `CORE_TOKEN_ISSUER`: same configured issuer as Core.
- `MODULE_ACCESS_TTL_SECONDS`: 1-900, default 900.
- `MODULE_GRANT_TTL_SECONDS`: 1-60, default 60.
- `CORE_GRANT_BINDING_RETENTION_DAYS`: exactly 30 in this phase.

No keys are generated at application startup. Production key generation/storage and module deployment stay operator tasks. No public key URL is accepted from a JWT.

## Browser and module sequence

1. A shared React Router link opens `/<module>` inside the persistent Core shell. No document redirect, iframe, form handoff or separate UI runtime is used.
2. Warm only the opened service with `GET /api/<module>/health/ready` before starting the short grant lifetime. Learn allows a bounded 75-second warmup; show retry on failure, never an endless keepalive.
3. `POST /api/learn/auth/start` requires exact Origin and returns JSON `{state,expiresIn}`. SQL stores only the hash with a 60-second expiry. Its host-only state cookie is HttpOnly/SameSite=Lax, `Path=/api/learn`, Max-Age=60 and Secure on HTTPS/production.
4. Core-authenticated JSON `POST /api/auth/module-grants` carries `{module,state,returnPath}`. Only the opaque grant returns to browser memory; the callback path is `/api/<module>/auth/callback`. Credentials/state never enter URLs or browser storage.
5. JSON `POST /api/learn/auth/callback` carries exactly `{module,state,grant}` with the state cookie and exact Origin. Learn atomically burns unexpired state, then calls Core's service-authenticated exchange. Failed/lost exchange requires new state and grant. It verifies RS256/audience/issuer/expiry/subject/Hub/theme and stores an opaque session hash, principal, theme, CSRF hash and bounded expiry in its own PostgreSQL. No Core DB import or module JWT in the browser.
6. Callback JSON `{ready:true}` sets a host-only session cookie at `/api/learn` and expires the state cookie. No redirect. `GET /api/learn/session` exposes userId, hubId, membershipVersion, username, college, sanitized theme, expiry and CSRF token. Frontend compares Core user/Hub/membership before rendering.
7. Every protected API reloads the scoped SQL session and expiry. Query selectors are rejected; resource ownership cannot come from caller IDs. `POST /api/learn/logout` requires exact Origin and `X-CSRF-Token`, deletes that session and clears the exact cookie paths. Foreign/missing/expired sessions fail closed.
8. The SPA clears its in-memory cache/inflight work on Core session/storage changes, rejects late results after account switch, and best-effort posts logout using its CSRF token. Module expiry offers in-place reconnect. Network-failed logout is bounded by the 15-minute server expiry; no immediate global revocation claim is made.

The default return-path allowlist is exactly `/arcade`, `/arcade/`, `/interview`, `/interview/`, `/learn`, `/learn/`, restricted to the chosen module. Queries, fragments, encoded paths, backslashes, protocol-relative/external URLs, and prefix lookalikes are refused. Future deep links require a reviewed allowlist update.

Cookie paths reduce accidental exposure; they are not a security boundary against same-origin XSS. Modules sharing the gateway must all avoid unsafe script injection. SameSite=Lax is compatible with this same-origin callback. Secure is mandatory on HTTPS and in production. Only explicitly validated nonproduction localhost HTTP omits Secure.

## Credential and principal rules

Service credentials live in Core's system-scoped `ServiceCredential` collection: null Hub, explicit module service, unique key ID/hash, status, eventTypes and allowedReadScopes. Token format is key ID (8-64 letters/digits/underscore/hyphen), a dot, then a cryptographically random 32-byte base64url secret. Core stores SHA-256 of the full credential; it never stores plaintext. Hash comparison is constant-time. Each module uses a separate key. HS Core tokens are not service credentials. New service credentials default to empty event/read scopes; reward ingestion and delegated reads are not implemented in P2.1.

The operator command `npm run provision:module-service -w @collegehubs/core` at the repo root reads a bounded JSON object from stdin: `{service,keyId,key,status}`. Supply it from a secret manager or protected local input, never command-line arguments/source control. Use a high-entropy generated secret; do not invent a memorable key. The command prints no key or database URI. Same key ID cannot be reassigned to another service. Rotate by provisioning another ID, updating the module backend, then disabling the old credential (status disabled). No browser-accessible credential-management route exists.

RS256 header is pinned to `alg=RS256,typ=JWT,kid=<configured ID>`; jku/x5u/jwk/extra headers are rejected. Claims follow `module-principal.schema.json`, with exact audience `collegehubs-<module>` and exactly one scope `module:<module>`. Runtime validation also enforces signature, issuer, non-null 24-hex subject/Hub, membership/theme versions, UUID JTI, `nbf=iat<=now<exp` and `0<exp-iat<=900`. Schema validation or JWT decoding alone never authenticates.

Core grant/state values are stored only as SHA-256 hashes. Unconsumed grants can be TTL-cleaned after their expiry; consumed bindings retain subject/Hub/module/JTI/access expiry and current theme version for 30 days for later event retry. TTL deletion timing never determines grant validity. Retention does not extend token validity.

Core rechecks current membership at grant and exchange time. An already-issued module session may remain valid until its at-most-15-minute expiry; Core logout attempts module logout, but an offline/failed attempt does not remotely revoke it. Immediate remote module revocation is outside P2.1. Use synchronized server clocks. Keep old verification public keys configured until all their module sessions have expired, then remove them.

## Deployment and safe stop

Gateway precedence: `/api/learn/*`, `/api/arcade/*`, `/api/interview/*` to their independent APIs, preserving the full prefix; remaining `/api/*` to Core. All UI routes and static assets belong to the shared SPA. API misses never fall back to HTML. Preserve method/body/Origin/CSRF/Set-Cookie; strip Core Authorization on module requests and reject upstream redirects. Do not log private headers or bodies. Use HTTPS and no-store session/API responses.

Core remains usable with modules disabled or unavailable. Learn's JSON/session/graph adapter exists in P3.2; Arcade and Interview remain gated until their own phases. Ordinary Core readiness never probes a module. Hosted validation remains separate from local code/configuration. See `docs/learn-spike.md` and `deploy/README.md` for current acceptance and operator steps.
