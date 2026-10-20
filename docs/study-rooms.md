# Study Rooms (P5.1 and P5.2)

P5.1 implements Core-owned synchronized individual solving. P5.2 adds the shared-shell editor, timer, comparison UI, persisted peer reviews and completion facts. Both phases are complete locally. There is no judge, source execution, co-editing, pause, extension or force-close endpoint. Aura remains inactive.

## Lifecycle and storage

Create a waiting room in a current Hub channel with one of the two original, versioned problem seeds (balanced brackets or first occurrence), a 5-60 minute integer duration, and a unique `clientRoomId` (16-80 letters/digits/underscore/hyphen). Creation atomically stores the host's empty solution. Identical retries return the same room; changed creation payloads conflict. Up to eight participants can join while waiting. Only the host can start, with at least two participants. Existing participants can reconnect at any time. New late joins fail.

MongoDB assigns `startAt` and `endAt` once. Repeating start never changes either. Room state is `waiting -> active -> review`, with a separate `waiting -> cancelled` exit; problem, duration and channel are frozen copies. Each participant has one `StudySolution`, initially revision 0. An early submission freezes that person's acknowledged revision; it does not end the room or expose source. Everyone waits for the same deadline. A disconnected participant is retained and their acknowledged draft is sealed normally.

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
| POST `/:id/cancel` | `{}` | Host-only waiting cancellation; identical retry returns the retained cancelled room. |
| POST `/:id/draft` | `expectedRevision`, `revision`, `language`, `source` | Durable own revision; 409 on stale/frozen/deadline conflict. |
| POST `/:id/submit` | `draftRevision` | Freezes latest acknowledged own revision; identical retry is safe. |
| GET `/:id/submissions` | No selectors | Participant-only sealed solutions after review; before close 409 `STUDY_PRIVATE`. |

Snapshot shape: `{room, ownSolution, serverNow}`. The room has `_id, hubId, channelId, hostId, problem, durationMinutes, participantIds, status, version, startAt, endAt, closedAt, closeReason, closeCount`. The private solution has `_id, userId, revision, source, language, savedAt, submittedAt, sealedAt, outcome, sourceHash, awardEventId, awardStatus`. Snapshot rooms also include same-Hub participant display names (no emails). Pre-close snapshots never contain peers' sources. Room `version` tracks lifecycle changes; own solution `revision` tracks source changes. Lists are discovery data, not deadline authority: open/sync a room before acting.

Service errors use `{error:{code,message,retryable}}`; existing shared auth/parser errors retain their compatibility shape. Failed/unconfirmed requests must synchronize or retry the same creation/revision input, never assume success. A successful acknowledgment follows durable transaction commit. Network loss after commit is recoverable. Unsent keystrokes have no persistence guarantee.

## Socket contract

Use the existing authenticated `/core` namespace and exact Origin allowlist. `study:join`, `study:start`, `study:draft:save`, `study:submit` carry `roomId` plus the corresponding HTTP body. `study:sync` accepts `{roomId}` and returns a fresh private snapshot. `time:sync` accepts `{}`. Each requires an acknowledgment callback. `study:join` enrolls a waiting participant; `study:sync` only reconnects an existing participant. Subscription names are server-built, never accepted from clients. A socket keeps one study subscription and one channel subscription independently.

`study:state` and `study:closed` carry individually authorized snapshots for each recipient, never a shared source-bearing payload. Draft acknowledgments go only to their author; broadcasts are hints and may be lost or duplicated. Reconnect and periodic sync repair state from Mongo. Room reads can close a due room without emitting a broadcast, so the frontend syncs at the displayed deadline, every five seconds, on reconnect and when the tab regains focus. Current membership and channel eligibility are rechecked on fanout and operations; expired sockets use the existing expiry disconnect.

## Operations and safe stop

`STUDY_ROOMS_ENABLED=false` disables only new room creation (retryable 503). Existing joins, drafts, deadlines, comparisons and recovery continue. Leave unset/blank for normal operation. Startup prepares unique room creation and solution ownership indexes, versioned problem keys and due/list indexes. No new service, provider, paid dependency, migration reset or external account is needed. Mongo must support transactions. The guarded disposable reset allowlist includes `problems`, `studyrooms`, `studysolutions`; all original confirmation and synthetic-data checks remain.

Process-local limits: ten new room attempts/minute/user and two new draft attempts/second/user; identical acknowledged retries bypass the draft limit. HTTP 429 supplies Retry-After. These limits reset on restart and are not a multi-instance global quota. The source of truth is shared Mongo; socket delivery remains instance-local without a shared adapter, so clients must repair from snapshots.

Only G1-G4 are automated suites. `node --test tests/guards/study-room.test.js` runs G4 with a local disposable MongoMemoryReplSet if `GUARD_MONGO_URI` is absent; it may download the pinned Mongo binary on first use. With an explicit local guard URI it still creates/drops only its own random `collegehubs_demo_g4_*` database. Never point this at retained data. Full regression uses the existing PostgreSQL/Core/Learn fixture described in development.md.


## P5.2 solving and comparison

The channel's **Open study rooms** link opens `/channels/:id/study` inside the existing Hub shell. The lobby provides the problem catalog, 5-60 minute duration, waiting-room creation, join/open actions and bounded older-page navigation. Unconfirmed creation retries reuse the exact creation ID and payload. `/study-rooms/:id` shows the problem, participants, timer and private editor. The host starts only after a peer joins.

