# P2.2 event delivery and reconciliation

Core owns Aura. Modules own immutable domain results and send facts, never rewards. This package has no database dependency. The P2.2 Core endpoint and transaction skeleton exist; normal startup has **no active scoring rules**. Only explicit server-side `createApp({auraRules})` / `createAuraEventService({rules})` fixture injection accepts a `fixture-*` version. There is no environment/browser activation switch. P6 activates versioned production rules and native events; P7/P8/P9 implement the actual module adapters. Existing Core UI totals are not switched to this fixture ledger.

## Authenticated ingestion

`POST /api/aura/events`, JSON at most 64 KiB, `Authorization: Bearer <keyId>.<secret>`. Use HTTPS outside a local fixture. Origin/Sec-Fetch-Site browser requests and Core login JWTs are rejected. Credentials must be active, system-scoped, and explicitly allow the event type in `ServiceCredential.eventTypes`; their service must match `source`. Provisioning still grants no event scopes by default. No module can read/write Core collections.

See [module-events.schema.json](module-events.schema.json). All fields are required and unknown fields are rejected, including awardedAura, code, answer text, and resume text. Times use canonical UTC milliseconds. IDs are strings. Numeric facts are bounded integers. Structural validation alone does not authenticate or prove a game/quiz result: the module must validate it on its own server before freezing it.

Core checks the retained consumed grant's module/JTI/user/Hub, current active user/Hub/college, and membership version. Completion must occur at or after consumption and strictly before access expiry. Delivery may occur after access expiry but within 30 days of occurrence **and** the binding's retention. A result cannot change accessJti, occurrence time or facts to extend this window; outside it, retain for manual review. Expired access never becomes valid again for module APIs.

Supported facts: `arcade.game_completed` (gameId numberguess/mathamplitude/sorting, rulesVersion, outcome success/failed/casual, integer serverDurationSeconds 0-86400); `interview.completed` (integer rawScore 0-100, answeredCount 0-5, questionCount 5, duration 0-86400, rubricVersion); `learn.quiz_completed` (nodeId, mode checkpoint/test-out, attemptId equal sourceId, boolean passed consistent with 3/5 or 8/10 threshold, correctCount/itemCount, curriculumVersion); `learn.node_mastered` (nodeId, curriculumVersion, masteryMethod checkpoint/test-out, sourceId=nodeId:curriculumVersion). Every metadata object also carries sourceId, accessJti, and domainVersion. Deferred daily-challenge/path/native events are not accepted on this module endpoint.

## Stable identities and receipts

Create the event once with the domain result, for example `interview:<sessionId>:completed:v1`, `arcade:<sessionId>:completed:v1`, `learn:<attemptId>:quiz:v1`, or `learn:<nodeId>:<curriculumVersion>:mastered:v1`. Use immutable server IDs; long composites can use a SHA-256 hex digest. Maximum 160 characters, ASCII letters/digits/underscore/dot/colon/hyphen, first character alphanumeric. New report versions, retries, score reads, re-enrollment and manual retries must not generate new IDs. Do not regrade on delivery retry.

Core canonicalizes object-key order before SHA-256 hashing, preserving all facts. Unique eventId detects transport retries. Independent business keys bind Hub/user/type to session+rules for Arcade, session for Interview, attempt for quiz, node+curriculum version for mastery. A changed mastery method or report version cannot farm a business fact.

- First commit: **201** `{status:"accepted",receipt}`.
- Identical retry: **200** `{status:"duplicate",receipt}` with the original receipt.
- Same ID, different valid payload: **409 EVENT_ID_CONFLICT**; no write.
- New ID, same business fact: **200 duplicate** with the original receipt. Core stores a zero-award alias and its hash so that later changes to that alias also conflict. Alias rows never increase the ledger sum, day or counters.
- Invalid facts **400**, oversized body **413**, credential **401**, source/type/principal **403**. Rules inactive or DB unavailable **503**, quota **429** with Retry-After. All errors are `{error:{code,message,retryable}}`. In-memory quota: 120 attempts/minute/credential, bounded to 10,000 buckets; single Core process only.

Receipt: `{eventId,userId,hubId,awardedAura,weightVersion,reason,dayKey,timezonePolicyVersion,occurredAt,receivedAt}`. A receipt awarding **zero is final**, including ineligible/capped activity. Never retry it hoping for a later day's points. Receipt eventId may be the canonical ID for a semantic duplicate. Validate the receipt's subject/Hub and structure before acknowledging locally.

