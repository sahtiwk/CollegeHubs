# Learn: scoped reading paths (P9.1)

Learn runs independently in `services/learn`, with its own PostgreSQL database. The integrated pages are `/learn`, `/learn/onboarding`, `/learn/nodes/:id` and `/learn/preferences`. They use the existing Core shell, login, Hub theme and router. No Next or Clerk runtime is mounted. Core remains the owner of account/profile, ranking, Aura and streaks.

P9.1 delivers saved enrollment, graphs, learning preferences, topic readings, resource recommendations and fast template guidance. Assessment, quiz issuance, grading, test-out and completion-event delivery are **not enabled**. P9.2 owns those features and the reviewed question bank. The `reading-v1` catalog is not evidence of reviewed assessments.

## Retained route inventory

Every path below has the `/api/learn` prefix. All require the existing opaque module session. Mutations require the exact app Origin, JSON and `X-CSRF-Token` from `/session`. Query parameters and extra body fields are rejected; neither user nor Hub can be supplied by the browser. Domains are exactly `dsa` or `web`. Identifiers are server-issued UUIDv4 values.

| Method / path | Body | Result / legacy adaptation |
|---|---|---|
| GET `/dashboard/domains` | — | DSA/Web catalog, own active enrollment and self-rating; adapts the legacy domains handler. |
| GET `/dashboard/graph` | — | Own active nodes and edges, public descriptions/status only; adapts graph + LearnerStateService. UI filters the two returned domains locally. |
| GET `/dashboard/stats` | — | Own active path/topic/available-topic counts. No copied Aura or streak fields. |
| GET `/dashboard/milestones` | — | At most five scoped assessed/completed node summaries. No completion writer is exposed in P9.1, so fresh learners have none. No local Aura-event fallback. |
| POST `/onboarding/profile` | `{domain}` | Fixed seed-topic labels for the selected supported domain; replaces arbitrary goal-to-DAG generation. |
| POST `/onboarding` | `{domain,selfRating,goal,dailyMinutes}` | Atomic path initialization, self-rating and preferences; repeated enrollment preserves existing node states. |
| POST `/learner/init-graph` | `{domain}` | Idempotent enrollment and root initialization; one learner/node state. |
| POST `/learner/intake` | `{domain,selfRating}` | Updates an enrolled path's self-rating only. No theta, progress, unlock or reward authority. |
| GET `/nodes/:id` | — | Owned, actively enrolled and unlocked topic plus approved reading resources. |
| POST `/recommendation` | `{nodeId}` | First curated linked reading, with `source: seed`; explicit unavailable result if none. No embeddings or LLM reranking. |
| POST `/tutor/fast` | `{nodeId,contentId}` | Template reading guidance, after checking node ownership/access and resource-to-node binding. |
| GET `/profile/preferences` | — | Own goal and daily reading duration. Missing learner is initialized safely. |
| PUT `/profile/preferences` | `{goal,dailyMinutes}` | Saves only Learn preferences; Core identity cannot be changed here. |
| DELETE `/profile/path` | `{domain}` | Deactivates only the owned path and resets current node states. Re-enrollment restores its roots. Core receipts/award uniqueness are untouched. |

Self-ratings: `new`, `some`, `comfortable`, `advanced`. Daily minutes: numeric `10`, `20`, `30`, `45`, `60`. Goal: at most 240 characters, no control characters. JSON size limit: 16 KiB. Times are serialized as UTC ISO strings. Errors use `{error:{code,message,retryable}}`: 400 malformed input, 401 absent/expired session, 403 Origin/CSRF/locked topic, 404 unknown/foreign/unenrolled references, 413 oversized request, and 503 unavailable SQL. Existing handoff replay409 and start-rate429 (`Retry-After`) remain in effect. Responses are uncached.

Existing `/auth/start`, `/auth/callback`, `/session`, `/logout` and health routes remain unchanged in purpose. `/spike/graph` remains an authenticated **synthetic diagnostic** for foundational regression checks; the application no longer uses it. The old `/learn/session-check` UI is not mounted.

No handlers are mounted for maintenance, generate-dag, process-llm, ingest, quiz-generate, tutor/slow, quiz/attempts, quiz/answer, quiz/next, quiz/finalize, local profile/leaderboard or reward engines. They return JSON404 (the common Origin/query boundary may reject malformed requests earlier). Existing legacy files remain archival source, outside builds.

## SQL ownership and reset

Fresh schema v1 includes `module_handoff`, `module_session`, `learn_schema`, `learner`, `learning_path`, `skill_node`, `node_prerequisite`, `content_item`, `enrollment`, and `learner_node_state`. No vector extension, Clerk mapping, local Aura/streak tables or historic migration snapshot is required.

