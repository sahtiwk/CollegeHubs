# TP11.2 — release acceptance work in progress

Started 21 October 2026. This is a working evidence register, not a completion certificate.

## Current deployed baseline

TP11.1 deployment/restore checks remain historical evidence. Subsequent changes:

- Brevo verification delivery is enabled on Core revision `90980bb4c263bd022527a307fe60feed0eaa3491`, deployment `dep-dbbr1uon74is739ekdg0`. A permitted delivery test was accepted and recorded as delivered. Real signed-in challenge consumption remains pending.
- The operator explicitly approved clearing all ten accounts and associated data. The reset completed at `2026-10-20T18:31:05.523Z` (21 October in India). All four databases were checked empty of targeted account/activity records; configuration and curriculum hashes were preserved. All four services returned HTTP 200 after resuming; a former login returned 401. Existing backups and provider logs were excluded from the approved reset.
- The release branch is `codex/tp11-release`; older TP11.1 manifest artifact IDs describe the original rollout, not these subsequent changes.

## Remaining acceptance register

| Item | Status / required evidence |
| --- | --- |
| Password email verification | Accepted and closed by owner; real alternate-college-email challenge consumed. Independent live replay/password-registration checks are not claimed |
| Google sign-in and explicit linking | Accepted and closed by owner; user completed Google sign-in and live UI reports linked. Separate live explicit-link journey is not claimed |
| Academic events | Two official CVR IV B.Tech date windows imported live with all-day version-2 boundaries; Google Calendar file import previously passed 2/2 |
| Google Calendar integration | Deployed and enabled; owner completed consent. First hosted sync succeeded and both date windows are visible in the separate Google calendar. Second hosted sync succeeded without an extra Google event; update/cancellation/disconnect guards have local test coverage |
| Codeforces binding and bonuses | Live ownership and rating 1297 accepted; 2594 external Aura applied, repeat reconciliation delta 0 |
| LeetCode statistics/contests | Contests available through Clist; direct statistics/bonus remain disabled pending supported access and ownership proof |
| Clist contests | Approved free account configured privately; hosted fetch and UI passed with 14 contests, including four LeetCode contests |
| Local inference | Pinned model/runtime installed with owner approval; warm schema probes passed, cold first request timed out. Grading/public-host certification remains blocked |
| Interview streaming and voice | Bounded streaming and on-device voice implemented locally; real local/Groq stream probes passed. Chrome spoken dictation passed by owner report; Vivaldi returned no transcript. Hosted rollout pending |
| Optional GPU visual | Real Intel rendering/device-loss and frame/interaction samples passed; oversized chunk and unmeasured memory/lower-end matrix keep static default |
| Dependency advisories | Explicit full npm audit reports zero advisories after local upgrades; broader visual checks and deployment pending |
| E0–E10, failure/security checks | Integrated fixture: 177 passed, zero failed/skipped. This does not substitute for remaining hosted/load gates |
| Performance/load/cold starts | Declared workloads and percentile measurements pending |
| Usability | Closed for this release by owner decision (21 October): owner will conduct the five-person study later; no participant results claimed |
| Documentation / final manifest | Update current status and final artifact correspondence after acceptance |

## Verification environment

Use disposable local MongoDB/PostgreSQL fixtures for load and destructive failure tests. User permits clearly labeled temporary live accounts for real-provider authentication checks with cleanup afterward. Never invent college mailbox possession, ownership evidence, participant results, provider permissions, or benchmark outcomes.

## Dependency work

Initial current audit: 16 findings (9 high, 7 moderate, no critical). Compatible `follow-redirects` and `source-map-js` updates reduce the count to 14. Further dependency review and regression validation are underway. Raw audit evidence is private under `.local/tp111/current-audit.json`.

21 October follow-up: upgraded Google auth library to 11.3.1, Vite to 7.3.7, React plugin to 5.2.0 and React Router DOM to 7.18.4. All workspace builds and 17 targeted identity/mail/deployment tests passed (zero failures/skips). These changes are local, not yet released. Refreshed audit reports eight findings (six high, two moderate), concentrated in the Tailwind 3/nodemon build and development dependency chains. Major stylesheet migration needs visual regression validation; no forced downgrade or blanket audit fix was applied.

## Real-account check — 21 October 2026

The owner signed in using their existing account. The live settings screen reports confirmed mailbox ownership and linked Google; the dashboard displays CVR College of Engineering. A read-only database check confirms active verified membership, email verification method, and a sent email-change challenge consumed at `2026-10-20T18:40:36.855Z`. The private evidence file is `.local/tp111/real-account-verification.json`; it contains no challenge token, password or Google subject. This is the owner's account, not the proposed disposable test registration; do not include it in temporary-account cleanup.