Within one Mongo transaction Core stores receipt/alias, serializes the user-day counter, updates the balance, and upserts the single qualifying daily activity. Unique indexes exist before HTTP startup. `total = engagement + externalBonus`; aliases award zero. Failed/ineligible facts do not create qualifying activity. Qualifying facts still count as activity when capped. Shared date is the fixture rule timezone Asia/Kolkata, policy version 1, derived from trusted occurrence time, not receipt time. Source and type caps share the day across deliveries; a partial final award uses the remaining source budget. Timezone changes require a separately designed cutover in P6, not per-request configuration. Production external bonuses remain disabled; the internal fixture replacement seam only changes externalBonus and total, never engagement.

## Durable pending row (module implementation contract)

In the **same module database transaction** that freezes the successful result, freeze its event payload and persist:

```text
event: {
  eventId, payload,
  status: pending | delivered | attention,
  receipt: null | Core receipt,
  attempts: integer,
  lastAttemptAt: null | UTC timestamp,
  nextAttemptAt: null | UTC timestamp,
  lastErrorCode: null | bounded safe code,
  deliveryRevision: integer
}
```

Do not make an HTTP call inside the domain transaction. After commit, await one bounded POST (2 seconds including reading the response), with at most one immediate retry for a timeout/network/503 failure. 429 schedules Retry-After instead of an immediate retry; bound scheduled delay to 24 hours. Otherwise back off at least 30 seconds. Limit response parsing to 16 KiB. Never log credentials or payloads. Whether delivery succeeds or fails, return the persisted domain result. On network/timeout/429/503/ambiguous or malformed success, keep **pending** and show **"Saved; Aura pending"**. A 200/201 valid receipt changes status to delivered, even awardedAura=0. Invalid facts, 401/403/409/413 and expired bindings become attention for operator review; they never delete the result. Manual correction of credentials may retry the unchanged payload; immutable fact conflicts require investigation, not a replacement event ID.

A timeout may occur **after Core committed**. Retrying exactly the same payload returns the original receipt and cannot reaward. Persist the acknowledgement with revision/CAS, and never let a slower failed concurrent delivery overwrite a delivered receipt. If the module crashes before acknowledging, the row stays pending and replay is safe.

## Owned reads and service-only manual recovery

An authenticated module result GET loads with both userId and hubId from its validated session, then retries at most that result's due pending event before returning its saved result and delivery status. It never discovers another user's result. Timeout leaves the response saved/pending. No regrading, new IDs, browser service keys, or client-supplied scores.

Each released module implements (these routes are **not module adapters shipped by P2.2**):

- `GET /<module>/api/integration/pending-results?cursor=...&limit=50`: a **separate Core reconciliation credential** authenticated by that module, not a student cookie or its outgoing module key. At most 50 rows, stable keyset cursor bound to module/filters; summarize result/event IDs, subject/Hub, pending/attention status, attempts, dates and safe error codes. No resume, code, answers, private game seeds or provider output. Permit an explicit attention filter for operator diagnosis. Reject invalid/foreign cursors.
- `POST /<module>/api/integration/reconcile`: same dedicated credential, no Origin, allowlisted body `{eventIds:[...]}` with 1-50 unique IDs. Load the module's own frozen rows and call the same bounded delivery path; skip delivered rows. Limit concurrency to 2 and the whole request to 10 seconds, returning attempted/delivered/pending/attention IDs plus unattempted IDs to continue later. No arbitrary destination URL or payload replacement. Honor due times unless an explicit operator-only retry is requested after credential repair.

Core does not query module databases or host a generic proxy to arbitrary URLs. Store reconciliation keys only in server config; provision them when adapters are built, separate from outgoing credentials. This phase adds no scheduler, broker, outbox, workers, new ports or promised automatic-delivery SLA. Results recover on owned reads or deliberate service-only reconciliation. A module/database outage cannot block unrelated Core requests.

## Manual acceptance

Use a disposable replica set and a synthetic user/Hub, ephemeral service key, retained issuance, and injected fixture rules. Persist a stub result with pending metadata in a separate disposable module database. Stop the Core listener, attempt bounded delivery, reload the stored result and observe saved/pending. Restart Core and deliver; discard the first successful response to simulate loss. Replay the frozen payload; verify 200/original receipt, one canonical ledger row and a single award. Save that receipt and read delivered. Repeat with a zero-award result: delivered, no later retry. Never enable real modules or live scoring just to demonstrate this seam.