Use **Save draft** explicitly; no autosave is implied. The editor labels unsaved, waiting, saved, unconfirmed and frozen states. It preserves the exact pending payload when a request is unconfirmed and offers **Retry same save**. Editing is paused during that retry to avoid ambiguity. A conflict with a newer revision preserves local text, offers the current saved draft or an explicit rebase of local text, and never silently overwrites a peer tab's acknowledged work. **Submit and freeze** requires a nonempty, clean, acknowledged revision. Local edits and exact pending saves are held in account/Hub-scoped session storage for up to 24 hours in this tab. Reload/close warns when possible. This is a recovery aid, not a server acknowledgment or a durable backup.

Database time is anchored to `performance.now()` at each successful round trip, including a half-round-trip latency estimate. The countdown uses that monotonic anchor rather than browser wall time, so a +/-120 second wall-clock skew does not extend the room. It is a display estimate, not deadline authority. At zero the editor stops writes and synchronizes. Backend fences remain authoritative during sleep, latency or disconnect.

After closure, sealed solutions appear in two columns on wider screens. At 900px and below, a keyboard-accessible selector shows one solution at a time; switching solutions preserves review drafts. Long source lines scroll inside keyboard-focusable code blocks. Literal code/review content is rendered through React text nodes and the existing allowlisted highlighter. Nothing executes. The source editor is intentionally a plain textarea, without a language server or execution engine. There are no new fonts, theme providers or palette overrides.

## Peer reviews

`GET /api/study-rooms/:id/reviews` returns `{roomId,hubId,items}` only for a current participant of a closed room. `POST` to the same route accepts exactly `{solutionId,body}`; the target must be a sealed solution in that room/Hub and belong to another participant. The trimmed body must be nonempty and at most 8 KiB UTF-8. Reviews on an empty peer submission are allowed but earn no rewards. One immutable review per reviewer/solution is enforced by a unique index. Identical retry returns the original review; changed retry returns 409. Lists are bounded at 56 (8 participants times 7 peers). Invalid fields, foreign solutions, self-review and pre-close writes fail. DTOs contain IDs, body and creation time, never credentials or email. Authorized socket state invalidations and five-second reads refresh the review list.

## Completion facts and recovery

At atomic close, a solution qualifies only if it contains non-whitespace source, a positive acknowledged revision and a saved timestamp. The same close transaction stores `awardEventId = core:study.completed:<solutionId>:v1` and `awardStatus=pending`. Empty solutions remain `ineligible`. The unique Hub/room/user solution plus a stable native business key prevents a second award for the same participant and room. The event occurrence uses the immutable room deadline, not delayed close processing time; server sleep across a calendar day cannot move the participation into a later day.

A bounded reconciler (50 pending solutions per pass) creates the native fact and changes the solution status in one transaction. Due scans, startup scans, authorized own-solution reads and authorized post-close comparison reads retry pending work. An interrupted write or scorer failure leaves the saved solution pending; it never rolls back already sealed work or fabricates an awarded balance. The UI distinguishes pending completion records from inactive scoring.

Live composition stores `rules_inactive` facts and does not award Aura. An internal transaction-only scorer seam is exercised by G3 fixtures; it is not exposed to HTTP or environment toggles. P6 must choose prospective activation/rules and explicit reconciliation policy for inactive historical facts. There is no automatic retroactive award. `settled` indicates the native scorer returned the matching durable receipt. Peer reviews do not earn Aura.

Startup also prepares `PeerReview` and the pending-solution index. The guarded demo-reset allowlist includes `peerreviews` without relaxing its target, confirmation or synthetic-data checks. No new environment names or dependencies were added in P5.2. See [P5.2 verification evidence](p5.2-evidence.md).


## TP4.2 cancellation and save clarity

`POST /api/study-rooms/:id/cancel` accepts exactly `{}`. `study:cancel` accepts
only `{roomId}` and calls the same service. Current membership and participant
checks apply; only the host can cancel a waiting room. The transaction competes
on the same room document as start/join. Start versus cancellation has one winner;
the loser receives 409. An identical cancellation retry returns the retained
snapshot without changing its version or timestamp. Start on cancelled rooms,
new joins, new draft writes, submissions and comparisons are rejected.

Cancellation sets `status=cancelled`, a database-time `closedAt`, and
`closeReason=host_cancelled`, increments version/fence once, and keeps the room
and private solution rows. It does not seal solutions, increment deadline
`closeCount`, create completion facts or award Aura. The due scanner only selects
active rooms. No backfill or data reset is required; existing rows are unchanged.
Deploy the API and UI together before exposing cancellation to clients.

Participant labels report joined, solving, submitted, closed or cancelled.
Snapshots select only participant identity and submission/seal markers, never
another participant's draft source or saved revision. These are workflow states,
not online-presence claims.

The editor separates local text, an unconfirmed request and the server's saved
revision. Saving remains explicit: there is no autosave. Pending retry text is
locked and resubmitted exactly; two-tab conflicts require an explicit choice.
At expiry, unsaved local text remains available to copy while comparisons use
only sealed server source. Revision/fingerprint details are collapsed in review.
Peer notes retain local drafts and exact uncertain retry bodies in session
storage. One permanent review per peer solution remains enforced by the server.

The editorial room screens share the existing palette and typography. A cancelled
room offers another-room navigation; a closed room offers final saved comparisons.
The timer uses monotonic elapsed time anchored to database time and never extends
the deadline based on the browser clock.
