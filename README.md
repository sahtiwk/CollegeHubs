# CollegeHubs

One npm monorepo, one React frontend, independently deployable Core, Arcade, Interview and Learn backends.

- `apps/web`: shared Vite SPA, Core shell/auth/theme and lazy Learn roadmap preview.
- `services/core`: Express/MongoDB identity, Hub/feed and durable reward receipt foundation.
- `services/arcade`: independent MongoDB sessions, three validated ranked games and durable completion delivery.
- `services/interview`: independent MongoDB sessions, private PDF text, five-question Groq practice and durable report/Aura delivery.
- `services/learn`: Express/TypeScript/PostgreSQL session API and scoped synthetic graph.
- `packages/contracts`: shared server credential contracts, no cross-service database access.
- `legacy`: preserved imported projects/notices; excluded from active builds.

Use Node 24.12+ and `npm ci` at the root. Configure workspace `.env` files from their names-only examples, then `npm run dev`. Core needs a MongoDB replica set. Learn is started only when Core's `ENABLE_MODULES` includes `learn`; it needs its own PostgreSQL database and service configuration. The browser uses `/api`; it never connects to another UI application.

`npm run build` builds each active workspace. `npm run test:guards` runs G1-G4; full database checks require explicit disposable fixture inputs. See [development setup](docs/development.md), [free deployment](deploy/README.md), [migration record](docs/monorepo-migration.md), and [P3.2 acceptance status](docs/learn-spike.md).

CVR's exact `cvr.ac.in` domain is active based on user confirmation. Provision explicitly with `npm run provision:hubs -w @collegehubs/core`; no startup reset runs. Unknown domains remain onboarding-only. The default palette remains plum/cream/peach/sky with Abril Fatface and Archivo.

P0?P2 behavior is preserved. Learn currently demonstrates secure sessions and an integrated synthetic roadmap, not complete courses, progress, quizzes or rewards. NumberGuess, MathAmplitude and Sorting Complexity are active in P7.2 with canonical daily rewards. Interview P8.2 integrates private PDF resumes, five frozen questions, saved answers, real Groq feedback and canonical Aura receipts. Local browser acceptance and hosted acceptance are recorded separately; deployment configuration is not proof of deployment.

Historical evidence: [P0.1](docs/p0.1-evidence.md), [P0.2](docs/p0.2-evidence.md), [P1.1](docs/p1.1-evidence.md), [P1.2](docs/p1.2-evidence.md), [P2.1](docs/p2.1-evidence.md), [P2.2](docs/p2.2-evidence.md), [P3.1](docs/p3.1-evidence.md). Historical paths refer to their pre-migration locations. [Third-party notices](THIRD_PARTY.md) remain applicable.

P4.1 durable text channels and socket recovery are complete locally. See [verification and API contracts](docs/p4.1-evidence.md). P4.2 code/resources, literal search and immutable answer threads are also complete locally; see [P4.2 evidence](docs/p4.2-evidence.md). Native Aura is active under P6.1 rules.

P5.1 Study Room lifecycle, private durable drafts, immutable deadlines and atomic closure are complete locally. See [backend contracts](docs/study-rooms.md) and [P5.1 evidence](docs/p5.1-evidence.md). P5.2 is also complete locally: shared-shell solving, comparison, permanent peer reviews and recoverable completion facts. See [P5.2 evidence](docs/p5.2-evidence.md).

P6.1 canonical native Aura, one shared activity day, and college ranking are complete locally. See [scoring contracts](docs/aura.md) and [P6.1 evidence](docs/p6.1-evidence.md). P6.2 cached Codeforces schedules and scoped sample academic calendars are also complete locally; see [provider setup](docs/providers.md) and [verification](docs/p6.2-evidence.md).

P7.1 integrates server-validated NumberGuess in the existing shell. See [Arcade setup and recovery](docs/arcade.md) and [P7.1 evidence](docs/p7.1-evidence.md).

P7.2 completes the three ranked Arcade games and shared catalogue. See [P7.2 evidence](docs/p7.2-evidence.md). Other legacy games remain unavailable.

P8.1 completes independent Interview sessions and private text-only PDF upload/review/delete in the shared shell. See [Interview setup](docs/interview.md) and [P8.1 evidence](docs/p8.1-evidence.md). P8.2 adds the full practice journey; see [P8.2 evidence](docs/p8.2-evidence.md).
