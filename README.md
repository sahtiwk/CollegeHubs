# CollegeHubs

One npm monorepo, one React frontend, independently deployable Core and Learn backends.

- `apps/web`: shared Vite SPA, Core shell/auth/theme and lazy Learn roadmap preview.
- `services/core`: Express/MongoDB identity, Hub/feed and durable reward receipt foundation.
- `services/learn`: Express/TypeScript/PostgreSQL session API and scoped synthetic graph.
- `packages/contracts`: shared server credential contracts, no cross-service database access.
- `legacy`: preserved imported projects/notices; excluded from active builds.

Use Node 24.12+ and `npm ci` at the root. Configure workspace `.env` files from their names-only examples, then `npm run dev`. Core needs a MongoDB replica set. Learn is started only when Core's `ENABLE_MODULES` includes `learn`; it needs its own PostgreSQL database and service configuration. The browser uses `/api`; it never connects to another UI application.

`npm run build` builds each active workspace. `npm run test:guards` runs G1?G3; full database checks require explicit disposable fixture inputs. See [development setup](docs/development.md), [free deployment](deploy/README.md), [migration record](docs/monorepo-migration.md), and [P3.2 acceptance status](docs/learn-spike.md).

CVR's exact `cvr.ac.in` domain is active based on user confirmation. Provision explicitly with `npm run provision:hubs -w @collegehubs/core`; no startup reset runs. Unknown domains remain onboarding-only. The default palette remains plum/cream/peach/sky with Abril Fatface and Archivo.

P0?P2 behavior is preserved. Learn currently demonstrates secure sessions and an integrated synthetic roadmap, not complete courses, progress, quizzes or rewards. Arcade/Interview ports, chat, rooms and live scoring remain later phases. Local browser acceptance and hosted acceptance are recorded separately; deployment configuration is not proof of deployment.

Historical evidence: [P0.1](docs/p0.1-evidence.md), [P0.2](docs/p0.2-evidence.md), [P1.1](docs/p1.1-evidence.md), [P1.2](docs/p1.2-evidence.md), [P2.1](docs/p2.1-evidence.md), [P2.2](docs/p2.2-evidence.md), [P3.1](docs/p3.1-evidence.md). Historical paths refer to their pre-migration locations. [Third-party notices](THIRD_PARTY.md) remain applicable.

P4.1 durable text channels and socket recovery are complete locally. See [verification and API contracts](docs/p4.1-evidence.md). P4.2 code/resources, literal search and immutable answer threads are also complete locally; see [P4.2 evidence](docs/p4.2-evidence.md). Aura activation remains P6.
