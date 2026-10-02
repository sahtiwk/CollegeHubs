# Study Rooms backend (P5.1)

P5.1 implements Core-owned synchronized individual solving. P5.2 supplies the shared-shell editor, timer, comparison UI, persisted peer reviews and completion award facts. There is no judge, source execution, co-editing, pause, extension or force-close endpoint. Aura remains inactive.

## Lifecycle and storage

Create a waiting room in a current Hub channel with one of the two original, versioned problem seeds (balanced brackets or first occurrence), a 5-60 minute integer duration, and a unique `clientRoomId` (16-80 letters/digits/underscore/hyphen). Creation atomically stores the host's empty solution. Identical retries return the same room; changed creation payloads conflict. Up to eight participants can join while waiting. Only the host can start, with at least two participants. Existing participants can reconnect at any time. New late joins fail.

MongoDB assigns `startAt` and `endAt` once. Repeating start never changes either. Room state is `waiting -> active -> review`; problem, duration and channel are frozen copies. Each participant has one `StudySolution`, initially revision 0. An early submission freezes that person's acknowledged revision; it does not end the room or expose source. Everyone waits for the same deadline. A disconnected participant is retained and their acknowledged draft is sealed normally.

Drafts accept literal source (including empty strings) up to 32 KiB UTF-8, one seed-allowed language, `expectedRevision` and `revision = expectedRevision + 1`. The ordinary 64 KiB JSON transport cap still applies. Identical retry of the latest persisted revision succeeds even after closure; altered or stale revisions conflict. Empty drafts are explicit empty outcomes, never qualified participation. Source is never executed. A later successful revision supersedes older replay IDs: synchronize before editing after a stale conflict.

Save/submit transactions contend on the **same room write fence** as close. Database `$$NOW` validates that `endAt` is still in the future, both before the solution write and at the final fence. A stalled operation crossing the deadline rolls back. The final successful fence is the write's ordering point; majority commit/ack can arrive later. Close contends on that fence, atomically moves the room to review, and seals at most eight solutions with source hashes, empty/submitted outcomes and one close timestamp/count. No partial comparison becomes visible. Repeated/concurrent workers do not reseal. Browser or Core wall-clock changes cannot extend a deadline.

The one-second scanner reads DB time and uses the `(status,endAt)` index, up to 100 due rooms per pass, without overlapping its own ticks. It runs a recovery pass before Core starts listening; larger backlogs continue in later batches. Individual closure failures are logged without source or credentials and retried. Authorized room reads also recover overdue work. Free-host sleep can delay processing, but saves after the stored deadline fail. There is no always-on scheduler or closure SLA.

The database-time and conflict approach follows [MongoDB update pipelines](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateone/) and [transaction write conflicts](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/). Local behavior is tested against MongoDB 7.0.14; hosted Atlas acceptance remains P11.

## HTTP contract

All paths below begin `/api/study-rooms`. Current verified Core JWT membership, the stored Hub and the current channel authorize each operation. No caller-selected Hub, user, host, timestamp, deadline, status or score is accepted. Foreign/missing-Hub rooms and same-Hub nonparticipant private reads return 404. The host has no special source-reading privilege.

| Method/path | Request | Result |
|---|---|---|
| GET `/problems` | No selectors | Up to 20 current versioned Hub-local seed problems; first access idempotently provisions them. |
| GET `/time` | No selectors | DB `serverNow` in UTC. |
| GET `/` | `channelId`, optional `beforeId`, `limit` 1-50 (default 20) | Waiting rooms plus caller's rooms, newest first, source-free room DTOs and `hasMore`. |
| POST `/` | `channelId`, `problemId`, `durationMinutes`, `clientRoomId` | 201 with durable room/own solution snapshot, including on identical retry. |
| GET `/:id` | No selectors | Participant-only room, own solution and DB time. |
| POST `/:id/join` | `{}` | Waiting-only enrolment; existing participants safely reconnect. |
| POST `/:id/start` | `{}` | Host-only start; immutable retry. |
| POST `/:id/draft` | `expectedRevision`, `revision`, `language`, `source` | Durable own revision; 409 on stale/frozen/deadline conflict. |
| POST `/:id/submit` | `draftRevision` | Freezes latest acknowledged own revision; identical retry is safe. |
| GET `/:id/submissions` | No selectors | Participant-only sealed solutions after review; before close 409 `STUDY_PRIVATE`. |

Snapshot shape: `{room, ownSolution, serverNow}`. The room has `_id, hubId, channelId, hostId, problem, durationMinutes, participantIds, status, version, startAt, endAt, closedAt, closeReason, closeCount`. The private solution has `_id, userId, revision, source, language, savedAt, submittedAt, sealedAt, outcome, sourceHash`. Pre-close snapshots never contain peers' sources. Room `version` tracks lifecycle changes; own solution `revision` tracks source changes. Lists are discovery data, not deadline authority: open/sync a room before acting.

Service errors use `{error:{code,message,retryable}}`; existing shared auth/parser errors retain their compatibility shape. Failed/unconfirmed requests must synchronize or retry the same creation/revision input, never assume success. A successful acknowledgment follows durable transaction commit. Network loss after commit is recoverable. Unsent keystrokes have no persistence guarantee.

## Socket contract

Use the existing authenticated `/core` namespace and exact Origin allowlist. `study:join`, `study:start`, `study:draft:save`, `study:submit` carry `roomId` plus the corresponding HTTP body. `study:sync` accepts `{roomId}` and returns a fresh private snapshot. `time:sync` accepts `{}`. Each requires an acknowledgment callback. `study:join` enrolls a waiting participant; `study:sync` only reconnects an existing participant. Subscription names are server-built, never accepted from clients. A socket keeps one study subscription and one channel subscription independently.

`study:state` and `study:closed` carry individually authorized snapshots for each recipient, never a shared source-bearing payload. Draft acknowledgments go only to their author; broadcasts are hints and may be lost or duplicated. Reconnect and periodic sync repair state from Mongo. Room reads can close a due room without emitting a broadcast, so P5.2 must sync at the displayed deadline and periodically. Current membership and channel eligibility are rechecked on fanout and operations; expired sockets use the existing expiry disconnect.

## Operations and safe stop

`STUDY_ROOMS_ENABLED=false` disables only new room creation (retryable 503). Existing joins, drafts, deadlines, comparisons and recovery continue. Leave unset/blank for normal operation. Startup prepares unique room creation and solution ownership indexes, versioned problem keys and due/list indexes. No new service, provider, paid dependency, migration reset or external account is needed. Mongo must support transactions. The guarded disposable reset allowlist includes `problems`, `studyrooms`, `studysolutions`; all original confirmation and synthetic-data checks remain.

Process-local limits: ten new room attempts/minute/user and two new draft attempts/second/user; identical acknowledged retries bypass the draft limit. HTTP 429 supplies Retry-After. These limits reset on restart and are not a multi-instance global quota. The source of truth is shared Mongo; socket delivery remains instance-local without a shared adapter, so clients must repair from snapshots.

Only G1-G4 are automated suites. `node --test tests/guards/study-room.test.js` runs G4 with a local disposable MongoMemoryReplSet if `GUARD_MONGO_URI` is absent; it may download the pinned Mongo binary on first use. With an explicit local guard URI it still creates/drops only its own random `collegehubs_demo_g4_*` database. Never point this at retained data. Full regression uses the existing PostgreSQL/Core/Learn fixture described in development.md.
