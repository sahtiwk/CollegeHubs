# Monorepo development ? P3.2

Node 24.12+, npm workspaces, one root lock. Run `npm ci` at repository root. Legacy applications are references only; do not start their seed/admin scripts or install their dependencies to run this app.

| Workspace | Default port | Runtime |
| --- | --- | --- |
| `apps/web` | 5173 | One React 18/Vite frontend |
| `services/core` | 5000 | Express, own MongoDB database |
| `services/arcade` | 5001 | Express, own MongoDB database |
| `services/interview` | 5002 | Express, own MongoDB database and bounded PDF worker |
| `services/learn` | 5003 | Express/TypeScript, own PostgreSQL database |

Create a private, Git-ignored `.env` in each enabled service workspace, or preserve/edit the existing local file. Environment templates were intentionally deleted; use the [names-only configuration reference](configuration.md). Runtime loading is workspace-scoped. Only public settings belong in `apps/web/.env.local`; API requests default to `/api`. No secret may have a `VITE_` prefix. Use one exact localhost origin consistently (default `http://localhost:5173`) for Core `APP_ORIGIN`/`ALLOWED_ORIGINS` and Learn `APP_ORIGIN`. Learn's `CORE_API_BASE_URL` is Core's direct origin. Secure cookies are mandatory on HTTPS/production; explicit nonproduction localhost uses HttpOnly/SameSite cookies without Secure.

Core alone requires `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`. A replica set is required for transactions. To enable Learn, add `ENABLE_MODULES=learn`, the RSA signing/public-key configuration and matching Learn settings from [deployment instructions](../deploy/README.md). Start only enabled services with root `npm run dev`. Or use `npm run dev -w @collegehubs/web`, `npm start -w @collegehubs/core`, and `npm run dev -w @collegehubs/learn` in separate terminals. No Docker installation is required.

The Vite and Pages gateways share one implementation: `/api/learn/*`, `/api/arcade/*` and `/api/interview/*` go to their configured services, other `/api/*` to Core. Feature UI routes and assets stay in Vite/Pages. Missing services fail JSON503, unknown APIs JSON404, and redirects/HTML responses are rejected. No caller chooses an upstream. Core sockets use the direct Core origin. P8.1 streams only the bounded resume upload; other request bodies retain the 64 KiB cap.

Core validates settings and its own Mongo connection before listen. `/health/live` is process health; `/health/ready` and `/api/health` check Core's DB only. Learn validates service configuration before listen; `/health/ready` and `/api/learn/health/ready` check its own current schema marker and required SQL tables with a bounded deadline. Optional service failures never participate in Core readiness.

Arcade and Interview use their own Mongo database/user and distinct module service credentials. Set ENABLE_MODULES=learn,arcade,interview only when those services are configured. See [Interview contracts](interview.md) for resume privacy, startup, limits and safe stop. None of its retained P8.1 routes require an AI/cloud-storage/local-JWT key.

## Database setup

CVR is active for exactly `cvr.ac.in`, with user-confirmed evidence in `services/core/config/colleges.seed.json`. This is not DNS ownership or verified-mailbox proof. With the explicitly intended Core database selected, run `npm run provision:hubs -w @collegehubs/core`. Repeated provisioning preserves one Hub and four canonical channels. Password membership remains `domain-claim`; unknown domains remain onboarding-only. Increase `themeVersion` for branding changes.

For Learn's **fresh disposable** database, use a name matching `collegehubs_demo_learn_<suffix>`, set `DATABASE_URL`, `DEMO_RESET_ENABLED=true`, and an exact `DEMO_DB_NAME_ALLOWLIST`, then run:

```powershell
node services/learn/scripts/setup_demo.ts --confirm=collegehubs_demo_learn_local --disposable-data-only
```

Substitute the same explicit database name everywhere. The command refuses production mode, nonmatching/unnamed targets, missing confirmation and existing public tables. It installs the current P9.1 handoff/session and scoped learner/path/node/content/enrollment/state schema, never drops data. Existing session-only schemas require a separate fresh disposable database; this command does not migrate them. Ordinary startup never seeds/resets. Remove operator reset flags after setup.

Core's inherited `reset:demo` remains separate and guarded. Stop writers, use only declared disposable data, and run `npm run reset:demo -w @collegehubs/core -- --database=collegehubs_demo_local --confirm=collegehubs_demo_local --disposable-data-only --dry-run` before any reset. It requires development/test, explicit allowlist/URI/name agreement and rejects unexpected collections, non-synthetic users or Google-linked accounts. It cannot reset the CVR preview fixture because that deliberately uses `cvr.ac.in`. Do not loosen its checks.

## Verification

`npm run build` checks all five buildable workspaces. Individual root commands are `build:web`, `build:core`, `build:arcade`, `build:interview`, `build:learn`. Core/Arcade/Interview are syntax-checked; web checks TypeScript and bundles Vite; Learn emits server JS and the extracted CJS security boundary. Contracts have no separate build. Render's `node deploy/build.mjs core|learn|arcade|interview` is for an isolated checkout/build context: its workspace-scoped install/prune can remove other development dependencies.

