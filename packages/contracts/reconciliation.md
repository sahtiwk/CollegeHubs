# Reward delivery and reconciliation (TP5.2)

Core owns Aura; modules freeze server-validated facts with their domain result. Existing native, three-game Arcade, Interview and Learn demo rules remain released. Daily and path contracts are consumer-ready but **inactive until TP7/TP8 producer acceptance**. `auraRules.future.v1.json` proposes +15 daily replacement / +30 path. It is not a startup rule: activation rejects its release marker and normal ingestion selects only released versions.

## Authenticated ingestion

`POST /api/aura/events` accepts JSON up to 64 KiB with a dedicated `Bearer <keyId>.<secret>` credential. Browser origins and student tokens cannot submit facts. Provisioning grants no scopes by default; each allowed type must match the credential's service. See [module-events.schema.json](module-events.schema.json).

Core checks the consumed grant's module/JTI/user/Hub and membership version, current active membership/Hub/college, and retained binding. Original occurrence must fall within the consumed/access-expiry interval. Delivery must be within 30 days of occurrence **and** grant retention. Never replace the JTI, occurrence time or event ID to extend this window.

Every metadata object has sourceId, accessJti and domainVersion. New required facts:

| Type (inactive) | Additional facts | Canonical identity |
| --- | --- | --- |
| arcade.daily_completed | challengeId, challengeDay, rulesVersion, outcome, serverDurationSeconds | user/type/challenge/day, across Hubs |
| learn.path_completed | pathId, curriculumVersion, completedNodeCount, requiredNodeCount | user/type/path/curriculum, across Hubs |

Daily challengeDay equals the India day of occurrence; outcome is success/failed and duration is 0–86400 seconds. Path counts are equal integers from 1 to 10000. Both require domainVersion v1. IDs are bounded ASCII tokens; unknown fields and client-provided rewards are rejected. Modules must prove completion before sealing facts.

Historical game/interview/quiz/mastery identities and hashes are unchanged. No historical rekeying is needed; new types have no old rows. Existing keys include Hub/user/type plus session/rules for Arcade, session for Interview, attempt for quiz and node/curriculum for mastery. New transport IDs for the same business fact create zero-award aliases returning the original receipt. Alias replay can resolve the original user receipt in an earlier Hub. Future adapters must handle that legitimate canonical Hub/ID while preserving current request ownership checks. Present adapters retain their existing receipt bounds.

## Receipts and policy

First commit returns 201 accepted. Exact retry or semantic duplicate returns 200 duplicate with the original receipt. Same event ID with changed facts returns 409 EVENT_ID_CONFLICT. Invalid facts return 400; expired replay returns 400 EVENT_REPLAY_EXPIRED; credential errors 401; scope/binding/membership 403; oversized bodies 413. Inactive rules/database failure return 503 and quota returns 429.

Receipt fields: eventId, userId, hubId, awardedAura, weightVersion, reason, dayKey, timezonePolicyVersion, occurredAt, receivedAt. Zero-award receipts are final. Core atomically writes receipt/alias, user-day counters, balance and qualifying activity. Aliases add no points or activity. Daily rewards share the existing Arcade source cap of 30; path rewards share Learn's 100 cap.

`day-policy.cjs` is shared by native facts, native/module scoring and streaks: Asia/Kolkata, policy 1, original occurrence time. Unsupported timezone/version changes are rejected, including loaded rule configurations. A different timezone requires a reviewed cutover. Old weights and receipts remain unchanged.

## Pending, settled and operator review

Payload and pending row are frozen with the domain result. HTTP happens after commit. Adapters use a 15-second delivery lease, four-second HTTP timeout, 16 KiB reply limit and conditional acknowledgement. Lost acknowledgements retry the exact payload, with backoff from 30 seconds to one hour. Reads trigger bounded recovery without regrading.

Statuses are pending, settled and attention (none before an Arcade/Interview event exists). Malformed/ambiguous success, network errors, 429 and 503 stay pending. A well-formed 400/401/403/409/413 rejection becomes attention with a bounded error code. Locally expired payloads become attention without HTTP. This preserves the result, payload and timestamp and stops automatic retries. Result pages explicitly show “needs operator review”.

Operators inspect Arcade/Interview `deliveryStatus: attention` and `lastDeliveryError`, or Learn `learn_event.status = 'attention'` and `last_error_code`. Existing service-only pending lists still list pending work only. After credential repair, an operator may deliberately requeue an unchanged still-valid payload; no public requeue endpoint is provided. Expired results remain retained for review. Do not forge replacement facts or bypass grant retention. Learn's frozen payload and settled-row triggers remain intact.

## Bounded Core coordinator

The coordinator runs at startup and every 60 seconds while awake. It posts `{}` to existing `/api/<module>/integration/reconcile` routes; each module attempts at most three due results using its own delivery leases. Core never reads module databases. Public gateways and student sessions cannot invoke these routes.

Configure **Core** with ENABLE_MODULES, each MODULE_API_ORIGIN and MODULE_RECONCILE_KEY (43-character base64url), matching the dedicated key on the module. Keys are separate from outgoing Aura credentials and summary-read keys. Origins must be root HTTPS URLs; development permits loopback HTTP. Missing/invalid configuration skips the target.

One persisted ReconciliationLease per module contains its atomic 30-second lease, next attempt, failure count and safe result. Parallel processes and operator runs share leases. Each tick has at most three concurrent calls, six seconds per call including reading, no redirects and a 2 KiB reply limit. Success requires an integer attempted count 0–3. Success schedules 60 seconds later; failure backs off 60 seconds to one hour. Expired leases recover after process death. No secrets/payloads are logged. Calls run independently of chat/rooms. Sleeping hosts have no delivery SLA.

Operator command (uses Core server config and honors leases/backoff):

```powershell
node services/core/scripts/reconcileRewards.js --database=YOUR_CORE_DATABASE
```

The exact database must match MONGO_URI; system databases are rejected. Output reports module and ok/unavailable/deferred. Success means a bounded batch was attempted, not that all pending rewards settled.

## Consumer-first rollout

1. Back up retained stores. Apply Learn migration 0002_delivery_attention before deploying its adapter: `node services/learn/scripts/migrate.ts --database=YOUR_LEARN_DATABASE --dry-run`, then `--apply`, using DATABASE_URL. Fresh schemas already include the column/status; migration remains safe for them.
2. Deploy consumers/shared policy and attention handling. Core creates the coordinator collection/index before listening. Verify original receipts, caps and occurrence-day scoring without rewriting historical keys/rules.
3. Configure reconciliation keys and exercise the operator command. Verify outage backoff, responsive Core, lost-acknowledgement recovery and expired-to-attention with unchanged facts.
4. TP7 must seal exactly one ordinary-or-daily event per session, with challenge/day ownership and midnight/concurrency checks. TP8 must validate complete path membership and frozen curriculum. Extend producer receipt bounds and canonical-alias handling before release.
5. Only after producer acceptance: explicitly provision scopes and introduce new prospective released rule versions/selectors. Keep historical rules. Do not replay preactivation events under new weights. Require ownership, cap, concurrency, midnight and cross-Hub replay evidence.

Tests: reward-recovery guards, existing G3 receipt-loss guards, migration/restore checks and reward-recovery-browser UI fixtures. See docs/tp5.2-evidence.md for results and limits.
