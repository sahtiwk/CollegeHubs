# P3.2 integration acceptance

Updated 2026-10-01. **P3.2 local integration PASS. All four checkpoints are complete locally. Hosted deployment remains unverified and release-gated.**

| Decision | Result |
| --- | --- |
| Automated/local API integration | PASS: real Core/Mongo → shared gateway → Learn/PostgreSQL, independent processes |
| Full local integration gate | **PASS**: shared-shell navigation, reload/history, two themes/accounts, 360px keyboard layout, expiry and service/DB outages observed |
| Free-host design | Feasible for intermittent demos; two explicit Free Render web services, Pages frontend/function, separate Core/Learn database credentials |
| Hosted verification | **PENDING**: no public service deployed or assigned URL verified |

## Implemented foundation

One root npm workspace/lock; `apps/web`, `services/core`, `services/learn`, and `packages/contracts`. Source imports and old gateway/Next changes are preserved under `legacy`; the migration map and original-lock preservation are documented in [monorepo-migration.md](monorepo-migration.md). Historical audits `changes.md` and `modules.md` are unchanged.

Core retains existing auth, Hub/feed/theme and reward receipt behavior. CVR is active for exactly the user-confirmed `cvr.ac.in`; fixture provisioning twice produced one Hub and four channels. No retained application database was provisioned/reset. Domain confirmation is not mailbox proof or permission to use college DNS.

Learn is a separate Express/TypeScript API with its own PostgreSQL session store. JSON bootstrap uses exact Origin, one-use state/grants, RS256 verification, host-only path cookies, scoped identity/theme, expiry and CSRF logout. No Next/Clerk listener or Core database import. Unconverted routes return JSON404. Expired SQL sessions/state have bounded cleanup during bootstrap.

The SPA's lazy Learn route stays beneath the Core shell. Its roadmap ports the supplied MargaAI topological tier algorithm, uses shared palette variables, keyboard buttons and an accessible list, and labels all graph data synthetic. Module credentials/private DTOs remain in memory; account changes abort/discard stale work. Module expiry offers reconnect. Course progress, quizzes, rewards and full module journeys are not implemented in P3.2.

## Observed verification

- Initial boundary tests failed as intended for draft CVR and missing Learn HTTP adapter.
- G1–G3: **57 tests passed, zero failed, zero skipped**, with an actual disposable Mongo replica set and PostgreSQL database. Report: ignored `.local/p32-guards.tap`; reproduce using the [development guide](development.md). Includes two real users/Hubs/themes, SQL foreign-owner denial, actual gateway/bootstrap, replay/expiry/Origin/CSRF, SPA coordinator account-switch/logout races, and transactional reward regression.
- Two regression fixture repairs: isolate G1's module environment from the launcher; G3's post-expiry assertion now supplies a current event time instead of the suite's old captured timestamp. Production reward rules were not changed.
- `npm run build`: shared frontend succeeds; Core source syntax validation succeeds; Learn TypeScript compilation succeeds. `npm ls react react-dom --all` shows one React/ReactDOM 18.3.1 pair.
- Separate clean build contexts: `node deploy/build.mjs core` and `node deploy/build.mjs learn` both succeeded with workspace-scoped installs and shared contracts. Learn build dependencies were pruned afterwards. No sibling source/runtime/database was needed.
- Wrangler 4.145.0 compiled the actual Pages Functions. `render.yaml` validated against Render's official JSON Schema and explicitly contains exactly two Free web services, no database/disk/worker/cron resources.
- Production Vite preview served `/`, `/learn`, `/learn/session-check` and their JS/CSS assets successfully. `/api`, unknown Core API and unknown Learn API returned JSON404, never SPA HTML. This is HTTP/build evidence, **not** browser navigation evidence.
- Stopping Learn: Core login, readiness, current user, Hub branding and feed returned 200; Learn readiness returned 503; the SPA document remained 200. Evidence `.local/p32-outage-process.json`.
- Disabling connections to only the disposable Learn DB, with both APIs running: Core's same endpoints stayed 200; Learn readiness became 503. Re-enabling that DB restored Learn readiness to 200. Evidence `.local/p32-outage-database.json`. No shared PostgreSQL cluster shutdown or other database change was required.
- Relocation inventory found no missing tracked source files. Frontend bundle scan found no private-key, database URI or service-key markers. The scoped active-code whitespace check passed; legacy imports retain their original whitespace.

## Browser acceptance - PASS

Browser access initially failed policy verification, then recovered on the ordinary tool retry. No security bypass or alternate control path was used. No user action remains necessary for this check. The older p3.2-plum.png predates the monorepo and is not used as evidence.

- Core/Learn navigation and Back/Forward kept the same development-only data-shell-instance UUID. A document reload or shell remount creates a new random value, so this demonstrates preservation of both document and shell. The marker is omitted in production.
- Reloading /learn restored the protected screen and connected identity without another login.
- CVR displayed cvr-preview / CVR College of Engineering in the requested palette. After Sign out and Sky sign-in, both Core and Learn displayed only sky-preview / Sky College with the alternate sky/cream theme.
- At 360 by 800, document clientWidth and scrollWidth were both 360. Menu focus wrapped from Close using Shift+Tab to Sign out, then Tab returned to Close; Escape restored Menu focus. Enter toggled the accessible list and opened topic details. The viewport override was reset.
- Expiring actual SQL sessions produced an in-shell expiry message. Reconnect restored Learn using Core identity without another login.
- With Learn stopped, its feature displayed unavailable/reconnect while Core feed/branding remained usable. Disabling only its database connections had the same isolated behavior. Restoring the process/database and clicking Reconnect restored the roadmap.
- The walkthrough found two presentation issues: an encoding question mark in graph/list separators, and retained scroll/focus after navigation. Character entities now render correctly; route changes focus main content and scroll to the top while preserving the shell.

Actual screenshots: [CVR desktop](screenshots/p3.2-monorepo-cvr.jpg), [360px mobile](screenshots/p3.2-monorepo-mobile.jpg), [Sky desktop](screenshots/p3.2-monorepo-sky.jpg). All use disposable local fixtures.

## Deployment limits and dependencies

See [free deployment instructions](../deploy/README.md). No hosted PASS, account setup, paid resource, domain purchase, push or public URL is claimed by this work. A reviewed local P3.2 commit records the implementation; nothing is pushed. Preserve actual assigned origins later in ignored `.local/deployment-origins.json`.

Unused Core `axiom`, `googleapis` and `axios` dependencies were removed after checking active imports; compatible audit fixes were applied. The workspace audit still reports six advisories (five moderate, one high), including inherited Vite/esbuild, React Router and Google client transitive dependencies. The isolated Learn production install reports zero; Core production install reports two moderate. Major dependency upgrades and their compatibility verification remain a release follow-up; this is not a clean-audit/security certification claim. Do not expose the development server publicly.

Free quotas/cold starts and account eligibility still require real hosted observations. The design does not promise four always-on services, paid fallback, immediate cross-service revocation, full learning content or a completed curriculum.
