# P11.2 release evidence — 2026-10-11

Status: **P11.2 release package complete for the password-login MVP**, combining the dated feature demos, P11.1 hosted evidence and the new verification below. Coverage limits are explicit; this is not production/security certification.

**TP0.1 status correction — 18 October 2026:** The P11.2 observations below are preserved as historical evidence. Their statements that P10 is unimplemented/deferred describe that earlier release slice and are superseded by [P10 hosted activation on 11 October](p10-hosted-evidence.md). P10.1 topic suggestions/import and P10.2 bounded module summaries are mounted in current source. [Transition baseline](transition-baseline.md) records the newly repeated local builds/guards; it does not revalidate hosted availability or repeat the earlier browser/load rehearsals.

## Release identity and scope

Tier 2 password-login MVP: shared React/Vite frontend, Core community/Study/Aura/schedules, three ranked Arcade games, five-question Interview practice and seeded DSA/Web Learn with quizzes/mastery. P10.2 and P10.1 remain unimplemented. Google OAuth is excluded from the deployed scope.

Backend artifact baseline: `79cb9585b25ba4bc5ad7cabc6deb7a10db1d62f6`; P11.1 evidence commit `286d4ca`. P11.2 changes About and documentation, not backend behavior, database schemas or reward policies. The commit containing this document identifies the release-documentation revision. Node 24.12+, event envelope schema 1, native rules `native-v1`, Arcade `numberguess-v1`/`mathamplitude-v1`/`sorting-v1`, Learn schema 2/curriculum and question bank `demo-v1`. Preserve stored rule activation times and immutable facts.

Hosted artifact IDs, origins and dated provider observations are in [P11.1](p11.1-evidence.md). About from commit `440c92d94aefff8d695e63d43eda6e9d28a92945` is verified on the live Pages site; served asset `/assets/index-UTzbHQh1.js` contains the new free-demo disclosure and no old Google Calendar export promise.

## C1/C2 traceability

| Requirement/demo | Actual evidence | Scope/remaining boundary |
|---|---|---|
| FR1 Hub; Demo1 | G1/G2; P1 evidence; P11.1 real CVR registration/four channels; prior two-theme browser checks | Password domain does not prove mailbox; Google excluded |
| FR2/3/7 messaging, code and academic content; Demo2 | G1/G3; [P4.2](p4.2-evidence.md); new Core chat writes during each local module outage | Four-person/two-Hub browser rehearsal passed locally; no hosted multi-Hub claim |
| FR4/NFR5 Study; Demo3 | G4; [P5.2](p5.2-evidence.md); hosted P11.1 Core restart; new four-client/two-room HTTP rehearsal | Acknowledged saves only; four isolated browser sessions verified in the follow-up below |
| FR6 Aura; Demo4 | G3; [P6.1](p6.1-evidence.md) real native 50; P11.1 four qualifying module receipts | Plan's exact113/183/203 is synthetic arithmetic, not claimed live AI output |
| Modules; Demo5 | [P7.2](p7.2-evidence.md) three real server games; [P8.2](p8.2-evidence.md) real Groq and pending recovery; [P9.2](p9.2-evidence.md) quizzes/mastery; P11.1 hosted journeys | Local fixture AI is mocked; only separately recorded Groq runs are live-provider evidence |
| FR5 schedules; Demo6 | Existing schedule guards and [P6.2](p6.2-evidence.md), P11.1 hosted Codeforces cache/sample labels | No LeetCode/CodeChef/Google export or official academic-calendar claim |
| NFR1 responsiveness | New local HTTP draft acknowledgements51–57 ms for four concurrent saves | Four samples, no percentile/production latency claim; Render cold starts remain |
| NFR2 concurrency | Four HTTP clients, two users in each of two Hubs, concurrent draft saves, restart recovery | Four separate-origin browser sessions added below; not a load benchmark |
| NFR3 security | Current101 guards, scoped ownership, one-use grants, exact Origin/CSRF and immutable receipts; prior hosted gateway checks | No security certification; bearer localStorage/revocation and password-domain risks persist |
| NFR4 responsive theme | Prior feature 360 px/two-theme evidence; new About desktop/mobile/focus check | Unchanged feature mobile/keyboard checks reuse dated P7.2/P8.2/P9.2 evidence; new About independently checked |
| Microservices | Four deployed artifacts from P11.1; fresh local stop/restart for every module; no active sibling runtime imports found | Shared gateway/Atlas risks; per-service full hosted failure matrix not claimed |
| Cross-feature | Shared shell/auth/theme and feature source integrations; no active standalone frontend | P10 summaries/weak-skill recommendations deferred |