`npm run test:guards` runs G1/G2/G3/G4 and schedule guards, including the P10 checks in those files. No environment file is loaded by guards. G3 requires `GUARD_MONGO_URI` pointing to an explicit disposable local replica set and creates/drops only its own random database. Real Learn guards require `GUARD_APP_ORIGIN` and `GUARD_LEARN_DATABASE_URL`, both local, against the isolated fixture below. Database skips are not a full pass.

1. Install/start local PostgreSQL and create a fresh `collegehubs_demo_learn_<suffix>` DB. Bootstrap it with the guarded command above.
2. Set `GUARD_LEARN_DATABASE_URL` to that local database. For automated API compatibility guards, run `node scripts/p32-fixture.cjs --bearer-guards` in an interactive terminal. For browser checks, run `node scripts/p32-fixture.cjs` without the flag; that mode enables the session authentication required by the web app. Both modes start an ephemeral Mongo replica set and separate Core/Learn/Arcade/Interview/frontend processes on 5183/5184/5185/5186/5182. Interview and Arcade use distinct logical Mongo databases; the Interview child is explicitly stripped of retired provider/Core private configuration. mongodb-memory-server may download its pinned MongoDB binary on first use.
3. In bearer-guard mode, enter `guards` for all G1-G4 plus schedules with real databases. Older API guards exercise legacy bearer compatibility; the included `core-sessions` suite creates its own session-enabled API and verifies rotation, revocation, CSRF, and legacy-token rejection. The fixture refuses this guard command in browser mode so it cannot silently run those guards against the wrong authentication policy. Set `SCHEDULE_REFRESH_ENABLED=false` before launching either fixture for provider-free baseline runs; Learn lookup is disabled and Interview uses its synthetic transport. Enter `stop-learn`, `start-learn`, or `expire-learn`, `db-down`, or `db-up` for failure/expiry checks; `quit` stops fixture processes/Mongo. PostgreSQL is operator-managed and is not dropped. Quit before switching modes, and use the default session mode for the browser walkthrough below.
4. Open `http://localhost:5182`. Synthetic fixture logins are `preview@cvr.ac.in` and `preview@sky.example.test`, password `Preview-only-32!`. They exist only in ephemeral local Mongo; never use them for hosted/retained data. CVR uses the requested palette, Sky the alternate fixture palette.
5. Verify Core?Learn without document navigation, deep-link reload, Back/Forward, 360px Menu/focus/keyboard, accessible roadmap list, two accounts/themes, reconnect on expiry, and Core usability with Learn/API DB unavailable. Save actual screenshots/evidence in `docs/learn-spike.md`.

No live provider is needed. Learn data is explicitly synthetic; unconverted routes remain 404. Native Aura, all three ranked Arcade games, Interview completion and Learn quiz/mastery scoring are implemented under their current policies. The earlier Next/form handoff is archived in `legacy/retired-gateway`; do not deploy it alongside the active SPA.

## P4.1 channels

Subject spaces now link to `/channels/:id` in the same shell. Set `VITE_CORE_SOCKET_ORIGIN` to the direct Core origin (HTTPS for deployed builds, without a path); Core must allow the exact app Origin. Development defaults to Core on port 5000. The fixture injects port 5183 and explicitly allows both localhost and 127.0.0.1 on 5182 for separate test accounts. Production without the socket setting retains REST history/sending.

The fixture now accepts `stop-core` and `start-core`, preserving its Mongo data for restart checks. `guards` supplies the fixture-only `GUARD_CORE_SIGNING_SECRET` to exercise token expiry. G1's channel integration checks fail rather than skip when their fixture is missing. See [P4.1 evidence](p4.1-evidence.md) for contracts, limits and the two-tab walkthrough.

## P4.2 typed channels

Channels support text, code, titled HTTPS resources, questions and replies. Search is literal, scoped and paginated. Only a question's author can permanently accept a different author's answer. See [P4.2 contracts and evidence](p4.2-evidence.md). Native facts are persisted transactionally; native Aura is active prospectively under P6.1 rules; see [Aura contracts](aura.md). No new environment names or provider accounts are needed.

The local fixture additionally creates `peer@cvr.ac.in` with password `Preview-only-32!` for same-Hub answer testing. These accounts exist only in disposable local Mongo. `NativeFact` collections/indexes are prepared on startup; the reset allowlist includes `nativefacts` without relaxing its synthetic-data guard. The shared CommonJS channel contract is explicitly included in Vite dependency optimization. If editing that linked contract during development, restart Vite with `--force` to refresh the prebundle.

## Study Room backend (P5.1)

Core now owns Problem, StudyRoom and StudySolution, including startup indexes and deadline recovery. Room creation is available through `/api/study-rooms`; the shared-shell UI is available through each channel's Open study rooms link. See [HTTP/socket contracts and safe stop](study-rooms.md). `STUDY_ROOMS_ENABLED=false` stops new rooms while preserving active work. No dependency installation or provider configuration is required. Standalone G4 uses its own local replica set when no guard URI is supplied; the full fixture `guards` command includes G4 with zero database skips.

