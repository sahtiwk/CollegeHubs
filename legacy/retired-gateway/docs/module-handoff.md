# Core-to-module handoff (P2.1)

This contract separates the existing Core HS256 browser credential (up to 24 hours) from a module's RS256 credential (at most 15 minutes). Module implementations ship in later phases. P2.1 supplies Core issuance/exchange, pure Node verification/state/CSRF/cookie helpers, the schema, and gated browser navigation. It does not add another account system or Core refresh sessions.

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

1. Core navigation uses a full-document link to `/<module>/auth/start`. The gateway must route that request to the module API, ahead of SPA fallbacks.
2. The module creates 32 random bytes encoded as 43 base64url characters. Store a hash and a 60-second expiry for this pending browser state; set its host-only `ch_<module>_state` cookie with Secure, HttpOnly, SameSite=Lax, Path=/<module>, Max-Age=60. Redirect to `/module-handoff?module=<name>&state=<state>&returnPath=<encoded allowed path>`. State is an anti-CSRF nonce, not an access credential; grants/JWTs never enter URLs.
3. The Core handoff screen uses its existing authenticated session to obtain a grant, then renders a native form containing only module, state and the opaque grant. Continue submits POST to the server-selected `/<module>/auth/callback`. No token is put into query parameters or browser module storage. If Core sign-in has expired, sign in once to Core, then restart from the module link.
4. The callback requires the exact gateway Origin and the state cookie matching the posted state. Validate pending-state expiry and atomically consume that pending state. Use `module-session.cjs.requireCallback` for the Origin/cookie comparison; it does not replace the module's pending-state storage/expiry/one-use enforcement. Clear the state cookie. Refuse a different body module and unexpected callback fields.
5. The module backend exchanges the grant using its own service credential. Core compares the hashed grant/state/module, checks expiry and current active user/Hub/college plus membership version, signs the bounded credential, and atomically consumes the grant. Concurrent exchanges yield at most one token response. A lost response requires a fresh handoff; never resend a consumed grant as a token refresh.
6. Verify the returned token locally with `module-token.cjs.verifyModuleToken(token,{module,issuer,publicKeys})`. Check that the theme's Hub ID/version match the verified claims and sanitize its allowlisted colors/logo before rendering. Never import Core models or query Core's database from a module.
7. Create a random opaque module session value. Store only its hash alongside the verified principal/JTI, sanitized theme, expiry and CSRF hash in the module's own session store. Its expiry MUST be no later than the RS256 expiry. Set host-only Secure/HttpOnly/SameSite=Lax cookie at the module path, using a remaining Max-Age bounded by that expiry. Never store the JWT in a browser-readable cookie, localStorage, SSR props, URL, or HTML. Redirect 303 immediately to Core's returned, independently allowlisted relative path. Clean URL contains neither grant nor state nor JWT.
8. Every module request checks session existence/expiry, current module audience/scope, non-null Hub and private resource ownership. GET `/<module>/api/session` returns only safe identity/theme/expiry and a CSRF token; never service credentials or the module JWT. Generate a CSRF token and store its hash server-side. Every mutation (including DELETE session) requires exact Origin and a matching `X-CSRF-Token`, using `requireMutation` after session authentication.
9. DELETE session deletes the server-side session and clears the exact cookie path. Expiry returns an explicit expired state and starts a new Core handoff; no second module login exists.

The default return-path allowlist is exactly `/arcade`, `/arcade/`, `/interview`, `/interview/`, `/learn`, `/learn/`, restricted to the chosen module. Queries, fragments, encoded paths, backslashes, protocol-relative/external URLs, and prefix lookalikes are refused. Future deep links require a reviewed allowlist update.

Cookie paths reduce accidental exposure; they are not a security boundary against same-origin XSS. Modules sharing the gateway must all avoid unsafe script injection. SameSite=Lax is compatible with this same-origin callback. Do not weaken cookies for deployment; localhost is only a manual fixture environment.

## Credential and principal rules

Service credentials live in Core's system-scoped `ServiceCredential` collection: null Hub, explicit module service, unique key ID/hash, status, eventTypes and allowedReadScopes. Token format is key ID (8-64 letters/digits/underscore/hyphen), a dot, then a cryptographically random 32-byte base64url secret. Core stores SHA-256 of the full credential; it never stores plaintext. Hash comparison is constant-time. Each module uses a separate key. HS Core tokens are not service credentials. New service credentials default to empty event/read scopes; reward ingestion and delegated reads are not implemented in P2.1.

The operator command `npm run provision:module-service` in `server/` reads a bounded JSON object from stdin: `{service,keyId,key,status}`. Supply it from a secret manager or protected local input, never command-line arguments/source control. Use a high-entropy generated secret; do not invent a memorable key. The command prints no key or database URI. Same key ID cannot be reassigned to another service. Rotate by provisioning another ID, updating the module backend, then disabling the old credential (status disabled). No browser-accessible credential-management route exists.

RS256 header is pinned to `alg=RS256,typ=JWT,kid=<configured ID>`; jku/x5u/jwk/extra headers are rejected. Claims follow `module-principal.schema.json`, with exact audience `collegehubs-<module>` and exactly one scope `module:<module>`. Runtime validation also enforces signature, issuer, non-null 24-hex subject/Hub, membership/theme versions, UUID JTI, `nbf=iat<=now<exp` and `0<exp-iat<=900`. Schema validation or JWT decoding alone never authenticates.

Core grant/state values are stored only as SHA-256 hashes. Unconsumed grants can be TTL-cleaned after their expiry; consumed bindings retain subject/Hub/module/JTI/access expiry and current theme version for 30 days for later event retry. TTL deletion timing never determines grant validity. Retention does not extend token validity.

Core rechecks current membership at grant and exchange time. An already-issued module session may remain valid until its at-most-15-minute expiry; Core logout does not remotely revoke it. Immediate remote module revocation is outside P2.1. Use synchronized server clocks. Keep old verification public keys configured until all their module sessions have expired, then remove them.

## Deployment and safe stop

The gateway routes `/api/*` to Core, then each module's auth/API paths to that backend, before UI/SPA fallbacks. Preserve /arcade and /learn prefixes; translate Interview externally prefixed paths to its backend's eventual /auth and /api paths as specified by the plan. Avoid callback/request-body/header logging and use Cache-Control: no-store on handoff/callback/session responses. Core HTML uses Referrer-Policy: strict-origin (also set this at the gateway): only the origin can enter Referer, never a path/state/grant. Do not set no-referrer on the form-originating page: the Fetch Standard makes the Origin header null for native form POSTs under that policy, conflicting with mandatory exact-Origin validation. Callback/session responses may use no-referrer. See https://fetch.spec.whatwg.org/#append-a-request-origin-header.

P2.1 does not deploy a module backend or enable real modules. With no module keys or release flags, Core feed/profile/ranking remain usable. Enabled-but-unavailable module navigation can fail independently; returning to Core still works. Resume module sessions/handoff routing during the owning module phases.

G1/G2 are the only automated guards added/extended. Manual verification uses an isolated module callback stub and disposable RSA/service credentials; do not activate a real college or expose a service key to run it.
