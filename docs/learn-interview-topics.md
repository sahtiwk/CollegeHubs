# P10.1 — voluntary Learn topics for Interview

The user explicitly activated this optional phase on 2026-10-11. A saved Interview setup now offers **Show my Learn suggestions**. Nothing is selected automatically. Choose up to five and use the selection before generating questions. Ordinary Interview practice remains available if Learn fails or has no qualifying results.

## Rule and data boundary

Learn reads the latest finalized assessment for each owned node/version in an active enrollment. It must match the learner's last assessment timestamp (so reset/unassessed state does not resurrect historical results), have a ratio below 0.6, and be within 30 days. A newer passing result supersedes an earlier failure. The deterministic latest-five response contains node ID, label, curriculum version, reason and assessment timestamp. It is a simple practice heuristic, not a calibrated ability or employment assessment.

Core signs a separate `module:learn:weak-skills:read` delegation, pinned to Learn, subject, Hub, membership version and a 30-second lifetime. Learn also requires the P10.2 read-service credential. No answers, resume content, or other learner's state cross this boundary. Optional reads share the process-wide two-request budget with P10.2 summaries, an 800ms deadline, bounded response size and a one-minute failure cooldown. Recommendation selection re-reads current Learn results rather than trusting client IDs, labels or a stale browser cache.

## One-use import

- `GET /api/me/weak-skills` returns `{schemaVersion:1,status,asOf,items}`. Failure is explicit; no fabricated suggestions.
- `POST /api/me/interview-recommendation` accepts **only** `{nodeIds}`. Current Core auth, active Hub membership and exact browser Origin are required. It returns a random `recommendationRef` and `expiresAt`, at most 60 seconds away.
- `ModuleGrant` stores a separate `kind: recommendation`, owner/Hub/membership version, Interview target, hash, selected topic snapshot, expiry and atomic `consumedAt`. A partial unique `recommendationHash` index isolates references; existing partial `accessJti` and legacy unique `grantHash` indexes remain compatible. Recommendation rows also receive a distinct unique grant hash, but lack handoff state and cannot issue a session token. No destructive index migration is needed.
- After warming/renewing Interview, the UI mints the reference and posts it to its owned unused draft at `/api/interview/interviews/:id/learn-topics` with module session and CSRF protection.
- Interview calls Core `/api/auth/interview-recommendations/consume` with its service credential and the server-owned session subject/Hub/JTI. Core checks current membership and an unexpired matching Interview grant, then atomically consumes the owner-bound reference. A preexisting Interview session never bypasses this check.
- A bounded draft lease excludes concurrent question generation. Successful import saves only bounded selected labels/versions/reasons/assessment dates. Existing generated questions cannot be retargeted. An ambiguous failure requires a new selection/reference; consumed references are never restored. A service crash releases the lease by expiry.

The actual AI generation call includes saved labels/versions in its bounded JSON data block. Its system instruction requests coverage of each selected topic and explicitly treats the labels as data, never instructions. Resume/role/answer protections remain. This changes practice questions only; it does not award Aura, create assessments or change the shared streak.

## Configuration and safe stop

No new provider account or API key is needed beyond existing Groq and P10.2 read configuration. Core must enable Learn and Interview; missing Learn read credentials disable suggestions without disabling ordinary Interview creation. All environments still need the existing public-key and service-credential bindings. New collection indexes are created by the existing Core startup path.

Local implementation and provider evidence do not imply hosted activation. P10.2 and P10.1 commits must be rolled out with the new Render read settings and verified before live suggestions are claimed. Safe stop: remove the optional picker or disable the Learn read configuration; leave ordinary Interview paths and existing saved work intact. Generated questions remain immutable.

## Hosted follow-up — 2026-10-11

Read credentials are now saved in Render and the P10.1/P10.2 release is live. Hosted counts, topic import, replay rejection and real Groq generation passed. See [hosted evidence](p10-hosted-evidence.md); earlier local-only rollout notes above describe the pre-deployment state.
