# Learn: reading paths and saved assessments (P9.2)

Learn runs independently in `services/learn`, with its own PostgreSQL database. The integrated pages are `/learn`, `/learn/onboarding`, `/learn/nodes/:id` and `/learn/preferences`. They use the existing Core shell, login, Hub theme and router. No Next or Clerk runtime is mounted. Core remains the owner of account/profile, ranking, Aura and streaks.

P9.1 delivers enrollment, graphs, preferences and readings. P9.2 adds the `demo-v1` curriculum, four topics with 15 reviewed seed questions each, server grading, saved `/learn/quiz/:id` and `/learn/history` pages, and durable Core reward delivery. Both DSA and Web work with Gemini and YouTube disabled. The bank's answer/content review is recorded as a Codex review, not human certification or psychometric calibration.

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

No handlers are mounted for maintenance, generate-dag, process-llm, ingest, quiz-generate, tutor/slow, local profile/leaderboard or reward engines. They return JSON404 (the common Origin/query boundary may reject malformed requests earlier). Existing legacy files remain archival source, outside builds.

## SQL ownership and reset

Fresh schema v2 includes `module_handoff`, `module_session`, `learn_schema`, `learner`, `learning_path`, `skill_node`, `node_prerequisite`, `content_item`, `enrollment`, `learner_node_state`, `quiz_item`, `quiz_attempt`, `node_completion`, `learn_event` and `resource_cache`. No vector extension, Clerk mapping, local Aura/streak tables or historic migration snapshot is required.

Learners are unique by `(hub_id,user_id)` from a validated Core-issued module session. Nodes/resources are Hub-scoped; learner state includes its owning user, Hub, domain and curriculum version. Composite foreign keys prevent connecting a state to a node/enrollment in another Hub or domain. Prerequisite edges preserve the same Hub/domain/version. Content belongs to one Hub/node. There is one state per Hub/user/node, with assessed theta constrained to [-3,3] or unassessed null. An advanced self-rating does not initialize assessed theta.

Each owned operation locks the learner row inside a transaction. Concurrent initialization and reset cannot duplicate/partially overwrite state; content reads serialize with reset so access is checked before any reading lookup. A Hub/path advisory lock serializes installation of the small server-owned catalog across different learners. Catalog nodes/resources are fixed, bounded and parameterized; no browser-created DAG is accepted. Initialization uses conflict-safe inserts and never overwrites assessed state. Preferences, enrollment, graph, stats and milestones queries include the session's owner scope.

Reset deactivates an enrollment, clears its current state and cancels active quizzes; it retains attempts, immutable results/completions/events and Core receipts. There are no cascading deletes. Re-enrollment permits checkpoint practice but cannot erase test-out eligibility history or issue another first-completion reward. Guards check both unchanged Core ledger/balance/day records and unchanged Learn event payloads after reset/reassessment.

## Fresh local setup

Use an empty, explicitly disposable PostgreSQL database; do not point this command at retained data. An existing P3 session-only or P9.1 schema-v1 database fails readiness and is **not automatically upgraded**. Preserve it and create a separate empty demo database. A retained-data migration/backfill requires separate review.

```powershell
$env:DATABASE_URL = 'postgresql://<learn-user>:<password>@localhost:5432/collegehubs_demo_learn_local'
$env:DEMO_RESET_ENABLED = 'true'
$env:DEMO_DB_NAME_ALLOWLIST = 'collegehubs_demo_learn_local'
node services/learn/scripts/setup_demo.ts --confirm=collegehubs_demo_learn_local --disposable-data-only
```

The setup process reads operator environment variables, requires exact name/allowlist/confirmation agreement, refuses production and any existing public table, and commits the complete schema atomically. It never drops or resets data. Remove the setup flags after use. Ordinary server startup never creates or migrates tables. The reading catalog is installed per Hub/path on explicit authenticated enrollment, in the same transaction as the learner state.

Configure the ignored `services/learn/.env` with its own `DATABASE_URL` plus existing `PORT`, `APP_ORIGIN`, `CORE_API_BASE_URL`, `CORE_TOKEN_ISSUER`, `CORE_TOKEN_AUDIENCE=collegehubs-learn`, `CORE_KEY_ID`, `CORE_PUBLIC_KEY` and `CORE_SERVICE_KEY`. Private signing keys belong only to Core. Frontend requests stay same-origin. No new external API key is needed. Gemini/YouTube keys are not imported or called by P9.2. Optional `LEARN_RESOURCE_LOOKUP_ENABLED=false` disables Wikipedia calls by default. `LEARN_RECONCILE_KEY` is an independent locally generated 32-byte base64url secret (43 characters), used only by operators; leave empty to disable those endpoints. Never use a `VITE_` prefix for service secrets.

Build: `npm run build:learn`; start: `npm start -w @collegehubs/learn`. Deploy build: `node deploy/build.mjs learn` **inside the deployment/build workspace**, where its scoped install/prune is intended. Do not run that deployment installer in a running multi-service development workspace. Learn readiness checks the schema marker and all required tables; missing/session-only/unavailable SQL returns503. Core readiness never depends on Learn.

## Source and reading provenance

The MargaAI dashboard/onboarding/module flows and RoadmapView topological layout are adapted to React Router. `learnerService.ts` retains idempotent root initialization from LearnerStateService, self-rating intake from ProfilerAgent, linked reading selection from RetrieverAgent, and bounded fast template guidance from TutorAgent. It replaces unscoped lookups, Next/Clerk authority, arbitrary generation and local reward writes. See [THIRD_PARTY.md](../THIRD_PARTY.md).

