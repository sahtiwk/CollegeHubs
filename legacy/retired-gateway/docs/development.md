# Core development baseline (through P1.1)

## Independent package roots

Install and run each application from its own directory. There is no npm workspace merge; preserve each package's lockfile. Core does not install, bundle, start or deploy the imported modules.

| Application | Working directory | Development port | State |
|---|---|---|---|
| Core UI | repository root | 5173 | `npm run dev`; `npm run build` |
| Core API | `server/` | 5000 | `npm run dev` or `npm start` |
| Arcade UI | `digital-arcade-main/code and stuff/` | 5174 | Reserved; when developing it, use its own Vite command with `--port 5174` |
| Arcade API | future `digital-arcade-main/service/` | 5001 | Not implemented |
| Interview UI | `AI-Interviewer-main/frontend/` | 5175 | Reserved; use its own Vite command with `--port 5175` |
| Interview API | `AI-Interviewer-main/backend/` | 5002 | Reserved via that service's PORT; not integrated |
| Learn | `MargaAI-master/` | 3000 | Independent Next application; not integrated |

Reserved module ports are plan defaults, not claims that upstream configs were changed. Do not start imported seed/admin/cleanup scripts as part of Core setup. Module authentication, provider configuration and rewrites belong to later phases.

## Core setup

1. Install dependencies separately in the root and `server/` (use existing lockfiles).
2. Copy each `.env.example` to its local `.env` and fill in the names. See [Core API configuration](../server/README.md). The API entry point loads `server/.env` regardless of working directory. The root Vite package loads its own frontend environment.
3. Set a reachable `MONGO_URI`, a strong `JWT_SECRET`, and exact `ALLOWED_ORIGINS`. Set `VITE_API_URL` to the Core API and the matching Google client IDs only if using Google login.
4. Start Core API, then Core UI. Ordinary startup never seeds or resets data.

Core uses Node 24.12.0 in this verification environment. No dependency/runtime upgrade or module runtime compatibility claim is part of P0.2.

Vite dependency discovery starts only from Core `index.html`; production input is that same file. Its dev watcher ignores the server and imported module roots. Tailwind already scans only Core `index.html` and `src/`. Explicit future imports can still bring files into the graph, so keep modules independently deployed. Generated output and local env files are ignored; module source and independent package lockfiles remain trackable.

## Startup and health

`server/app.js` composes Express without connecting or listening. `server/index.js` validates config, waits for MongoDB connection and a ping, then listens. Missing settings or an unreachable DB fail startup with a nonzero exit; no listener advertises success. A failed initial connection does not start a health-only server.

- `GET /health/live`: 200 while the running API process can respond, even after DB disconnection.
- `GET /health/ready`: 200 only with an active Core DB connection and successful bounded ping; otherwise 503. Readiness responses are not cached.
- `GET /api/health`: compatibility alias for readiness (no longer unconditional success).
- DB disconnected after startup: `/api` operations return 503 instead of buffering indefinitely. Driver recovery allows readiness to return 200 again.

Only Core's own database participates in readiness; optional modules/providers do not. Deployment health checks should target `/health/ready`.

## Retired behavior

`npm run seed` now refuses immediately; it cannot install a fixed password or delete an account. Creating a post preserves its persistence behavior but awards no Aura. The external Aura service fails explicitly without network calls or balance writes. Existing stored balances are not rewritten.

Contests and the sidebar schedule show unavailable; no client provider fetch or fabricated future dates remain there. Calendar export remains disabled. The Feed no longer promises rewards for posting. Other inherited dashboard/marketing mock content is not a completed Aura implementation; the truthful dashboard and scoring arrive in P6. The contest unavailable page uses the plan palette and Abril/Archivo font stacks with system fallbacks; P1.2 now loads these fonts and applies configured theme tokens across the scoped shell.

## Explicit disposable demo reset

This is an operator-run command, never a startup step. Stop the Core API and all writers first. Do not run it against real or retained data.

Required environment:

- `NODE_ENV` must be `development` or `test` (unset/production is refused).
- `DEMO_RESET_ENABLED` must be exactly `true`.
- `DEMO_DB_NAME_ALLOWLIST` must contain the exact approved database name.
- `MONGO_URI` must select that same database. Use dedicated demo-only credentials.

Only names matching `collegehubs_demo` or `collegehubs_demo_<lowercase_suffix>` are accepted. The URI name, allowlist and explicit CLI database must match. No fallback database, URI override, `--force`, wildcard allowlist or production mode is accepted.

From `server/`, first inspect using a dry run (substitute your approved name):

```powershell
npm run reset:demo -- --database=collegehubs_demo_local --confirm=collegehubs_demo_local --disposable-data-only --dry-run
```

Remove `--dry-run` only to delete the approved disposable data:

```powershell
npm run reset:demo -- --database=collegehubs_demo_local --confirm=collegehubs_demo_local --disposable-data-only
```

Both forms require explicit confirmation and acknowledgment that all records are disposable. Before any delete, the command checks the actual connected database name and refuses unknown collections, users outside `example.test` and its synthetic subdomains, and any Google-linked account. These checks cannot prove that arbitrary post text is disposable; the operator declaration and stopping writers are required. If real data appears, stop and design a separate reviewed migration. Do not broaden the allowlist to bypass a refusal.

The reset deletes `modulegrants`, `posts`, `users`, `channels`, `hubs`, then `colleges`, preserving indexes and operator-managed `servicecredentials`; it never drops a database or unknown collections. It prints only the approved database name and collection counts, never a URI, credentials or record bodies. Deletion is not transactional; after a partial failure, keep writers stopped, inspect the target, then rerun only if it remains disposable. A dry run performs reads only.

No user credentials are seeded. The reset now runs the P1.1 idempotent college registry seed and provisions active Hubs/four channels. It respects the same inactive-until-confirmed registry. P5/P6 must add problem/calendar seeds once those models exist. Unknown future collections still cause refusal. Module databases are outside this command's scope.

See [third-party notices](../THIRD_PARTY.md), [P0.1 evidence](p0.1-evidence.md), and [P0.2 evidence](p0.2-evidence.md).

## P1.1 activation and identity

1. Confirm the exact institutional domain and college name with the project owner. `cvr.ac.in` is presently a draft reference, not an active authorization.
2. Edit `server/config/colleges.seed.json`: set the confirmed college to active, record each domain's confirmation date in `verifiedAt` and the confirmation reference in `evidenceRef`, and retain the four canonical channels. Do not activate another institution based on its name in a paper or theme list. Normalize domains exactly; no implicit subdomain match.
3. Use a transaction-capable Core MongoDB replica set and run `npm run provision:hubs` from `server/`. It creates unique indexes and upserts the configuration and active Hubs/channels. Repeating it is safe. To retire an entry, keep it in the registry with status disabled; do not merely remove it from the file. No existing user is transferred or backfilled.
4. Start the API (which waits for unique indexes before listening), register fresh demo accounts, and inspect `/api/me`. Existing unassigned users can retry using `{}` at `/api/me/assignment/retry`; save its replacement token. Existing old-format tokens require sign-in again.

The Google UI uses the ID-token callback and sends JSON through Core's exact-origin API. It does not use Google's cookie-based redirect POST flow or create an ambient login cookie. Configure the Google OAuth client for the real frontend origin and verify the live flow before release. Matching hosted Workspace evidence is required for an institutional Google membership to be marked verified; password-domain matching and third-party Google-account email claims remain unverified. This is mailbox evidence, not a claim of current enrollment.

The minimal unassigned screen and read-only college label are necessary for P1.1. P1.2 now supplies AuthProvider/HubThemeProvider, bounded pagination, the keyboard-accessible mobile drawer, configured theme loading, and removal of display-substring theming. Current display labels do not control authorization.

See [P1.1 verification](p1.1-evidence.md). No production database was read or modified during implementation.

## P1.2 UI and branding checks