Codeforces statistics are currently disabled in the deployed configuration, despite the profile handle being saved. A handle alone is not proof of ownership. Learn and Arcade progress cards showed unavailable; separate direct readiness probes subsequently returned HTTP 200 for all four services (Core 618 ms, Interview 562 ms, Learn 936 ms, Arcade 5628 ms). These are single readiness probes, not percentile or cold-start evidence, and do not establish that signed-in progress summaries recovered.

Follow-up: Core configuration deployment `dep-dbbrulgm7kps73d13nu0` succeeded on the same `90980bb` source revision with `CODEFORCES_STATS_ENABLED=true`; the live UI now offers ownership review. Bonuses remain disabled until separately validated. Replaced Core development nodemon with built-in Node watch mode; the latest full audit reports seven remaining findings (five high, two moderate). The install command summary reported zero, but the explicit full audit is authoritative. Clarified unused-versus-consumed verification-link wording locally; web build passed. Live email replay is still unproven: reopening the URL alone does not submit the confirmation. Local concurrent consumption/replay guards passed previously.

Codeforces live ownership review passed for binding version 2 after replacing the overlong proof with a 25-character, 128-bit random challenge. Commit `95b2afe` corrects future generation locally; 11 external-provider tests passed with real disposable MongoDB and zero skips. The owner supplied the new proof on their profile and the real provider adapter verified it. An immediate separate statistics refresh returned unavailable (the adapter enforces a shared three-second request budget); no snapshot or bonus was claimed. Respect the normal retry cooldown. Private evidence: `.local/tp111/codeforces-verified.json`.

Owner scope decision: five-person usability testing is excluded from the current release gate and retained as an owner follow-up. This closes the release requirement without representing the study as executed. Tailwind upgraded to 4.3.3 with its PostCSS plugin; all workspace builds pass and the explicit full npm audit now reports zero findings. Desktop landing inspected locally; broader visual checks remain underway.

Full disposable integration run: 177 tests passed, zero failed/skipped (55.36 seconds); source log `.local/p32-guards.tap`. Local serial read probe: 100 samples each for `/api/me`, `/api/me/hub`, `/api/me/module-progress`; p95 9.34/6.57/8.03 ms respectively, zero failures. This does not satisfy the 40-user N2 workload or hosted performance gates. Official CVR IV B.Tech 2026-27 PDF reviewed visually; two upcoming date windows prepared and schema-validated in `services/core/config/calendars/cvr-iv-btech-2026-27.json`. Live import not performed: automatic approval review rejected the combined preparation/dry-run command without a specific rationale.

Calendar follow-up supersedes the preceding import blocker: the explicitly authorized retry validated and imported both events into CoreDatabase1 (2 validated, 2 seeded). The source is CVR/DA/June/2026 dated 02 June 2026, IV B.Tech 2026–27. Google Calendar imported the exported file into the separate **CollegeHubs import check** calendar and reported **Imported 2 out of 2 events**. Evidence: `.local/tp111/google-calendar-import.png`. This proves file import, not ongoing synchronization or duplicate handling.

21 October API setup: owner approved API activation and terms; Google Cloud now reports Calendar API **Enabled** in project `carbon-storm-512208-n5`. Evidence: `.local/tp111/calendar-api-enabled.png`. `calendar.app.created` is staged for approval, not saved or granted to a user. No sync credentials or worker exist yet.

Local calendar correction: optional `allDay` imports require both boundaries at midnight in the source timezone. ICS uses date-only DTSTART/DTEND, preserving the exclusive end date, including across DST. Existing timed-import hashes remain unchanged. The CVR source file is version 2 with all-day flags; live rows remain version 1 until rollout. Eight calendar tests passed with disposable MongoDB, zero skips/failures; web build passed. Existing optional shader bundle-size warning remains.

Calendar configuration follow-up: owner approved saving `calendar.app.created`, then creating and storing an additional existing-client secret. Both Google changes completed. Private `.local/staging/google-calendar.env` and Render Core contain client ID, secret, encryption key and `GOOGLE_CALENDAR_SYNC_ENABLED=false`; Render **Save only** was used, with no deploy. Evidence: `calendar-scope-saved.png` and `calendar-render-config.png` under `.local/tp111/`. No real user calendar grant has been exercised yet.

Local managed sync now includes encrypted account-bound tokens, single-use connection nonces, origin/header checks, membership-aware leased worker, persisted scan cursor, stable remote IDs, conditional updates, versioned cancellations and disconnect. Seventeen targeted calendar/deployment tests passed with zero failures/skips, including disposable MongoDB integration and mocked Google responses. Web and Core builds passed before the final reconnect guard refinement; final rollout still requires build/browser validation. Updated privacy notice describes calendar data and token storage; publication approval remains pending. No production code or all-day version-2 import was deployed in this work.

