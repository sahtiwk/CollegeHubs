# Schedule providers and academic calendar

For Interview/Learn model providers, see the separate [TP9.1 inference capability
and feasibility evidence](tp9.1-evidence.md). It records the optional Groq adapter,
local-only experimental adapter, and provider-free practice/guidance defaults.

P6.2 review completed 2026-10-03. No paid plan, API key or external-stat bonus is required.

## Codeforces

Use only the fixed anonymous HTTPS `contest.list?gym=false` endpoint. Official [API documentation](https://codeforces.com/apiHelp/) permits anonymous access to public data and limits requests to one per two seconds. The official [method reference](https://codeforces.com/apiHelp/methods?locale=en) documents contest.list and its gym parameter. We use that published API, not scraped pages or private contests. These documents provide API access guidance, not an uptime guarantee or unrestricted redistribution license. UI links identify Codeforces and the original contest pages.

A live request succeeded during verification with five upcoming contests. Their fetchedAt is `2026-10-02T13:49:16.381Z`; that is an observed cache timestamp, not a promise that those dates remain current. Always check the provider before attending.

The adapter accepts at most 4 MiB, 20,000 source rows and 500 upcoming/running normalized contests. It rejects redirects, invalid timestamps/durations, malformed success envelopes and conflicting duplicate IDs. URLs are constructed from validated numeric IDs on codeforces.com. Network and body reads share a six-second deadline. Output is sorted and deduplicated by provider ID; expired contests are filtered from reads. HTTP output is capped at 100 contests. Content is rendered as text.

## Persistent refresh policy

`Contest` stores one bounded snapshot per provider, atomically replacing items and fetchedAt only after successful validation. A MongoDB lease prevents concurrent refreshes across Core instances sharing that database. Successful refreshes wait 15 minutes; failures wait at least five minutes. The lease lasts 30 seconds; a crashed refresh remains subject to the persisted cooldown. Independent deployments using different databases do not share this lease and must respect the provider's aggregate limits.

Authenticated `GET /api/contests` returns the saved cache immediately and schedules a best-effort background refresh when eligible. There is no timer service or delivery guarantee on sleeping free hosts. The first unsuccessful fetch returns status unavailable, fetchedAt null and no invented dates. A failed later fetch preserves the last-good generation and timestamp, and reports stale. Freshness also expires after 15 minutes. The UI's Check schedules action rereads this cache; it cannot override cooldowns. Last-good content survives Core restart.

Set `SCHEDULE_REFRESH_ENABLED=false` and restart Core to stop provider network access. Cache/calendar/chat/Study/Aura remain readable. Empty or unset enables the adapter. No browser-controlled URL, provider credential or forced-refresh parameter exists. Optional schedule failure does not affect Core readiness.

## Other providers

Clist and LeetCode coverage remain disabled: permitted access/free eligibility is not established. Google synchronization remains disabled; academic ICS export is available. TP6.2 adds opt-in Codeforces statistics with ownership review and a separately gated bonus; see the [provider capability matrix](provider-capability-matrix.md) and [external progress operations](external-progress.md). No GitHub statistics adapter is added.

## Academic calendar and export

TP6.1 adds reviewed-source imports, bounded month pagination and authenticated ICS export. Existing samples remain labeled and keep their original dates. See [the operator guide](academic-calendar.md) for import commands, schema, scope, snapshot semantics and Google integration limits.

## Fixtures and operation

G1/G3 use disposable databases and injected provider payloads/timeouts without network access. Fixture payloads remain labeled recorded_fixture when used in UI composition. A test-only preload in `scripts/schedule-timeout-fixture.cjs` requires a local demo Mongo URI and NODE_ENV=test; normal application startup never imports it. `scripts/p32-fixture.cjs` offers schedule-timeout and schedule-disable commands for Demo6. Neither changes last-good items/fetchedAt. These commands must not be used as hosted operational tooling.

The deployment remains the existing free Core/Mongo arrangement with no worker, paid scheduler or new backend. See [P6.2 evidence](p6.2-evidence.md).

## Learn optional Wikipedia lookup (P9.2)

The default `LEARN_RESOURCE_LOOKUP_ENABLED=false` uses approved MDN seed links and requires no external API key. Optional lookup follows the official [MediaWiki Opensearch API](https://www.mediawiki.org/wiki/API:Opensearch) and [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy), checked 2026-10-07. The service sends an identifying CollegeHubs User-Agent with the project repository link. No paid provider or account is required by this adapter; availability and provider throttling remain external conditions.

Only the fixed English Wikipedia endpoint and a server-selected curriculum topic are used, after owner/enrollment/prerequisite checks. One result, 1.5 seconds, 16 KiB, no redirects. Accepted results are HTTPS article links with contributor attribution, not copied article bodies. A SQL lock and persisted cooldown scope each cache to Hub/node: 24 hours after success, one hour after failure. Stale results retain their last successful timestamp; otherwise responses explicitly return seed or unavailable. There is no browser-supplied URL, arbitrary prompt, forced refresh, runtime question generation, Gemini call or YouTube call. Guards inject success/timeout payloads; they do not claim live provider availability.
