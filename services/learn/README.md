# Learn API

Independent Express/TypeScript/PostgreSQL service for seeded DSA/Web roadmaps, readings, eligible checkpoint/test-out quizzes, server grading, unlocks and first mastery. These are starter practice curricula, not complete certified courses. Core owns identity and Aura.

Run `npm ci` at repository root, configure ignored `services/learn/.env`, build with `npm run build:learn`, and run `npm run dev:learn`. Needs its own `DATABASE_URL`, `APP_ORIGIN`, Core public key/issuer/audience/key ID, `CORE_API_BASE_URL`, distinct `CORE_SERVICE_KEY` and `LEARN_RECONCILE_KEY`. Seeded learning requires no Gemini key. Optional lookup remains bounded and must not introduce paid fallback.

Use the guarded fresh disposable database setup in [Learn operation](../../docs/learn.md); ordinary startup never resets/migrates retained data. `/health/ready` checks this database/schema only. [Deployment](../../docs/deployment.md) · [Release evidence](../../docs/release-evidence.md). Pending immutable events recover through owned reads or service-only reconciliation.