## New verification

`npm run build` passed all five buildable workspaces (web193  Vite modules, Arcade/Core/Interview syntax, Learn TypeScript). Existing G1–G4 plus schedule regression invocation passed **101 tests, zero failures, zero skips**, 41.72 seconds, through the real disposable Mongo replica set/PostgreSQL fixture. No new broad automated suite was added.

An earlier run passed 99 and failed 2 (the G4 restart subtest plus parent) with `Core start timed out`. A fresh fixture run passed without changing assertions, extending the 15s timeout or editing backend code. Both TAP reports are retained under ignored `.local/p11-evidence/p112-{first,final}-guards.tap`. This is a recorded local startup flake, not proof of a resolved production defect.

Manual four-client HTTP rehearsal used two separate Hubs and five-minute rooms `6aca8e85ca8ca9306c866c90` and `6aca8e85ca8ca9306c866cd8`, deadlines `2026-10-10T19:19:13.354Z` and `2026-10-10T19:19:13.489Z` (2026-10-11 IST). All four saves acknowledged revision 1 in 51,57,54,57 ms. Cross-Hub room reads returned 404; peer submissions before close returned 409. The first manual probe incorrectly expected403 for pre-close access; corrected to the documented 409 without changing service behavior. An early closure probe ran before the deadline and saw active, correctly; no deadline was accelerated.

Core was actually stopped/restarted with fixture Mongo retained. Every client recovered its own exact source/revision and original deadline while rooms were active. Closure results are recorded below only after the deadline has elapsed.

| Local stopped process | Module response | Core `/me` | Core Aura | Core message write | Healthy siblings |
|---|---|---|---|---|---|
| Arcade |503|200|200|201|Interview/Learn 200|
| Interview |503|200|200|201|Arcade/Learn 200|
| Learn |503|200|200|201|Arcade/Interview 200|

Each process was restored independently. These are process-isolation checks, not provider/DB failure injection. Prior own-DB probes, Learn outage and hosted independent Interview redeployment remain in P11.1; provider/evaluation failure and immutable recovery are covered by existing G2/G3 and P8.2 evidence.

About was visually checked with the real local browser at desktop and 360 px. It uses shared plum/cream/sky tokens, wraps into one mobile column and has visible keyboard focus. It contains no animation, new font binary, team portrait fetch or unsupported feature promise. See [mobile screenshot](screenshots/p11.2-about-mobile.png).

## C4 security review

- Required secrets and separate own-DB credentials: P11.1; no new secret/config exposure introduced. Google audience checks exist in guards, but Google login remains excluded from hosted claims.
- G1–G4 pass with real disposable databases; hosted Origin/CSRF/cookie/replay and served-bundle secret checks remain dated P11.1 observations, not a newly repeated full audit.
- Manual source search of active apps/services/contracts/scripts/deploy found no legacy application, Next or Clerk imports. `pdfjs-dist/legacy/build` is a dependency entry, not legacy app coupling.
- Bounded PDF parse/signature/deletion, server grading, literal source/feedback display and protected maintenance boundaries remain covered by existing guards and feature evidence.
- No new provider, paid fallback, permission expansion or infrastructure mutation was introduced by this work.

## Free tier and C6 release boundaries

P11.1's 2026-10-10 account observations remain the latest verified budget snapshot: four Render Free services, Pages, Atlas FREE, Neon Free, no paid worker/keepalive or automatic paid fallback. No live bill/usage total for 2026-10-11 is inferred. This configuration supports intermittent demos, not four continuously awake services. Shared quotas, sleeping APIs, AI rate limits, shared physical Atlas and gateway availability remain disclosed.