Learners are unique by `(hub_id,user_id)` from a validated Core-issued module session. Nodes/resources are Hub-scoped; learner state includes its owning user, Hub, domain and curriculum version. Composite foreign keys prevent connecting a state to a node/enrollment in another Hub or domain. Prerequisite edges preserve the same Hub/domain/version. Content belongs to one Hub/node. There is one state per Hub/user/node, with assessed theta constrained to [-3,3] or unassessed null. An advanced self-rating does not initialize assessed theta.

Each owned operation locks the learner row inside a transaction. Concurrent initialization and reset cannot duplicate/partially overwrite state; content reads serialize with reset so access is checked before any reading lookup. A Hub/path advisory lock serializes installation of the small server-owned catalog across different learners. Catalog nodes/resources are fixed, bounded and parameterized; no browser-created DAG is accepted. Initialization uses conflict-safe inserts and never overwrites assessed state. Preferences, enrollment, graph, stats and milestones queries include the session's owner scope.

Reset deactivates an enrollment and clears its current state; it does not delete the learner/catalog/enrollment identities, contact Core, or delete any immutable completion history. There are no cascading deletes. The reset/re-enroll guard checks a real nonempty Core ledger/balance/day snapshot and replays an existing mastery receipt: the original receipt is returned without changing the balance. P9.2 must retain that invariant when adding attempt/completion tables.

## Fresh local setup

Use an empty, explicitly disposable PostgreSQL database; do not point this command at retained data. An existing P3 session-only database will fail readiness and is **not automatically upgraded**. Preserve it and create a separate empty demo database. A retained-data migration/backfill requires separate review.

```powershell
$env:DATABASE_URL = 'postgresql://<learn-user>:<password>@localhost:5432/collegehubs_demo_learn_local'
$env:DEMO_RESET_ENABLED = 'true'
$env:DEMO_DB_NAME_ALLOWLIST = 'collegehubs_demo_learn_local'
node services/learn/scripts/setup_demo.ts --confirm=collegehubs_demo_learn_local --disposable-data-only
```

The setup process reads operator environment variables, requires exact name/allowlist/confirmation agreement, refuses production and any existing public table, and commits the complete schema atomically. It never drops or resets data. Remove the setup flags after use. Ordinary server startup never creates or migrates tables. The reading catalog is installed per Hub/path on explicit authenticated enrollment, in the same transaction as the learner state.

Configure the ignored `services/learn/.env` with its own `DATABASE_URL` plus existing `PORT`, `APP_ORIGIN`, `CORE_API_BASE_URL`, `CORE_TOKEN_ISSUER`, `CORE_TOKEN_AUDIENCE=collegehubs-learn`, `CORE_KEY_ID`, `CORE_PUBLIC_KEY` and `CORE_SERVICE_KEY`. Private signing keys belong only to Core. Frontend requests stay same-origin; the gateway forwards `/api/learn` to the independent service. No new API key is needed for P9.1. Gemini/YouTube keys are optional future resource features and are not imported or called by this phase.

Build: `npm run build:learn`; start: `npm start -w @collegehubs/learn`. Deploy build: `node deploy/build.mjs learn` **inside the deployment/build workspace**, where its scoped install/prune is intended. Do not run that deployment installer in a running multi-service development workspace. Learn readiness checks the schema marker and all required tables; missing/session-only/unavailable SQL returns503. Core readiness never depends on Learn.

## Source and reading provenance

The MargaAI dashboard/onboarding/module flows and RoadmapView topological layout are adapted to React Router. `learnerService.ts` retains idempotent root initialization from LearnerStateService, self-rating intake from ProfilerAgent, linked reading selection from RetrieverAgent, and bounded fast template guidance from TutorAgent. It replaces unscoped lookups, Next/Clerk authority, arbitrary generation and local reward writes. See [THIRD_PARTY.md](../THIRD_PARTY.md).

The four starter readings link to MDN contributors' [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections), [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration), [Basic HTML syntax](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax), and [What is CSS?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS). Links checked 2026-10-07. Summaries are original short text, not copied articles. Readings open only after an explicit click; no third-party content is fetched during enrollment or recommendation. Future resources must keep attribution and enforce the same access checks before provider quota is spent.

## Safe stop and outstanding acceptance

Stop Learn or make its gateway origin unavailable to disable the feature while leaving Core and other services running. Removing `learn` from Core `ENABLE_MODULES` prevents new handoffs; existing sessions remain valid until their bounded expiry. No generation/grading endpoint can be enabled by adding an API key.

See [P9.1 evidence](p9.1-evidence.md). Browser desktop/mobile/theme/navigation verification remains pending because the browser tool could not verify its admin-enforced policy. Automated/API acceptance is separate from that outstanding visual check. Hosted/free-account acceptance remains P11-gated.
