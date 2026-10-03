# Schedule providers and academic calendar

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

Clist is optional and **not integrated or enabled**: free account access/quota has not been verified for this installation. No fallback invents another provider's dates. Google Calendar export remains disabled. No GitHub/LeetCode/Codeforces statistics refresh or bonus scoring is added.

## Academic samples and scope

`config/calendar.seed.json` contains clearly named sample DSA and web events for CVR. They are demonstrations, not reviewed official college announcements. No academic dates are auto-installed by normal Core startup. After provisioning Hubs, review the file and run:

```powershell
npm run seed:calendar -w @collegehubs/core -- --confirm-sample-dates
```

The explicit disposable fixture seeds them automatically. Each configured Hub slug and every channel slug must resolve within that same active Hub; all writes run in one transaction. Repeated seeds update the same Hub/seedKey rows. A missing channel rolls back the batch. Sample events do not award Aura. New official college data needs an explicitly reviewed provenance/import change; do not simply relabel these examples as official.

`GET /api/hubs/:hubId/calendar?channelId=<id>` requires the caller's current active Hub and an unarchived channel in that Hub. Foreign/missing selectors fail, extra query fields fail, and a channel returns only its attached events. Up to 100 ordered rows are returned with hasMore, status, seeded provenance, seededAt per item, and India timezone. Calendar fetchedAt is null and stale false because these are installed seeds, not a provider fetch. Past seeds retain their explicit dates; they are not automatically shifted into the future. No write endpoint or calendar export is provided.

## Fixtures and operation

G1/G3 use disposable databases and injected provider payloads/timeouts without network access. Fixture payloads remain labeled recorded_fixture when used in UI composition. A test-only preload in `scripts/schedule-timeout-fixture.cjs` requires a local demo Mongo URI and NODE_ENV=test; normal application startup never imports it. `scripts/p32-fixture.cjs` offers schedule-timeout and schedule-disable commands for Demo6. Neither changes last-good items/fetchedAt. These commands must not be used as hosted operational tooling.

The deployment remains the existing free Core/Mongo arrangement with no worker, paid scheduler or new backend. See [P6.2 evidence](p6.2-evidence.md).