Generic brand colors are plum `#310A31`, cream `#F4ECD6`, peach `#FFD3B6`, and pale sky `#DFF7FF`. The pre-membership fallback lives in `src/utils/collegeThemes.js`; keep it aligned with the registry default palette. Assigned college palettes come only from the authenticated Hub response and are cached by Hub ID plus theme version. Changing a local display label has no effect on membership or palette selection. Logos require the registry's exact HTTPS asset-origin allowlist. Google Fonts supplies Abril Fatface and Archivo; offline visitors receive Georgia/sans-serif fallbacks.

For a manual local check, use an isolated disposable replica set with two active synthetic `example.test` colleges and distinct palettes. Create accounts through normal provisioning or a local fixture, sign in as each, and verify that only their feed, subjects, and college standings appear. At a 360px viewport, open Menu by keyboard, cycle Tab and Shift+Tab, close with Escape, and confirm focus returns to Menu. Check profile editing without a college input, and sign in as an unassigned account to exercise its explanation/retry. Do not activate the real draft college to run these checks.

After changing registry branding, increase `themeVersion` and rerun `npm run provision:hubs`. The next account refresh/navigation to a freshly loaded app fetches the current Hub version. API failure falls back to generic branding with a retry message, without selecting another college. A failed `/me` check blocks the workspace until retry succeeds.

No additional automated UI suite or dependencies were introduced. G1 is the named regression guard. See [P1.2 evidence and screenshots](p1.2-evidence.md).

## P2.1 local module integration

No module is enabled by default. Ordinary Core development needs no module keys. For an isolated handoff fixture, generate ephemeral RSA/service credentials outside frontend env, provision a synthetic college/user plus a service credential in a disposable replica set, and serve Core plus a callback stub through one localhost gateway origin. Set ENABLE_MODULES to only the stub module. The gateway must route auth/API requests before SPA fallbacks. Module UI ports alone cannot implement callback/session cookies.

Follow the [shared handoff contract](../packages/contracts/module-handoff.md). A successful manual flow is Core sign-in -> full-document module auth/start -> state-bound Core form -> POST module callback -> server-to-server exchange -> 303 clean module URL. Verify secure path cookies, no second login, empty private/service-key browser exposure, and logout CSRF. Do not replace Origin/state checks with a permissive fallback when testing localhost. Core HTML uses strict-origin because no-referrer makes native form POST Origin null.

## P2.2 guard and recovery checks

`npm run test:guards` in server runs only the named G1/G2/G3 suites. To include G3 transaction cases, set `GUARD_MONGO_URI` in the shell to an already-running **disposable local MongoDB replica set** (localhost or 127.0.0.1 only). The guard never loads .env. It creates a randomly named `collegehubs_demo_g3_<uuid>` database, builds indexes, uses synthetic identities/keys and drops only that generated database in finally. It never uses or resets the URI's existing database. Unset GUARD_MONGO_URI after running. Without the variable, the transaction group is explicitly skipped; that is not full P2.2 verification. No test dependency is installed by the guard.

For example, against your disposable replica set:

```powershell
$env:GUARD_MONGO_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'
npm --prefix server run test:guards
Remove-Item Env:GUARD_MONGO_URI
```

Never substitute an application or production server. Full guard coverage includes service/principal binding, concurrent duplicate/semantic conflict, count and partial point caps, shared days, external replacement, transaction rollback and error/limit contracts. P2.2 fixture rules live inside G3; normal server startup cannot activate them from the environment or a request. The [event schema](../packages/contracts/module-events.schema.json) and [pending/reconciliation contract](../packages/contracts/reconciliation.md) are the implementation boundary for future module phases. Manual acceptance additionally persists a stub result in a separate disposable module DB, stops Core, observes saved/pending, then restores Core and discards/replays one receipt. Record observed status/receipt and clean up the fixture. No UI/browser test suite is added.

The Core grant lasts at most 60 seconds and the module access/session at most 900 seconds. JWT verification and retention are separate; TTL cleanup does not authorize expired grants. Lost exchange responses require a new handoff. Service credentials are operator configuration and are preserved by the demo reset; module grants are disposable data. No event ingestion or module application conversion is included in P2.1.

See [P2.1 verification](p2.1-evidence.md). Production key generation, secure storage and actual per-module release gating remain operator/deployment work.