Release preparation follow-up: owner approved the updated calendar privacy notice for publication. Final Web/Core builds pass. The integrated disposable regression run now reports 179 passed, zero failures/skips (56.99 seconds). The local browser fixture now explicitly enables Core sessions to match the shipped browser authentication contract. Google credentials remain disabled on Render pending source deployment and live consent acceptance.

Calendar rollout — 21 October 2026: source revision `968fc7635ebdcc713f6d0be5ba8f5389f88f1a1e` was pushed to GitHub and deployed successfully to Core (`dep-dbc4qb3bc2fs73ba57rg`). The approved updated privacy notice is publicly available. Live CVR version-2 all-day import validated and applied both events (2 validated, 2 seeded); the signed-in dashboard shows 22–28 October and 29 October–10 November inclusive. The matching ICS export was regenerated. The sync enable flag was saved as true and a second pinned deployment (`dep-dbc4tfm1egvs739h87j0`) started. Real Google consent/sync acceptance remains pending; deployment alone is not acceptance evidence.
`dep-dbc4tfm1egvs739h87j0` subsequently reached Live (1m03s); Core readiness returned HTTP 200. Screenshot: `.local/tp111/calendar-sync-enabled-live.png`.
Live account dashboard now exposes Google Calendar sync and successfully prepares a connection. Both browser-control activation attempts left Continue with Google unchanged, with no OAuth tab or surfaced console error. Owner was asked to click manually to distinguish browser popup behavior from client initialization. No Google calendar grant or sync success is claimed. Screenshot: `.local/tp111/calendar-connect-ready.png`.

Real Google Calendar acceptance — 21 October 2026: owner completed the consent flow manually. CollegeHubs reports Connected; the hosted worker recorded a full successful sync at `2026-10-21T05:36:52.004Z`, with no lastError. Google Calendar UI confirms a separate **CollegeHubs academic calendar**, containing the practical/preparation window **22–28 October** and examination window **29 October–10 November**, both all-day. The event detail retains the official CVR reference and source PDF link. The earlier **CollegeHubs import check** calendar remains a separate file-import copy, not a duplicate created by synchronization. Evidence: `.local/tp111/calendar-live-sync-status.json`, `google-calendar-live-events.png`, and `google-calendar-event-detail.png`. No live source cancellation or disconnection was performed against the real academic events; those behaviors retain local integration/adapter coverage.
Repeat-sync acceptance: the hosted worker completed another full pass at `2026-10-21T05:38:48.779Z`, with no error. After reloading Google Calendar, the examination window still appears once in the managed calendar (alongside the separate earlier file-import copy). CollegeHubs displays the new full-sync time after reload.

Coding platform rollout preparation — 21 October: real Codeforces statistics refreshed on the hosted service for verified `sahtiwk`: current rating 1297, fetched `2026-10-21T05:45:21.701Z`. Expected external bonus is 2594 under the existing current-rating formula; activation/reconciliation is pending. Eleven external-account tests passed. Owner approved Clist Google sign-in, free registration, and private API key storage/use. Authenticated documented Clist v4 API returned HTTP 200 and 14 contests across LeetCode, AtCoder and CodeChef (four LeetCode contests). New bounded adapter keeps credentials in the Authorization header, rejects unsafe URLs, assumes documented unformatted UTC dates, and stores independent leased provider snapshots. API/UI source selection added; Web/Core builds passed, 20 targeted tests plus the new provider-isolation test passed with no failures/skips. LeetCode direct statistics remain blocked: no supported statistics/ownership access established and current terms prohibit scraping (https://leetcode.com/terms/). Clist supplies schedules only; no LeetCode score or ownership is inferred from them.

## Coding platform hosted acceptance - 21 October 2026

Core source `31c06b4bf50cbc005e566c9000fad3ebab2dae05` deployed successfully as `dep-dbc567tg1s2s7393j8ag`. Approved Clist credentials and the external bonus flag are configured privately. The live progress UI shows verified sahtiwk, rating 1297 and external/total Aura 2594, with engagement unchanged at zero. A guarded operator transaction reconciled the fresh hosted snapshot against the unchanged verified binding and membership; repeating it applied delta zero. This is reconciliation acceptance, not a claim that a second provider refresh occurred. Evidence: `.local/tp111/codeforces-bonus-first-application.json`, `codeforces-bonus-acceptance.json`, and `codeforces-live-bonus.png`.

Hosted Clist fetch succeeded at `2026-10-21T10:24:47.052Z`: 14 saved contests, no error. Browser source selection and Check schedules displayed those contests with source links and local times, including four LeetCode contests. Evidence: `.local/tp111/clist-hosted-schedules.png`. Direct LeetCode statistics, ownership and bonus remain unavailable; schedules do not establish those capabilities.
