# Owned module progress — TP10.1

TP10.1 adds version 2 minimized summaries: up to five active Learn paths (`domain`, `version`, required/completed counts), and an owned continuation identifier for a saved assessment/next topic, game or interview/report. Dashboard and Progress share these cards. The frontend constructs canonical internal routes from validated identifiers; services cannot supply arbitrary URLs. Stale snapshots retain their counts and timestamp but hide direct continuation actions. Pending counts describe Aura delivery, not additional confirmed rewards.

TP8.2 adds numeric Learn summary fields `requiredNodes`, `optionalNodes` and `completedPaths`. These count active path requirements, personal optional review steps and currently completed active paths. Historical `completedNodes` and `completedQuizzes` retain their previous meaning. No remedial explanations, answer keys or resource content are delegated. The updated Core reader accepts the original four-count summary during rolling deployment; deploy that reader before the expanded Learn response. The Learn dashboard separately returns per-path completed/required/optional counts and the next accessible topic.

Core `GET /api/me/module-progress` is authenticated and checks current active membership before reading and again before returning. Its response is `{schemaVersion:2, asOf, modules:{learn,arcade,interview}}`. The outer timestamp is the assembly time; each module retains its own data timestamp.

Each backend exposes `GET /api/<module>/integration/summary`. It requires both a separate 32-byte base64url read secret and a Core RS256 delegation in `X-Module-Read`. Delegation has an exact module audience and `module:<name>:summary:read` scope, subject, Hub, membership version, UUID, and at most 30 seconds of lifetime. Session tokens cannot substitute. Browser Origin/cookies and query overrides are rejected. Public gateway forwarding does not carry these credentials.

Counts and minimal owned continuation identifiers leave each module: Learn enrollments, historical node completions, finalized quizzes, path requirements and pending events; Arcade completed wins/losses, wins, and pending events; Interview completed sessions and pending events. No answers, report contents, resume text, or cross-service database access. These reads do not create results, events, Aura, or activity days. Opening a continuation still requires the destination module's normal ownership checks.

## Bounds and failure behavior

- At most two optional upstream requests globally per Core process, with two workers per response and an 800ms shared upstream budget. Membership DB reads are outside that budget. Contention can return unavailable rather than queue indefinitely.
- 4KiB response limit, exact versioned fields, nonnegative safe integers, checked timestamps, bounded path arrays and allowlisted actions; redirects forbidden. Original count-only summaries remain readable during rolling deployment. Deploy Core before module producers and the new UI.
- Cache keys contain summary version, module, user, Hub and membership version. At most 500 entries and 500 pending keys; identical reads share work. Fresh for 60 seconds, stale for at most five minutes from the original successful observation.
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

Weak-skill suggestions cover all five supported domains. Only the latest finalized owned assessment on an active path is considered, within 30 days, with at most five suggestions. Reset/unassessed states and earlier low scores superseded by better scores are excluded. Import rechecks the current suggestions before atomically consuming the one-use recommendation, as well as requiring the owned idle draft and current Interview session. A path or assessment change requires selecting current suggestions again. Generation receives selected labels/version only.

## Hosted follow-up — 2026-10-11

Read credentials are now saved in Render and the P10.1/P10.2 release is live. Hosted counts, topic import, replay rejection and real Groq generation passed. See [hosted evidence](p10-hosted-evidence.md); earlier local-only rollout notes above describe the pre-deployment state.

That hosted evidence predates TP10.1's richer schema. The new local implementation and verification are recorded separately in [TP10.1 evidence](tp10.1-evidence.md).
