# Interview API

Independent Express/Mongo service for private PDF text, five frozen practice questions, saved answers and immutable heuristic feedback. Core identity replaces legacy local users; Core owns Aura. No public original PDF URL, voice, RAG, jobs or local admin system is enabled.

Run `npm ci` at repository root, configure ignored `services/interview/.env`, then `npm run dev:interview`. Build: `npm run build:interview`. Needs its own transaction-capable `INTERVIEW_MONGO_URI`, `APP_ORIGIN`, Core public key/issuer/audience/key ID, `CORE_API_BASE_URL`, distinct `CORE_SERVICE_KEY`/`INTERVIEW_RECONCILE_KEY`. Real question/evaluation work uses `GROQ_API_KEY` on the operator's Free account, never in the frontend. PDF limits and provider errors are bounded; no paid fallback.

[Configuration, privacy and recovery](../../docs/interview.md) · [Deployment](../../docs/deployment.md) · [Release evidence](../../docs/release-evidence.md). Saved reports can remain Aura pending during Core downtime; retry delivery rather than re-evaluating. `/health/ready` checks its database, not Groq availability.
