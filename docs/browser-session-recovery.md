# Browser session recovery (TP2.2)

Implemented locally on 2026-10-19. The browser now requires Core session mode (`CORE_SESSION_ENABLED=true`); it never falls back to storing a bearer. Deploy it with the TP2.1 server/gateway cutover. The local `npm run dev` launcher defaults to session mode, while honoring an explicit environment/Core .env override. Production configuration is not changed by this implementation.

## Credential lifecycle

Access tokens, user DTOs and CSRF proofs live only in module memory. Startup deletes the three legacy localStorage keys (`socialstream_token`, `socialstream_user`, `user`). Bootstrap uses Origin-checked `POST /api/auth/csrf`, then `POST /api/auth/refresh`; POST is necessary because browsers need not send Origin on same-origin GET. The earlier GET bootstrap contract remains accepted for clients which supply Origin.

Renewal runs 30 seconds before expiry, before protected requests when needed, on focus, and once after a current-session 401. A single in-tab promise coalesces concurrent requests. Web Locks serialize refresh, sign-in and logout across tabs. Each tab renews its own in-memory token once; credentials are never broadcast or persisted. Without Web Locks, a losing rotation receives 409 and retries at one-second intervals, at most twice, using the browser's current cookie. A missing winning cookie can require reauthentication, as documented in TP2.1.

The only localStorage session entry is `ch_session_boundary`, a random coordination marker with an in/out state, containing no token or account information. Login, verification identity updates and logout update it. Other tabs cancel stale work and bootstrap, or clear immediately on logout. Generation checks prevent a late refresh from restoring a signed-out session. API responses and module coordinator work are bound to account, Hub, membership version and family ID, so an earlier account's late response is discarded. Ordinary token renewal keeps this identity stable and does not reset module sessions or editors.

Expired/revoked refresh clears the local identity. Temporary network/server failures retain the current UI and drafts, retry renewal after 15 seconds, and expose a retry screen when initial bootstrap cannot finish. A 401 may retry a GET/HEAD once; writes are never automatically replayed. Explicit message/Study retry keeps the original message ID, expected revision, content and other body fields.

Realtime sockets read the current memory token on each connection and reconnect when it changes. Channel and Study hooks rejoin and reload acknowledged state after reconnect or renewal. Core already disconnects at access expiry and revalidates senders/recipients; session revocation checks added in TP2.1 remain in force.

## Saved work and logout

Message/answer drafts, pending send IDs, Study source/language/base revision/pending save, room creation IDs and profile edits are retained in this tab's sessionStorage for up to 24 hours since their last edit. Entries are scoped by account, Hub and resource, capped at 30 entries and 150,000 serialized characters each. No credentials are stored. Browser storage denial/quota can prevent recovery, but does not prevent editing. Closing the tab normally removes this storage. A different account cannot load another account's draft. Signing in as the original account can recover it. These are local recovery copies, not server acknowledgements.

A changed Study revision preserves local text and requires explicit conflict resolution. Recovery does not extend a room deadline or permit changes to sealed work. A pending write is retried only on explicit action, with its original ID/revision. Successful saves clear their recovery record.

Logout clears Core memory and module coordinator state immediately in all tabs. Core and each initialized module receive best-effort remote logout requests; unavailable services cannot delay local sign-out. The out marker suppresses bootstrap from a cookie whose remote logout failed. Module sessions have an independent maximum lifetime of 15 minutes. Closing/navigation can interrupt best-effort network cleanup. Core refresh expiry/revocation, module lifetime and current-membership reward checks remain the server-side bounds; logout does not delete ModuleGrant or pending receipt bindings.

## Abuse limits

The new Core middleware runs before browser auth/session routes. Rejections use 429 `AUTH_RATE_LIMIT`, a generic message, `retryable:true` and a positive Retry-After. Store failure for a persisted budget returns 503 `AUTH_LIMIT_UNAVAILABLE` without admitting the request.

| Attempt group | Per process / source IP budget |
| --- | --- |
| Password login | 120 / 10 minutes |
| Register | 60 / hour |
| Google login/link | 60 / 10 minutes |
| Verification/email change | 60 / 10 minutes |
| CSRF bootstrap/refresh | 300 / minute |
| Module grant issuance | 120 / minute, plus existing authenticated per-user limit |

Password login also has a persisted 20-attempt/15-minute fixed-window budget keyed by an HMAC of normalized email and window. It applies equally to existing and unknown accounts, before password/account lookup, and is not cleared by success. Google linking has the same persisted budget keyed by the verified Core subject. AuthThrottle stores only digest/count/expiry, with TTL cleanup. Existing verification account cooldowns (60 seconds between mail requests, five/hour) and challenge attempt limits remain. The existing module-grant per-user/service budgets remain.

In-memory IP buckets expire and are capped at 10,000; a full map fails closed with 429. Process restart resets those buckets, and multiple instances have separate IP counts. Persisted account budgets survive restart. Core deliberately does not trust caller-supplied forwarding headers. Behind Pages or another shared proxy, the coarse IP bucket may group several users: configure upstream per-client rate limits and size deployment capacity before rollout. This implementation does not claim globally distributed IP enforcement or Cloudflare rule deployment. Fixed-window account budgets permit a boundary burst and can be used to temporarily deny attempts against a known address; the short cooldown and uniform response bound that tradeoff.

## Reproduction and evidence

`npm run test:sessions` exercises real gateway/Core rotation, expiry, membership/session revocation, uniform login cooldowns and bounded IP state. `tests/identity/renewal-browser.cjs` runs against the disposable integration fixture with `CORE_SESSION_ENABLED=true` and a Playwright installation. It checks reload bootstrap, absence of persistent credentials, eight concurrent requests in each of two tabs coalescing to one renewal per tab, cross-tab logout, reauthentication/draft recovery, exact message ID and Study revision reuse, renewal during module handoff and disposal of previous-account optional responses. Browser write-expiry cases inject a 401 at the gateway boundary; the separate server suite tests real JWT expiry. Existing integration guards test real socket expiry and membership revocation.

The existing onboarding browser and synthetic Google-link browser fixtures now bootstrap through the memory/cookie contract rather than seeding localStorage tokens. The Google test remains a synthetic provider fixture, not a live Google sign-in check.

Validation on 2026-10-19: all 126 integration guards passed with no skips (including eight session/abuse checks); all five workspace builds passed. The renewal browser suite, existing onboarding browser suite, synthetic Google-link browser suite, and five server onboarding tests with session mode enabled passed. The web build was checked again after the final storage fallback change. No hosted rollout or live Google verification was performed.
