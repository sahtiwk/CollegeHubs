# P10.2 — owned module progress

Core `GET /api/me/module-progress` is authenticated and checks current active membership before reading and again before returning. Its response is `{schemaVersion:1, asOf, modules:{learn,arcade,interview}}`. The outer timestamp is the assembly time; each module retains its own data timestamp.

Each backend exposes `GET /api/<module>/integration/summary`. It requires both a separate 32-byte base64url read secret and a Core RS256 delegation in `X-Module-Read`. Delegation has an exact module audience and `module:<name>:summary:read` scope, subject, Hub, membership version, UUID, and at most 30 seconds of lifetime. Session tokens cannot substitute. Browser Origin/cookies and query overrides are rejected. Public gateway forwarding does not carry these credentials.

Only counts leave each module: Learn enrollments, historical node completions, finalized quizzes, and pending events; Arcade completed wins/losses, wins, and pending events; Interview completed sessions and pending events. No answers, reports, resume text, or cross-service database access. These reads do not create results, events, Aura, or activity days.

## Bounds and failure behavior

- At most two optional upstream requests globally per Core process, with two workers per response and an 800ms shared upstream budget. Membership DB reads are outside that budget. Contention can return unavailable rather than queue indefinitely.
- 2KiB response limit, exact count fields, nonnegative safe integers, checked timestamps, redirects forbidden.
- Cache keys contain module, user, Hub and membership version. At most 500 entries and 500 pending keys; identical reads share work. Fresh for 60 seconds, stale for at most five minutes from the original successful observation.
- Failure suppresses new reads to that module for 60 seconds across users. No scheduled polling or keepalive. Refresh does not bypass cooldown.
- A cold/free-tier process can exceed the budget. Counts are then unavailable, not zero. A prior snapshot is labeled and retains its original timestamp. Other cards and Core features remain independent.

## Private configuration

| Service | Environment names |
|---|---|
| Core | `LEARN_API_ORIGIN`, `ARCADE_API_ORIGIN`, `INTERVIEW_API_ORIGIN`; `LEARN_READ_KEY`, `ARCADE_READ_KEY`, `INTERVIEW_READ_KEY` |
| Each module | `MODULE_READ_KEY`, matching only that module's Core read key |

Reuse existing Core RSA signing configuration and each module's pinned Core public key. Origins must be exact HTTPS origins, with loopback HTTP allowed only outside production. Read keys are distinct from login exchange, reconciliation, and third-party API keys. Missing optional configuration leaves the relevant card unavailable and does not prevent startup. No new external API account or paid resource is required.

Local service `.env` files have generated matching read keys. The disposable fixture uses its own throwaway keys and ports. Hosted Render activation requires these six private key settings (three on Core and one per module) and three Core API origins; keep credentials out of the frontend and Git. This phase's local verification is not evidence of hosted activation.

Safe stop: remove a Core read key to disable its widget reads, or roll back the optional progress UI. No migration or data rollback is required. Existing module flows, login, Aura and shared streak remain authoritative.

## Hosted follow-up — 2026-10-11

Read credentials are now saved in Render and the P10.1/P10.2 release is live. Hosted counts, topic import, replay rejection and real Groq generation passed. See [hosted evidence](p10-hosted-evidence.md); earlier local-only rollout notes above describe the pre-deployment state.
