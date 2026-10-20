# TP0.1 transition baseline

Completed locally on **18 October 2026 (Asia/Kolkata)** against HEAD
`617dcafbb542f143836c7665618650d7068f2795`, with the pre-existing dirty working
tree preserved. This is source inspection and new local verification, not a
new hosted release, provider check, security certification or migration rehearsal.
TP0.2 remains the next prerequisite for retained-data schema changes.

## Preserved starting state

Deleted templates: `.env.example`, `apps/web/.env.example`,
`services/{core,arcade,interview,learn}/.env.example`,
`legacy/AI-Interviewer-main/{backend,frontend}/.env.example`,
`legacy/MargaAI-master/.env.example`.

Modified before this task: `docs/arcade.md`, `docs/development.md`,
`docs/interview.md`. Untracked before this task: `changes.md`, `modules.md`,
`transition_implementation_plan.md`, `docs/screenshots/p3.2-plum.png`.
No template was restored. Existing development edits were retained while its
stale build/scoring/setup claims were corrected. Other pre-existing edits were
not changed. Initial tracked diff/status are retained privately in
`.local/tp01/pre-existing.patch` and `.local/tp01/initial-status.txt`.

## Active architecture and runnable commands

Root `package.json` selects only `apps/*`, `services/*`, `packages/*`.
Root lockfile v3 contains six workspace packages and 425 dependency entries;
no `legacy/` package entry exists. Legacy locks are reference material only.
Node 24.12.0 and npm 11.6.2 were used; installed dependencies were reused with
no upgrades or lock changes. On a fresh checkout, run `npm ci` at root first.

| Root | Local command from repository root | Build/check | Data |
|---|---|---|---|
| `apps/web` | `npm run dev:web` | `npm run build:web` | React 18/Vite SPA, port 5173 |
| `services/core` | `npm run dev:core` | `npm run build:core` | Own replica-set Mongo, port 5000 |
| `services/arcade` | `npm run dev:arcade` | `npm run build:arcade` | Own replica-set Mongo, port 5001 |
| `services/interview` | `npm run dev:interview` | `npm run build:interview` | Own replica-set Mongo, port 5002 |
| `services/learn` | `npm run dev:learn` | `npm run build:learn` | Own PostgreSQL schema v2, port 5003 |
| `packages/contracts` | Loaded by workspace consumers | No standalone build/server; checked through consumers and guards | Shared contracts only |

`npm run dev` starts the shared frontend/Core and explicitly enabled modules.
Configure only owned databases and matching origin/key settings from
[configuration names](configuration.md). `render.yaml` describes four separate
free services; `deploy/build.mjs` installs only a selected service plus contracts.
Pages builds web from the root lock and serves `apps/web/dist` with Functions.
The deployment installer can prune other workspaces and must run in an isolated
build checkout. No deploy command was executed here. See
[migration record](monorepo-migration.md) and [deployment runbook](../deploy/README.md).

## Mounted route map

Routes below are current source, grouped by owning router. This is a route
inventory, not permission to bypass authentication, tenant or service checks.
`services/core/app.js`, module `src/app.*` files and the cited routers determine
mount order. Unknown API routes return JSON 404; retired routes may return 410.