P5.2 adds PeerReview, stable completion IDs/status and a bounded reconciler for pending study facts. No new dependency or runtime variable is needed. Reconnect/sync restores acknowledged work; save explicitly before leaving a room. P6.1 scores new eligible completions; older inactive facts are not replayed. See [P5.2 evidence](p5.2-evidence.md).

## P6.2 schedules and sample calendar

Core uses the anonymous Codeforces API with a persistent last-good cache and request-triggered refresh. Set `SCHEDULE_REFRESH_ENABLED=false` to stop network refresh while preserving all Core features. No provider account or paid scheduler is required. After Hub provisioning, review `services/core/config/calendar.seed.json` and explicitly install examples with `npm run seed:calendar -w @collegehubs/core -- --database=YOUR_DATABASE --apply --confirm-sample-dates`. The normal startup never seeds academic dates. See [provider policy and API contracts](providers.md) and [TP6.1 import/export operations](academic-calendar.md). The disposable fixture includes these samples and its `guards` command now includes schedule isolation/outage checks.

## P7.1 Arcade

Configure `services/arcade/.env`, a separate replica-set database and explicitly scoped Core service credential; see [Arcade setup](arcade.md). The disposable `scripts/p32-fixture.cjs` starts Arcade on 5185 behind the shared 5182 gateway and runs its G1/G2/G3 checks with `guards`. `stop-arcade` / `start-arcade` verify service isolation; `stop-core` / `start-core` verify pending completion. `arcade-retry-due` changes only disposable pending retry timestamps for recovery verification. No production retry-bypass endpoint exists.


## P9.2 Learn paths and assessments

Learn now has saved DSA/Web enrollment, scoped roadmaps/readings, template guidance and learning preferences in the shared shell. P9.2 adds 60 seed questions, saved server-graded checkpoints/test-outs, unlocks and durable Core receipts. Fresh schema v2 is required; preserve earlier databases. No new API key is required. See [Learn setup and route inventory](learn.md) and [P9.2 verification status](p9.2-evidence.md). Start the integration fixture with `GUARD_LEARN_DATABASE_URL` pointing to the fresh current schema, then use its `guards` command for all services. Its earlier session-only database is not sufficient for current Learn readiness. The deployment installer is intended for an isolated build workspace, not an active development workspace.

## P10 integration and transition baseline

P10.1 owned weak-skill topic selection/import and P10.2 bounded module progress summaries are implemented. See [topic contracts](learn-interview-topics.md), [progress contracts](module-progress.md) and the [TP0.1 baseline](transition-baseline.md) for routes, runnable workspace commands, configuration ownership and dated local results. Preserve earlier evidence as dated observations.

TP0.2 is now implemented: use the explicit Core/Learn `migrate` workspace commands
and [migration/restore runbook](transition-restore.md) for retained databases.
The initial adoption changes metadata only and preserves Learn schema v2.
`npm run test:migrations` requires a local `MIGRATION_TEST_DATABASE_URL` and
PostgreSQL dump/restore tools; missing prerequisites fail rather than skip.
Never use fresh-demo bootstrap or Core reset as a migration substitute.

## TP3.1 frontend foundations

See [the design specification](frontend-redesign.md) for semantic tokens, Hub
identity boundaries, route/state layouts and motion rules. Run `npm run test:design`
for contrast checks. Run `npm run build:design-lab` then `npm run preview:design-lab`
to inspect the independent catalogue at http://127.0.0.1:5193/design-lab.html.
The catalogue requires no backend. Its shader prototype is off by default and
fails the optional bundle budget; static CSS remains the selected treatment.
The specification includes browser-test setup and measured limitations.

## TP1.1 mailbox verification

Password accounts now start with onboarding authority until an account-bound,
one-use mailbox challenge succeeds. Exact evidenced registry domains control
membership; unknown domains remain unassigned. See [identity verification](identity-verification.md)
for endpoint DTOs, local capture, announcement/cutover and rollback instructions.
Production mail is explicitly unavailable; no real delivery or hosted cutover is
claimed. Run `npm run test:identity`; the integration fixture's full `guards`
command includes it and verifies new module-test accounts through captured mail.

TP1.2 adds `/verify-email`, explicit Google linking, verified replacement email,
and expiring allowlisted return paths. `/dashboard` aliases the protected member
home. Google actions require matching configured Core/browser client IDs; real
provider account settings remain untested. The [identity runbook](identity-verification.md)
contains the new contracts, private captured-mail links and browser reproduction.

### Browser sessions (TP2.2)

The web app requires `CORE_SESSION_ENABLED=true`; `npm run dev` defaults this on unless explicitly overridden. For the disposable browser fixture, set it true before starting `scripts/p32-fixture.cjs`, then run `npm run test:session-browser` with `PLAYWRIGHT_PATH` pointing to an available Playwright installation if needed. Legacy integration guards still exercise the flag-off cutover boundary; the session suite separately enables it. See [session recovery](browser-session-recovery.md) for local draft retention, cooldowns and rollout requirements.