The four starter readings link to MDN contributors' [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections), [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration), [Basic HTML syntax](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax), and [What is CSS?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS). Links checked 2026-10-07. Summaries are original short text, not copied articles. Readings open only after an explicit click; no third-party content is fetched during enrollment or recommendation. Future resources must keep attribution and enforce the same access checks before provider quota is spent.

## Safe stop and outstanding acceptance

Stop Learn or make its gateway origin unavailable to disable the feature while leaving Core and other services running. Removing `learn` from Core `ENABLE_MODULES` prevents new handoffs; existing sessions remain valid until their bounded expiry. Saved attempts and pending reward facts survive service restart. No generation endpoint can be enabled by adding an API key.

See [P9.1 evidence](p9.1-evidence.md) and [P9.2 evidence](p9.2-evidence.md) for separately recorded automated, browser and process-recovery results. Hosted/free-account acceptance remains P11-gated.

## Assessment and resource routes

All routes below use the same owner/session/Origin/CSRF boundary as readings. No client scores, theta, totals, user IDs or Hub IDs are accepted.

| Method / path | Exact body | Result |
|---|---|---|
| GET `/quiz/attempts` | none | Latest 30 owned attempts/results. |
| GET `/quiz/attempts/:id` | none | Owned saved attempt and pending/settled reward state; schedules bounded delivery when due. |
| POST `/quiz/attempts` | `{nodeId,mode,requestId}` | Create or resume a quiz; mode `checkpoint` or `test-out`. |
| POST `/quiz/next` | `{attemptId}` | Read the one current unanswered question without advancing. |
| POST `/quiz/answer` | `{attemptId,questionId,optionId,requestId}` | Save the current issued answer once; exact replays return saved state, changed replays409. |
| POST `/quiz/finalize` | `{attemptId}` | Immutable server result after all answers are saved; stable reward facts in the same SQL transaction. |
| POST `/resources` | `{nodeId}` | Authorized `live`, `cache`, `seed` or `unavailable` reading links with freshness/provenance. |

An unlocked topic offers a five-question checkpoint (3/5 passes) or a one-time ten-question test-out (8/10 passes). Test-out must precede any attempt for that node/version. Failure leaves checkpoints available. All attempts expire after 30 minutes; at most five starts per topic in a rolling 24 hours; only one active attempt per topic. A fresh session can resume an unexpired attempt. Reset cancels active attempts. Passed topics unlock dependants only when every prerequisite is complete. Theta is the bounded heuristic `6 * ratio - 3`, not a calibrated ability score.

Question and option IDs are freshly randomized. Frozen keys/explanations remain private until the attempt is finalized; its review then reveals the submitted and correct answers. The tiny reusable seed bank is practice material, not a secure examination. SQL triggers reject modification of closed attempts, completion identities and event payloads; settled receipts are immutable.

Only a first successful assessment of a node/version emits `learn:<attemptId>:quiz:v1` and `learn:<attemptId>:mastered:v1`. This deliberately prevents checkpoint/reset farming, even on another day. Core alone decides Aura: quiz 5 (at most five/day and one node/mode/day), first mastery 15, combined Learn source cap100/day. Core prospectively activates `learn-demo-v1` for curriculum `demo-v1`; no retroactive award activation. Provision the Learn Core credential with explicit event scopes `learn.quiz_completed` and `learn.node_mastered` using `services/core/scripts/provisionModuleService.js` and stdin secret input.

Each outbox delivery has a SQL lease, a four-second HTTP deadline, 16 KiB response limit and 30-second to one-hour retry backoff. Three due events at most are reconciled at once. A lost Core response retries the same immutable fact. A failed delivery never turns a saved result into a failed quiz. Reads/finalization trigger best-effort recovery; sleeping free services have no always-running worker guarantee.

Operator-only direct endpoints: GET `/api/learn/integration/pending-results` (20 bounded pending summaries) and POST `/api/learn/integration/reconcile` (exact `{}` body, at most three due events), with `Authorization: Bearer <LEARN_RECONCILE_KEY>`. Browser Origin, Sec-Fetch-Site, queries and browser cookies cannot authorize them. The frontend gateway keeps integration routes blocked.

## Seed tooling and optional provider

`node services/learn/scripts/seed_curriculum.ts --check` validates the versioned four-node DAG and all 60 questions, including supported counts, option keys and missing/cyclic references. Enrollment installs the released bank transactionally per Hub. For explicit pre-seeding, use the same disposable DB allowlist flags as bootstrap and `--hub=<24-hex-Hub-id> --confirm-db=<database-name>`. Existing versions are never overwritten.

`node services/learn/scripts/generate_question_seed.ts <new-output.json> --draft-only` creates an offline blank authoring scaffold using exclusive file creation. It does not call a generator or silently approve content. Complete original/permitted questions and review every key/explanation before assigning a new release version; drafts cannot pass the validator.

The optional Wikipedia adapter uses fixed curriculum topics, one result/request, a 1.5-second deadline, a 16 KiB limit, no redirects and HTTPS Wikipedia article URLs only. Access checks run before cache/provider work. Per-Hub/node SQL locking limits successful refreshes to once/day and failures to once/hour; stale cache survives failure, then seed links provide fallback. No article body is copied. See [provider policy](providers.md).