| Owner / source | Mounted paths and operations |
|---|---|
| Web `src/App.jsx` | Public `/login`, `/register`, `/about`; membership-gated `/`, `/leaderboard`, `/contests`, `/channels/:id`, `/channels/:id/study`, `/study-rooms/:id`, `/arcade`, `/arcade/:gameId/:id?`, `/learn/*`, `/interview/*`; fallback redirects to `/` |
| Core health/auth | GET `/health/live`, `/health/ready`, `/api/health`; POST `/api/auth/register`, `/api/auth/login`, `/api/google/auth`; module router GET `/api/auth/modules`, POST `/api/auth/module-grants`, `/api/auth/module-grants/exchange` |
| Core profile/Hub | `meRoutes`: GET/PATCH `/api/me`, GET `/api/me/hub`, POST `/api/me/assignment/retry`; `hubRoutes`: GET `/api/hubs/:hubId/theme`, `/channels`; `userRoutes`: GET `/api/users/:username`, GET `/api/users/leaderboard`, PUT `/api/users/onboarding`, PUT `/api/users/:username` |
| Core feed/channel | `postRoutes`: GET/POST `/api/posts`, PUT/DELETE `/api/posts/:id/like`; `channelRoutes`: GET/POST `/api/channels/:id/messages`; `messageRoutes`: GET `/api/messages/:id/thread`, POST `/api/messages/:id/accepted-answer` |
| Core Study | `studyRoutes`, prefix `/api/study-rooms`: GET `/problems`, `/time`, `/`, `/:id`, `/:id/reviews`, `/:id/submissions`; POST `/`, `/:id/reviews`, `/:id/join`, `/:id/start`, `/:id/draft`, `/:id/submit` |
| Core rewards/schedule | POST `/api/aura/events`; GET `/api/me/aura`, `/api/me/progress`, `/api/hubs/:hubId/leaderboard`, `/api/contests`, `/api/hubs/:hubId/calendar` |
| Core P10 | GET `/api/me/module-progress`, `/api/me/weak-skills`; POST `/api/me/interview-recommendation`, `/api/auth/interview-recommendations/consume` |
| All module health/session | Each module has GET `/health/live`, `/health/ready`, `/api/<module>/health/ready`; under `/api/<module>`: POST `/auth/start`, `/auth/callback`, `/logout`; GET `/session`. Arcade/Interview also DELETE `/session`; Learn retains GET `/api/learn/spike/graph` for its synthetic graph |
| Arcade `routes/gameSessions.js` | Under `/api/arcade`: GET `/games`, `/me/activity`, `/sessions/:id`; POST `/sessions`, `/sessions/:id/actions`, `/sessions/:id/complete` |
| Interview `routes.js` | Under `/api/interview`: GET `/resumes`, `/resumes/:id`, `/capabilities`, `/interviews`, `/interviews/:id`, `/sessions`, `/sessions/:id`; POST `/resumes/upload`, `/interviews`, `/interviews/:id/learn-topics`, `/interviews/:id/generate`, `/sessions`, `/sessions/:id/complete`; PUT `/sessions/:id/answers/:questionId`; DELETE `/resumes/:id`, `/interviews/:id` |
| Learn `routes/learningRoutes.ts` | Under `/api/learn`: GET `/dashboard/domains`, `/dashboard/graph`, `/dashboard/stats`, `/dashboard/milestones`, `/profile/preferences`, `/nodes/:id`; PUT `/profile/preferences`; POST `/onboarding/profile`, `/onboarding`, `/learner/intake`, `/learner/init-graph`, `/recommendation`, `/tutor/fast`; DELETE `/profile/path` |
| Learn quiz router | GET `/api/learn/quiz/attempts`, `/api/learn/quiz/attempts/:id`; POST `/api/learn/resources`, `/api/learn/quiz/attempts`, `/api/learn/quiz/next`, `/api/learn/quiz/answer`, `/api/learn/quiz/finalize` |
| Service-only integrations | Every module GET `/api/<module>/integration/summary`, `/integration/pending-results`; POST `/integration/reconcile`; Learn additionally GET `/api/learn/integration/weak-skills`. Service authentication protects these; gateway does not forward module Authorization or signed read headers |
| Explicit retired operations | POST `/api/google/calendar` and `/api/users/:username/refresh` return 410 |

Core sockets connect directly to namespace `/core`; they complement durable
REST state. Vite and Pages share `apps/web/functions/api/[[path]].ts` for HTTP
routing. That gateway selectively forwards module cookies, accepts JSON responses
and has bounded request/response handling; Core refresh cookies, ICS and SSE are
future TP2/TP6/TP9 work, not existing behavior.

## Data and requirement inventory

Core models: College, Hub, Channel, User, Post, Message, NativeFact, Problem,
StudyRoom, StudySolution, PeerReview, ModuleGrant, ServiceCredential, AuraRuleSet,
AuraEvent, AuraBalance, AuraDayCounter, DailyActivity, Contest, CalendarEvent.
Arcade owns ModuleSession/GameSession; Interview owns ModuleSession, Resume,
Interview, Session, AiControl and question definitions.

Learn schema v2 declares module_handoff, module_session, learn_schema, learner,
learning_path, skill_node, node_prerequisite, content_item, enrollment,
learner_node_state, quiz_item, quiz_attempt, node_completion, learn_event and
resource_cache. Fresh bootstrap refuses populated schemas; it is not a migration.

| Requirement | Present source / preservation evidence | Remaining owner |
|---|---|---|
| FR1 college assignment/auth | Exact-domain Hub provisioning, scoped membership/grants; G1/G2 | TP1 mailbox verification/linking; TP2 refresh/revocation |
| FR2/3/7 persistent channel/code/resources | Message/answer services, typed composer, scoped retrieval; G1/G3 | TP4 redesign/highlighting |
| FR4 Study | Fenced drafts/deadlines/recovery/reviews; G4 | TP4 cancellation/save UX |
| FR5 schedules | CF last-good cache and labeled seeded calendar; schedule guards | TP6 provenance/providers/export |
| FR6 rewards | Transactional native/module receipts and caps; G3 | TP5 achievements/history/policy; TP7/TP8 new facts |
| Arcade/Interview/Learn | Three ranked games, bounded practice/report flow, DSA/Web checkpoints; existing integration guards | TP7 games, TP8 domains, TP9 inference/text lifecycle |
| P10 cross-feature | Mounted Core progress/recommendation routes, module summaries/weak-skills, Interview topic import, `LearnProgressCard.jsx`, `WeakSkillSuggestions.jsx` | TP10 extends implemented flows; does not start P10 from scratch |
| NFR foundations | Current builds, tenant/session/reward/Study guards | TP11 measured release envelope; local pass is not load/hosted proof |