Completed: current README/service setup, public About claims, demo instructions, source/provenance record, build/regression, local module-stop probes and four-client recovery. Current [rollback](rollback.md) and [deployment](deployment.md) remain operational references.

**Coverage boundaries:** the four-browser rehearsal and module-stop/fault checks are local. Hosted end-to-end journeys, credentials, actual restart/redeploy and provider observations are the dated P11.1 results, not a full hosted chaos matrix. Existing feature mobile/keyboard, PDF/provider-failure and reward-recovery evidence is reused for unchanged code. Source/font/content provenance is inventoried with preserved notices, not legal or human assessment certification. Google OAuth, optional P10 features, production-scale availability and a live quota-exhaustion experiment remain excluded. No paid resource or fallback was added.
## Four-session browser follow-up

The optional `P112_FOUR_BROWSERS=true` fixture adds a second loopback Vite port and one synthetic Sky peer. Four origins (`localhost`/`127.0.0.1`, ports 5182/5187) provide independent localStorage sessions without changing production CORS. Only the primary origin is used for module handoff. The four actual browser identities were CVR host/peer and Sky host/peer; rooms were prepared through the real API, then all four browsers edited and saved their own revision 2.

Rooms `6aca8ff92264fc39ba2eaf07` and `6aca8ff92264fc39ba2eaf4f` retained deadlines `2026-10-10T19:25:25.530Z` and `2026-10-10T19:25:25.632Z`. Each showed live room updates connected. Stopping Core changed both Hubs' UI to disconnected, with no peer draft exposed. After restart and peer reload, the browser recovered exact revision 2 text and reconnected with the same deadlines. CVR channel message persisted as sequence 1 while Sky's simultaneously connected DSA channel remained empty. Both cream/plum and sky/cream themes were visually observed.

The earlier HTTP-only rooms also reached review naturally with closeCount 1, all four revision 1 sources intact, unchanged deadlines and 409 late writes. Evidence is retained in `.local/p11-evidence/p112-two-room-closed.json`. No clock/deadline shortcut was used.

A fresh hosted readiness check on 2026-10-11 returned 200 for all four APIs: Core 33.1s, Arcade 23.4s, Interview 23.1s, Learn 24.6s. These sequential wake-up samples are neither warm-latency measurements nor uptime guarantees.

## Final closure and publication

The four-browser rooms closed naturally at their original deadlines. All four owned sources remained revision 2; both rooms report `review` and `closeCount: 1`; every attempted new late revision returned 409. Browser comparison showed only the correct Hub participants, and a synthetic peer review persisted after reload. The fixture stayed live across the overnight interruption; no deadline or source was modified to obtain closure. The final optional-four-browser guard run passed **101/101, zero skips**, 42.12 seconds. Reports are retained in `.local/p11-evidence/p112-four-browser-{guards.tap,closed.json}`.

Schedule transport timeout was injected only locally: the browser kept its original 00:50 IST last-good timestamp, marked the cache stale and retained real cached Codeforces entries. Core identity/Aura/message probes remained 200/200/201, with all modules ready. Module UI navigation, back/forward and cookie bootstrap rendered Arcade, Interview and Learn in the shared shell.

Commit `440c92d` was pushed to `sahtiwk/CollegeHubs` and automatically deployed. The Render Interview dashboard confirmed Free, Live, commit 440c92d and deployment `dep-db590ph5efls73af0h8g` in 51.8 seconds. Pages content was verified through both the served bundle and the browser. See [hosted About](screenshots/p11.2-about-hosted.png) and [Sky room closure](screenshots/p11.2-room-sky-closed.png). Subsequent evidence-only commits do not alter runtime code.

A second post-deployment readiness run on 2026-10-11 at about 09:26 IST again returned 200 for Core, Arcade, Interview and Learn (32.7/23.2/33.3/24.7 seconds including wake-up). No service plan was upgraded.
