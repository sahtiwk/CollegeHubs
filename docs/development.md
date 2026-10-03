# Monorepo development ? P3.2

Node 24.12+, npm workspaces, one root lock. Run `npm ci` at repository root. Legacy applications are references only; do not start their seed/admin scripts or install their dependencies to run this app.

| Workspace | Default port | Runtime |
| --- | --- | --- |
| `apps/web` | 5173 | One React 18/Vite frontend |
| `services/core` | 5000 | Express, own MongoDB database |
| `services/learn` | 5001 | Express/TypeScript, own PostgreSQL database |

Copy each workspace's `.env.example` to its private `.env`. Root's old environment files were preserved, but runtime loading is workspace-scoped. Only the public Google client ID was carried into `apps/web/.env.local`; API requests default to `/api`. No secret may have a `VITE_` prefix. Use one exact localhost origin consistently (default `http://localhost:5173`) for Core `APP_ORIGIN`/`ALLOWED_ORIGINS` and Learn `APP_ORIGIN`. Learn's `CORE_API_BASE_URL` is Core's direct origin. Secure cookies are mandatory on HTTPS/production; explicit nonproduction localhost uses HttpOnly/SameSite cookies without Secure.

Core alone requires `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`. A replica set is required for transactions. To enable Learn, add `ENABLE_MODULES=learn`, the RSA signing/public-key configuration and matching Learn settings from [deployment instructions](../deploy/README.md). Start only enabled services with root `npm run dev`. Or use `npm run dev -w @collegehubs/web`, `npm start -w @collegehubs/core`, and `npm run dev -w @collegehubs/learn` in separate terminals. No Docker installation is required.

The Vite and Pages gateways share one implementation: `/api/learn/*` goes to Learn, reserved Arcade/Interview prefixes to their configured services, other `/api/*` to Core. UI `/learn/*` and assets stay in Vite/Pages. Missing services fail JSON503, unknown APIs JSON404, and redirects/HTML responses are rejected. No caller chooses an upstream. Future Core sockets use the direct Core origin; P3.2 does not implement sockets.

Core validates settings and its own Mongo connection before listen. `/health/live` is process health; `/health/ready` and `/api/health` check Core's DB only. Learn validates service configuration before listen; `/health/ready` and `/api/learn/health/ready` check its own SQL session table with a bounded deadline. Optional service failures never participate in Core readiness.

## Database setup

CVR is active for exactly `cvr.ac.in`, with user-confirmed evidence in `services/core/config/colleges.seed.json`. This is not DNS ownership or verified-mailbox proof. With the explicitly intended Core database selected, run `npm run provision:hubs -w @collegehubs/core`. Repeated provisioning preserves one Hub and four canonical channels. Password membership remains `domain-claim`; unknown domains remain onboarding-only. Increase `themeVersion` for branding changes.

For Learn's **fresh disposable** database, use a name matching `collegehubs_demo_learn_<suffix>`, set `DATABASE_URL`, `DEMO_RESET_ENABLED=true`, and an exact `DEMO_DB_NAME_ALLOWLIST`, then run:

```powershell
node services/learn/scripts/setup_demo.ts --confirm=collegehubs_demo_learn_local --disposable-data-only
```

Substitute the same explicit database name everywhere. The command refuses production mode, nonmatching/unnamed targets, missing confirmation and existing public tables. It installs only handoff/session tables, never drops data. Ordinary startup never seeds/resets. Remove operator reset flags after setup.

Core's inherited `reset:demo` remains separate and guarded. Stop writers, use only declared disposable data, and run `npm run reset:demo -w @collegehubs/core -- --database=collegehubs_demo_local --confirm=collegehubs_demo_local --disposable-data-only --dry-run` before any reset. It requires development/test, explicit allowlist/URI/name agreement and rejects unexpected collections, non-synthetic users or Google-linked accounts. It cannot reset the CVR preview fixture because that deliberately uses `cvr.ac.in`. Do not loosen its checks.

## Verification

`npm run build` builds web/Core/Learn. Individual builds are `build:web`, `build:core`, `build:learn`. Core is CommonJS syntax-checked; Learn emits server JS and the extracted CJS security boundary. Render's `node deploy/build.mjs core|learn` is for an isolated checkout/build context: its workspace-scoped install/prune can remove other development dependencies.

Only G1/G2/G3/G4 run with `npm run test:guards`. No environment file is loaded by guards. G3 requires `GUARD_MONGO_URI` pointing to an explicit disposable local replica set and creates/drops only its own random database. Real Learn guards require `GUARD_APP_ORIGIN` and `GUARD_LEARN_DATABASE_URL`, both local, against the isolated fixture below. Database skips are not a full pass.

1. Install/start local PostgreSQL and create a fresh `collegehubs_demo_learn_<suffix>` DB. Bootstrap it with the guarded command above.
2. Set `GUARD_LEARN_DATABASE_URL` to that local database and run `node scripts/p32-fixture.cjs` in an interactive terminal. It starts an ephemeral Mongo replica set and separate Core/Learn/frontend processes on 5183/5184/5182. mongodb-memory-server may download its pinned MongoDB binary on first use.
3. At the fixture prompt, enter `guards` for all G1-G4 with real databases. Enter `stop-learn`, `start-learn`, or `expire-learn`, `db-down`, or `db-up` for failure/expiry checks; `quit` stops fixture processes/Mongo. PostgreSQL is operator-managed and is not dropped.
4. Open `http://localhost:5182`. Synthetic fixture logins are `preview@cvr.ac.in` and `preview@sky.example.test`, password `Preview-only-32!`. They exist only in ephemeral local Mongo; never use them for hosted/retained data. CVR uses the requested palette, Sky the alternate fixture palette.
5. Verify Core?Learn without document navigation, deep-link reload, Back/Forward, 360px Menu/focus/keyboard, accessible roadmap list, two accounts/themes, reconnect on expiry, and Core usability with Learn/API DB unavailable. Save actual screenshots/evidence in `docs/learn-spike.md`.

No live provider is needed. Learn data is explicitly synthetic; unconverted routes remain 404. Scoring remains inactive outside G3 fixture rules. The earlier Next/form handoff is archived in `legacy/retired-gateway`; do not deploy it alongside the active SPA.

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

Core uses the anonymous Codeforces API with a persistent last-good cache and request-triggered refresh. Set `SCHEDULE_REFRESH_ENABLED=false` to stop network refresh while preserving all Core features. No provider account or paid scheduler is required. After Hub provisioning, review `services/core/config/calendar.seed.json` and explicitly install examples with `npm run seed:calendar -w @collegehubs/core -- --confirm-sample-dates`. The normal startup never seeds academic dates. See [provider policy and API contracts](providers.md). The disposable fixture includes these samples and its `guards` command now includes schedule isolation/outage checks.
