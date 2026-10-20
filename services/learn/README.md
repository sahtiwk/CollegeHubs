# Learn API

TP8.2 adds schema v4 path-completion facts, up-to-30 Aura confirmations through Core, and finite optional review after failed assessments. Deploy the compatible Core/Learn code and explicitly provision the path-event scope before applying migration `0004_path_completion`. Readiness supports schema 2–4. See [operation](../../docs/learn.md), [policy](../../docs/aura-transition-policy.md) and [local evidence](../../docs/tp8.2-evidence.md). Repeated checkpoints remain unrewarded; required path progress excludes optional review.

Independent Express/TypeScript/PostgreSQL service for versioned DSA, Web, Machine Learning, Backend and DevOps roadmaps, readings, checkpoint/test-out quizzes, server grading, unlocks and first mastery. `foundations-v1` provides 15 topics and 225 questions after the explicit schema-v3 migration. Existing `demo-v1` enrollments retain their history and offer an opt-in upgrade. These are starter practice curricula, not complete certified courses. Core owns identity and Aura.

Run `npm ci` at repository root, configure ignored `services/learn/.env`, build with `npm run build:learn`, and run `npm run dev:learn`. Needs its own `DATABASE_URL`, `APP_ORIGIN`, Core public key/issuer/audience/key ID, `CORE_API_BASE_URL`, distinct `CORE_SERVICE_KEY` and `LEARN_RECONCILE_KEY`. Seeded learning requires no Gemini key. Optional lookup remains bounded and must not introduce paid fallback.

Use the guarded fresh disposable database setup in [Learn operation](../../docs/learn.md); ordinary startup never resets/migrates retained data. `/health/ready` checks this database/schema only. [Deployment](../../docs/deployment.md) · [Release evidence](../../docs/release-evidence.md). Pending immutable events recover through owned reads or service-only reconciliation.

## Optional progress summaries (P10.2)

See [the read contract and private configuration](../../docs/module-progress.md). Set `MODULE_READ_KEY` to the matching Core read credential; existing Core public-key verification remains required. Missing read configuration leaves optional dashboard progress unavailable; it does not disable ordinary module use.

## Optional Learn practice topics (P10.1)

See [Learn-to-Interview topics](../../docs/learn-interview-topics.md) for the heuristic, one-use import, existing configuration requirements and safe stop. This is locally verified; hosted activation remains pending.
