# CollegeHubs

One React app, one npm monorepo, four independently deployed backends.

| Workspace | Released capability |
|---|---|
| `apps/web` | Shared Vite frontend, login, college theme and lazy feature routes |
| `services/core` | College membership, feeds/channels, code/resources, Study Rooms, canonical Aura, college ranking and cached schedules |
| `services/arcade` | NumberGuess, MathAmplitude and Sorting Complexity with server-validated results |
| `services/interview` | Private PDF text, five-question Groq practice, saved answers and durable reports |
| `services/learn` | Seeded DSA/Web roadmaps, readings, quizzes, unlocks and mastery rewards |
| `packages/contracts` | Shared contracts; no cross-service database access |
| `legacy` | Source references and notices; excluded from active builds |

Live demo: https://collegehubs.pages.dev. Pages serves the frontend/gateway; four Render Free APIs own their data in three restricted Atlas databases and one Neon database. Free services sleep and share quotas. This is an intermittent demo, not an always-on production guarantee. See [deployment evidence](docs/p11.1-evidence.md) and [release verification](docs/release-evidence.md).

## Development

Use Node 24.12+ and run `npm ci` from the repository root. Create/configure private workspace `.env` files using [configuration names](docs/development.md), [deployment instructions](deploy/README.md) and the service READMEs. Never commit credentials or give secrets a `VITE_` prefix. Existing local `.env` files should be preserved.

Run `npm run dev`; enable only configured modules in Core's `ENABLE_MODULES`. Core, Arcade and Interview need their own Mongo databases with replica-set transactions. Learn needs its own PostgreSQL database and the guarded schema setup. Ordinary startup never resets data. No legacy install or frontend is required.

`npm run build` builds/checks all active workspaces. `npm run test:guards` requires the explicitly configured disposable database fixture for complete G1–G4 coverage; skips are not passes. Follow [demo instructions](docs/demo.md) for safe local acceptance.

## Release limits

- Exact `cvr.ac.in` membership is enabled. Password registration does not verify mailbox ownership; Google sign-in is not enabled in the hosted slice. No institutional endorsement is implied.
- Shared Aura is authoritative. External coding-platform bonuses, global rankings, Google Calendar export and other legacy games are not enabled.
- Interview feedback and Learn assessments are practice heuristics. Core downtime can leave saved results with Aura pending until a due read or operator reconciliation.
- P10.2 cross-feature progress polish and P10.1 weak-skill interview suggestions remain future work.
- A shared gateway and shared physical Atlas cluster remain common failure points despite independent backend deployments.

[Demo guide](docs/demo.md) · [Release evidence](docs/release-evidence.md) · [Rollback](docs/rollback.md) · [Source adaptation record](docs/source-document-updates.md) · [Third-party notices](THIRD_PARTY.md)

Dated phase evidence under `docs/p*-evidence.md` preserves historical observations; newer release evidence supersedes old deployment/feature status claims without rewriting history.
