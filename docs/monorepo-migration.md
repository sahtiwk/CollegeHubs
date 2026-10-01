# P3.2 migration record

The migration preserves P0–P2 and the P3.1 security spike. Source snapshots are references, excluded from npm workspaces and the deployed build.

| Supplied source | Active target | Treatment |
| --- | --- | --- |
| root `src`, HTML, Vite/Tailwind/PostCSS | `apps/web` | Existing Core React 18 SPA and theme; one router and shell |
| `server` | `services/core` | Existing auth, Hub provisioning and durable Aura code |
| `packages/contracts` | same, named workspace | Server-only credential/cookie contracts, no database models |
| MargaAI sessionBoundary and session SQL | `services/learn/src/auth`, `src/db` | Actual PostgreSQL security, JSON Express adapter; no Next or Clerk runtime |
| MargaAI RoadmapView | `apps/web/src/features/learn` | Reuse topological level layout, accessible themed cards/list; synthetic graph only |
| MargaAI remainder | `legacy/MargaAI-master` | Preserve source/config/lock/unfinished edits for P9 |
| Digital Arcade / AI Interviewer | `legacy/digital-arcade-main`, `legacy/AI-Interviewer-main` | Preserve all source/notices for P7/P8; not active workspaces |
| Old gateway/Vercel/Next basePath work | `legacy/retired-gateway` and legacy MargaAI | Retired from active deployment; API gateway replaces page proxy |

Before relocation, dirty/untracked inventory and original root/Core manifests/locks were copied to ignored `.local/migration-baseline`. Existing changes included the Next integration spike, gateway config, guard edits and both locks. They were preserved rather than reset. Existing scoped `.env` files remain private; root environment files are not automatically copied into frontend output. Imported dependency directories remain ignored. npm reconciles the active workspaces into one root lock; legacy locks remain reference artifacts.

Dependency boundary: one React 18 runtime, Vite SPA; Core Express/Mongoose; Learn Express/pg/TypeScript; contracts use Node crypto only. No Learn import of Core models, no browser service key or database credential, no active Next/Clerk/Three dependency.

Security reuse map: RS256/audience/issuer/expiry/subject/Hub checks, opaque hashed SQL sessions, state-cookie plus exact Origin, one-use callback, exchange outage restart, scoped owner authorization and CSRF logout all retain G1/G2 coverage. New adapter assertions exercise HTTP JSON routes, cookie paths and unconverted 404s. G3 is rerun against a disposable replica set after relocation. Initial P3.2 checks failed deliberately for draft CVR and missing Learn HTTP adapter.

CVR activation records the user's exact `cvr.ac.in` confirmation. It does not assert mailbox verification, DNS ownership or institutional endorsement. Provisioning remains explicit and idempotent; no retained database is reset.
