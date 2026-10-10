# P11.1 deployment runbook

Status: in progress, no hosted acceptance claimed. P11.2 starts after the checks below pass. P10 features remain separate development work.

## Account observations — 2026-10-10

Render: authenticated in Sathwik's workspace, Hobby plan, no payment card, no services, 0/750 free instance hours used, 0/500 included pipeline minutes used. Render and Cloudflare Pages GitHub connections are verified: both list `sahtiwk/CollegeHubs` and open its deployment configuration. The private-repository lock is not an access error. No further GitHub authorization is needed. Core creation is prepared with Free compute; no service has been submitted. All four provider sign-ins are verified. Neon has an existing CollegeHubs project on Free in Singapore, with one `neondb` owned by `neondb_owner`; the dedicated staging database is not created. Atlas isolation verified on 2026-10-10: the three staging users authenticate, have database-wide readWrite on CoreDatabase1, ArcadeDatabase1 and InterviewDatabase1 respectively, can list/access collections in their own database, and are denied reads from both sibling databases. Verification used read-only probes and server-reported write privileges; actual writes/transactions are still pending. Evidence: ignored `.local/p11-evidence/atlas-access-check.json`. These are observations, not promises about future quotas.

The origin repository is `https://github.com/sahtiwk/CollegeHubs.git`. Remote branch discovery returned no branches during preparation. Publish reviewed source before connecting a deployment branch. Never publish ignored credentials. Current local implementation baseline: `f9b55d3`; record the actual deployed commit separately after deployment.

## Deployment order

1. Review source to publish and connect only the CollegeHubs repository to Render and Cloudflare. Use the user's existing accounts; account owners complete sign-in, MFA and GitHub access grants.
2. Confirm all selected resources are Free and no paid fallback is enabled. Four Render services share workspace hours; allow sleep and cold starts. Do not add keepalive jobs. See [Render Free](https://render.com/docs/free).
3. Create a Cloudflare Pages project for the shared frontend and retain its assigned `pages.dev` origin. Root `apps/web`; build `cd ../.. && npm ci --include=dev && npm run build:web`; output `dist`; Node `24.12.0`. Keep production and preview settings separate. Never derive a hostname from the project name without checking its assigned URL.
4. Create three Atlas logical databases with separate restricted users for Core, Arcade and Interview. Use TLS, a Free cluster, and the actual Render outbound ranges. Confirm each credential fails to read a sibling database. Verify transactions using explicitly disposable fixture records. Existing database credentials must be checked, not assumed to be isolated.
5. Create a fresh Neon database `collegehubs_demo_learn_staging` with Learn-only credentials. Confirm it is empty before the guarded bootstrap described in [deploy README](../deploy/README.md). Do not reset an existing database.
6. Generate staging secrets with `node deploy/prepare-staging-keys.mjs`. It writes ignored `.local/staging/credentials.json`, preserves an existing bundle, and changes no database/provider or active `.env`. Core receives `core` values; each module receives only its own `modules` entry. Provision each `provisioning` entry through the Core stdin tool against the explicitly selected staging Core database. Never put the bundle in Git, chat, screenshots or frontend variables.
7. Use `render.yaml` for workspace builds and explicit Free plans. Deploy Core first, then each module. Keep root build context. Set service-specific database URLs; all four services use the exact Pages `APP_ORIGIN`, and Core's `ALLOWED_ORIGINS` includes it. Modules use Core's assigned HTTPS `CORE_API_BASE_URL`. Keep the same JWT secret across restarts; if using the generated staging bundle, replace the Blueprint-generated value before first use. Interview additionally receives the existing Groq key and confirmed Free-account flag.
8. Set Pages runtime variables `CORE_API_ORIGIN`, `LEARN_API_ORIGIN`, `ARCADE_API_ORIGIN`, `INTERVIEW_API_ORIGIN` to verified service origins. Build with `VITE_CORE_SOCKET_ORIGIN` equal to Core's origin. No service key, database URL, RSA private key or Groq key belongs in Pages or Vite variables. Configure Google sign-in only after both frontend and Core are configured for the hosted origin.
9. Record assigned origins in ignored `.local/deployment-origins.json`, together with exact deployed commit and provider deployment IDs. Copy `deploy/origins.example.json` only when no record exists. Do not invent URLs or mark status deployed before checking readiness.

## Hosted exit checks — all pending

- Every API `/health/ready` passes using its own database; unavailable own database returns 503. An optional module failure leaves Core ready.
- SPA deep links and assets work; `/api` routes reach the correct independent backend; secure cookies, Origin and CSRF checks work on the actual Pages origin.
- Sign-in, module bootstrap, Interview PDF upload/real Groq evaluation, Learn assessment and Arcade result deliver rewards exactly once. Verify Linux PDF dependencies on Render.
- Direct authenticated Socket.IO connects to Core; Core restart recovers rooms. No legacy frontend/runtime traffic is required.
- Redeploy or stop one module and confirm Core stays available. Record cold-start behavior and ensure expired grants are not replayed.
- Confirm free plans, actual usage, deploy commit, and no secrets in frontend output. Record evidence before declaring P11.1 complete.

See [rollback](rollback.md) before redeploying a version with active user data. P11.2 records the release demos after these prerequisites are satisfied.
