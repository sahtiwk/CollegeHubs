# Configuration names and ownership

Reviewed from active source for TP0.1, 18 October 2026. This reference contains
names and responsibilities, not credentials. Create private `.env` files in the
workspace that runs each service; preserve existing files. Environment templates
were intentionally deleted. Root `.env` is not the service configuration source.
Never copy backend settings into the frontend. See [deployment](../deploy/README.md)
for provisioning and [development](development.md) for disposable setup.

| Owner | Settings | Purpose |
|---|---|---|
| All APIs | `NODE_ENV`, `PORT` | Runtime mode and listener; production requires HTTPS origins |
| Core | `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS` | Required own replica-set DB, bearer signing and exact browser origins |
| Core auth | `CORE_TOKEN_ISSUER`, `CORE_ACCESS_AUDIENCE`, `CORE_ACCESS_TTL_SECONDS`, `GOOGLE_CLIENT_ID` | Optional claim/TTL settings and Google ID-token audience; refresh/revocation remains TP2 |
| Core verification | `VERIFICATION_MAIL_MODE`, `LEGACY_MEMBERSHIP_NOTICE_UNTIL` | Default unavailable mail; capture restricted to local nonproduction. Explicit ISO notice deadline temporarily permits retained domain claims. See [verification rollout](identity-verification.md); do not deploy strict defaults to retained users without notice |
| Core modules | `ENABLE_MODULES`, `APP_ORIGIN`, `CORE_MODULE_PRIVATE_KEY`, `CORE_MODULE_KEY_ID`, `CORE_MODULE_PUBLIC_KEYS`, `MODULE_ACCESS_TTL_SECONDS`, `MODULE_GRANT_TTL_SECONDS`, `CORE_GRANT_BINDING_RETENTION_DAYS` | Explicit enabled modules, exact origin, RSA signing/public-key map and bounded grant lifetimes |
| Core P10 | `LEARN_API_ORIGIN`, `ARCADE_API_ORIGIN`, `INTERVIEW_API_ORIGIN`, `LEARN_READ_KEY`, `ARCADE_READ_KEY`, `INTERVIEW_READ_KEY` | Direct service origins and distinct per-module read credentials; optional reads degrade when unavailable |
| Core feature switches | `STUDY_ROOMS_ENABLED`, `SCHEDULE_REFRESH_ENABLED` | Disable new rooms or live schedule refresh while preserving saved state |
| Core external progress | `CODEFORCES_STATS_ENABLED`, `EXTERNAL_BONUS_ENABLED` | Both default off; statistics linking and verified snapshot bonus are separate gates. See [ownership review and rollout](external-progress.md). No Clist/LeetCode activation flag is provided |
| Every module | `APP_ORIGIN`, `CORE_API_BASE_URL`, `CORE_TOKEN_ISSUER`, `CORE_TOKEN_AUDIENCE`, `CORE_PUBLIC_KEY`, `CORE_KEY_ID`, `CORE_SERVICE_KEY`, `MODULE_READ_KEY` | Exact frontend origin, Core endpoint, matching public key, module audience, scoped event credential and matching P10 read credential; never Core private key |
| Arcade | `ARCADE_MONGO_URI`, `ARCADE_RECONCILE_KEY`, `ARCADE_GAMES_ENABLED` | Separate replica-set DB, operator recovery credential and game activation |
| Interview | `INTERVIEW_MONGO_URI`, `INTERVIEW_RECONCILE_KEY`, `INTERVIEW_AI_ENABLED`, `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_FREE_CONFIRMED` | Separate replica-set DB, recovery and explicitly enabled/free-confirmed inference; ordinary guards use synthetic transport |
| Learn | `DATABASE_URL`, `LEARN_RECONCILE_KEY`, `LEARN_RESOURCE_LOOKUP_ENABLED` | Own PostgreSQL schema 2–5, operator recovery and optional external resource lookup |
| Inference | `INTERVIEW_AI_PROVIDER`, `INTERVIEW_AI_ENABLED`, `LOCAL_INFERENCE_ENABLED`, `LOCAL_INFERENCE_URL`, `LOCAL_INFERENCE_MODEL`, `LEARN_TUTOR_ENABLED` | Fixed optional adapters; local grading blocked; see [TP9.1 configuration and evidence](tp9.1-evidence.md) |
| Web browser build | `VITE_API_URL`, `VITE_CORE_SOCKET_ORIGIN`, `VITE_GOOGLE_CLIENT_ID` | Public API URL (defaults to `/api`), direct socket origin and public Google client ID only |
| Vite / Pages gateway | `CORE_API_ORIGIN`, `LEARN_API_ORIGIN`, `ARCADE_API_ORIGIN`, `INTERVIEW_API_ORIGIN` | Server-side allowlisted upstreams; no `VITE_` prefix |
| Disposable setup only | `DEMO_RESET_ENABLED`, `DEMO_DB_NAME_ALLOWLIST` | Explicit fresh-demo/reset gating; never ordinary startup or retained-data migration |

Use one exact browser origin consistently. Each module's `CORE_TOKEN_AUDIENCE`
must name that module. Event credentials and read credentials serve different
purposes and must not be interchanged. Provision event credentials via the
Core stdin tool; do not paste keys in tracked commands or documentation.

`render.yaml` describes the original deployment settings but does not list all
optional P10 read settings. Configure the Core origins/three read keys and each
matching module's `MODULE_READ_KEY` separately as documented in
[P10 activation](p10-hosted-evidence.md). That record is historical, not a current
account inspection. No hosted settings were changed during TP0.1.

Fixture-only `GUARD_*` settings are supplied by `scripts/p32-fixture.cjs`; the
operator supplies only an explicitly local `GUARD_LEARN_DATABASE_URL` for that
fixture. Its generated keys and synthetic logins must never be used for hosted
data. Disable schedule refresh and Learn lookup; retain the synthetic Interview
transport. Do not use the fixture's `interview-live` command for baseline tests.

### Core session rollout (TP2.1)

`CORE_SESSION_ENABLED` defaults off; only `true` or `false` is accepted. Enabling rejects all legacy bearer JWTs and issues revocable session-bound access for at most 900 seconds. The TP2.2 browser now requires session mode; coordinate its deployment with enabling this flag on every Core instance. The local dev launcher defaults it on. See [Core sessions](core-sessions.md) for cookies, CSRF, rotation, migration and rollback policy.