P10 suggestions use the latest owned assessment ratio below 0.6 within 30 days,
up to five selected topics and a short-lived one-use import. Progress uses
bounded service reads with unavailable/stale states; it does not grant module
databases access to Core. The 11 October [hosted activation](p10-hosted-evidence.md)
remains historical. README now reports implementation accurately; release evidence
has a dated correction without replacing its earlier 101-test observations.

## Reproduction and new evidence

On this machine PostgreSQL 18 tools were already installed. A new cluster was
initialized only at `C:/socialstream/.local/tp01/pg`, listening on loopback port
55431 with local disposable role `tp01`; no retained cluster was reused. Local
trust authentication is for this loopback fixture only, never a deployment recipe.
The database was named `collegehubs_demo_learn_tp01`.

```powershell
# Fresh checkout: npm ci. Use a new, empty local disposable PostgreSQL DB.
npm run build
$env:DATABASE_URL='postgresql://tp01@127.0.0.1:55431/collegehubs_demo_learn_tp01'
$env:DEMO_RESET_ENABLED='true'
$env:DEMO_DB_NAME_ALLOWLIST='collegehubs_demo_learn_tp01'
node services/learn/scripts/setup_demo.ts --confirm=collegehubs_demo_learn_tp01 --disposable-data-only
$env:GUARD_LEARN_DATABASE_URL=$env:DATABASE_URL
$env:SCHEDULE_REFRESH_ENABLED='false'
node scripts/p32-fixture.cjs
# At fixture prompt: guards, then quit after completion.
```

Use your own new disposable local role/port/name consistently. Never substitute
a hosted URL. The fixture supplies ephemeral MongoDB 7.0.14 replica-set databases,
synthetic users, service keys and all guard variables. It starts APIs on
5183–5186 and Vite on 5182. Its `guards` command runs the same five files as root
`test:guards`, adding TAP reporting and the required fixture configuration.
Learn external lookup is disabled; Interview transport is synthetic; schedule
refresh was explicitly disabled. No live provider request was needed.

| Check | New result | Local evidence |
|---|---|---|
| `npm run build` | PASS, all five buildable workspaces; Vite 196 modules | `.local/tp01/build.log` |
| Guarded fresh Learn bootstrap | PASS, empty schema to v2 | Command result; disposable cluster retained stopped |
| Five guard files via fixture | **108 tests passed, 0 failed, 0 skipped, 0 cancelled**, 53.55 seconds | `.local/tp01/guards.tap` |
| Root lock/dependency boundary | PASS, 425 dependency entries, no legacy workspace lock entries | `.local/tp01/audit.json`; [dependency inventory](transition-dependencies.md) |
| Generated web artifact inspection | PASS, 15 files, no private-key/DB-URI markers, private config matches, env/maps/credential files or repository legacy paths | `.local/tp01/audit.json` contains SHA-256 per output; local checker `.local/tp01/audit.cjs` |

The output inspection compared 14 sensitive configured values in memory without
printing or copying them to reports. It is a bounded check, not proof against
every possible secret form. Vite only exposes the three public `VITE_*` settings
used by source. The active Interview PDF import `pdfjs-dist/legacy/build/pdf.mjs`
is a dependency's compatibility build, not the repository's `legacy/` tree.
No new behavior tests were added because TP0.1 changes documentation/license
scope only. No unresolved build/test failures or database skips remain.

## Completion and follow-ups

- [x] Active roots/manifests/lock/deployment and route/model/test inventory inspected.
- [x] Existing changes/templates preserved; P10 status corrected, historical evidence retained.
- [x] Scoped LICENSE, CONTRIBUTING, source/distribution manifest and dependency inventory added.
- [x] Names-only configuration reference added; frontend output inspected.
- [x] Local build/guards run with disposable stores and zero skips; no hosted writes.

Changed deliverables: this baseline, `docs/configuration.md`,
`docs/open-source-manifest.md`, `docs/transition-dependencies.md`, root `LICENSE`,
`CONTRIBUTING.md`, `README.md`, `THIRD_PARTY.md`, `docs/development.md` and the
dated correction in `docs/release-evidence.md`. Original plans remain unchanged.

Outstanding gates are assigned, not treated as TP0.1 runtime failures:
integration/data maintainer owns TP0.2 additive migration/restore proof;
identity maintainer owns TP1/TP2 verification/revocation; design maintainer owns
TP3 exact self-hosted font/visual notices; release maintainer owns TP11 public
distribution terms for Arcade/Learn adaptations and renewed hosted checks.
The manifest explicitly excludes restricted/unspecified material from an
unrestricted MIT-only package; no such package or public release was made here.
No current hosting quota or full-application completion claim is made.
