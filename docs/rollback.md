# Staging rollback

Status: procedure prepared; no hosted deployment or rollback has been performed. There is currently no verified previous hosted artifact.

Before each release, record each service's commit, deployment ID, configuration names (never secret values), database/schema version, seed version, and active immutable reward rules in the ignored deployment record. Retain the previous compatible commit and provider deployment. Confirm the provider's current free dashboard supports the intended operation; do not assume paid shell access.

1. Identify the failing service from its readiness and provider logs. Pause feature traffic to that module if needed; avoid taking down healthy siblings. For Interview AI-only failures, set `INTERVIEW_AI_ENABLED=false` on Interview and deploy the configuration change.
2. Check whether the previous build can read the current database schema and immutable rule versions. If compatibility is unproven, fix forward; do not blindly roll back code. Never delete outbox events, grants, attempts, room state or Aura ledger records to make an older build work.
3. For a compatible backend, use Render's service deploy controls to redeploy the recorded previous commit. Keep its existing database and secrets. If the dashboard does not offer a suitable artifact, use a reviewed Git revert and deploy that commit. Do not reset shared Git history or sibling services.
4. For a frontend-only regression, restore the recorded compatible Pages production deployment or deploy a reviewed revert. Check gateway origin variables as well as static assets; restore changed configuration explicitly. A static rollback alone may not restore provider environment settings.
5. Verify readiness, login/cookies, affected feature routes and event delivery through the shared gateway. Retry pending events only through the service's authenticated recovery mechanism with its own reconciliation key. Confirm no duplicate Aura award and verify healthy siblings remained available.
6. Record the failed deployment, replacement commit, compatibility decision, checks and remaining limitations. Run the affected P11.2 demos again before marking recovery complete.

Database restore/reset and credential rotation are separate operations with different consequences; they are not routine rollback steps. The guarded Learn demo bootstrap refuses existing tables and must never be repurposed as a rollback tool. Preserve existing user data and credentials unless a specific recovery plan requires otherwise.
