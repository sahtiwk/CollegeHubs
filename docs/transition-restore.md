# TP0.2 retained-data migrations and restore

## TP11.1 rehearsal — 20 October 2026

**Hosted rollout follow-up:** Actual Core, Arcade and Interview BSON snapshots and a Learn custom-format dump were restored into isolated local copies before deployment. Core and Learn additive migrations preserved original records, IDs and receipts. Learn's upgraded dump restored with matching hashes and immutable triggers. Historical Learn commit `d585a1d`, patched only to accept schema 2–5 readiness, is available as `d3b270b7869343066c8db18047eb37d672a80c02` on `codex/tp11-rollback`. Its old profile readers accepted every retained learner; a newly acknowledged preference survived connection restart and rollback reads with all table hashes unchanged. That build also ran successfully on Render before the hosted Learn migration.

For application rollback, retain the upgraded databases. Roll Learn to the compatibility commit above, never its schema-2-only predecessor. Roll module producers back before Core; restore the previous Pages deployment alongside the matching API behavior. Core's earlier token mode requires deliberately restoring its prior session flag if restoring the old frontend. Do not erase migration checkpoints or replace live databases with the earlier snapshot: doing so would discard acknowledged writes. Prefer forward repair if new feature records need readers that the historical application lacks. Exact hosted artifact references are in [the release manifest](tp11.1-release-manifest.json).

Private snapshots and rehearsal reports are ignored under `.local/tp111`; the backup inventory identifies the authoritative `hosted-backup-2026-10-20T07-57-22-209Z` directory. Backups contain private user data and must not be committed. Atlas automatic backups were off; no paid upgrade was enabled. The following paragraphs preserve the earlier synthetic rehearsal record.

The retained-store suite was rerun against explicit local synthetic copies: **10 tests passed, zero skipped**. Current Learn upgrades schema 2 through 5; current readiness accepts 2–5 and checks the additional tables for each version. Core's additive catalog includes identity/session, reward policy and projection changes. Migration IDs and checksums are inventoried by `node deploy/release-manifest.mjs`.

Custom-format PostgreSQL and BSON disk restores preserved row/document hashes, IDs, Mongo indexes, immutable SQL triggers, the saved Study draft, one pending Core award, total Aura 10, one Learn completion and pending/settled Learn receipts. Reconnect/read/repeat-migration checks passed on the restored databases. This verifies current readers over retained records; it does **not** prove an arbitrary historical application binary is compatible with schema 5. The new release cannot be rolled back to a schema-2-only readiness binary. Choose and test a compatible predecessor artifact before hosted rollout; otherwise restore into a separate database and reconcile acknowledged post-snapshot writes before switching traffic.

Raw backup files and the complete fixture inventory remain ignored under `.local/tp02`. Production snapshots, remote restart/deployment IDs and account backup settings remain pending. No hosted database was copied or changed. See [TP11.1 release preparation](tp11.1-evidence.md). The original TP0.2 description below is historical.

Implemented 18 October 2026. Migration infrastructure is operator-invoked, never
run by server startup, readiness checks or deployment builds. The shipped
`0001_baseline` migrations change only migration metadata. No account, Hub, room,
attempt, completion, reward, receipt, policy or schema-version value is rewritten.
No hosted database was touched for this work.

## Existing schema and compatibility boundary

Learn is schema v2 (`services/learn/src/db/schema.ts`). Its 15 tables include
durable module sessions, owner-scoped curriculum/enrollment, immutable attempts,
completion identities and the `learn_event` delivery outbox. The triggers
`protect_quiz_attempt`, `protect_completion`, `protect_learn_event` prevent edits
to finalized attempts/completions/settled receipts and immutable event identity.
They remain enabled and unchanged. Readiness still requires version 2.

`setup_demo.ts` is an empty-database bootstrap, not a retained-data upgrade.
It refuses populated public schemas. Do not run it against retained databases.
Core `provisionHubs.js` preserves canonical college/Hub/channel identities;
`resetDemo.js` is a separate, destructive, strictly disposable-only command.
Its unknown-collection guard now deliberately refuses a migrated database with
`migrationcheckpoints`; the allowlist has not been relaxed to make reset work.

Core indexes remain in existing models: unique Hub/college and channel keys,
user identities, message idempotency/sequence, room creation keys and
owner/room solution keys, global receipt event IDs and canonical business keys,
owner balances, and deadline/pending-work lookup indexes. No `syncIndexes`,
index deletion, reseed or historical reward reconstruction is part of adoption.
The metadata collection uses Mongo's unique `_id` index. MigrationCheckpoint is
an operator model, not part of the normal startup model list.

## Commands and confirmation

Use Node 24.12+, installed root dependencies and an explicitly selected database.
Supply private `DATABASE_URL` or `MONGO_URI` in the process environment. These
commands intentionally do **not** auto-load `.env`; choosing a workspace does
not silently choose a retained database. Never put secrets in tracked scripts,
shell transcripts or chat. The exact database in the URI must match the CLI
confirmation. `admin`, `local` and `config` are forbidden Core targets.

```powershell
# Replace the illustrative names with the exact, deliberately selected targets.
npm run migrate -w @collegehubs/learn -- --database=collegehubs_demo_learn_rehearsal --dry-run
npm run migrate -w @collegehubs/core -- --database=collegehubs_demo_rehearsal --dry-run
# After snapshot, inventory, review of pending IDs and restore proof:
npm run migrate -w @collegehubs/learn -- --database=collegehubs_demo_learn_rehearsal --apply
npm run migrate -w @collegehubs/core -- --database=collegehubs_demo_rehearsal --apply
```

Exit 0 means the command completed; Core apply exit 2 means its bounded run
stopped with work remaining and may be rerun. Exit 1 means refused/failed; inspect
the target, catalog/checksums, schema and database availability before retrying.
CLI errors are intentionally generic to avoid leaking connection strings.
Dry-run lists pending IDs and validates prerequisites/history without creating
metadata. It does not execute future migration bodies or promise that they
will succeed. Neither runner supports automatic down migrations.

## Migration authoring contract

Learn migrations are self-contained `NNNN_name.sql` files in
`services/learn/src/db/migrations`. The source CLI reads these directly, including
on a deployment checkout; it does not rely on `tsc` copying SQL to `dist`.
Core migrations are self-contained `NNNN_name.js` exports in
`services/core/migrations`. Both catalogs sort IDs and hash UTF-8 source after
normalizing CRLF to LF. Never edit, rename, remove or insert before an applied
migration. Unknown, reordered or changed history fails closed. Imported mutable
helpers would escape the checksum: keep migration behavior self-contained.

Learn takes session advisory lock 31002 across the run, with a five-second lock
timeout and 30-second statement timeout. Each pending SQL file and its ledger
insert commit in one transaction; errors roll back that migration. Disconnect
releases the lock; earlier committed migrations remain applied. Transactions,
`COMMIT`, `ROLLBACK`, concurrent index creation, provider calls and changes to the
ledger/lock protocol are forbidden inside migration SQL. Split large backfills
into reviewed, bounded SQL steps with their own migration IDs. A future schema
version change must update runner compatibility/readiness deliberately and prove
old/new reader compatibility before activation. This runner currently adopts v2.

Core uses a replica set and snapshot/majority transactions. Each batch first
writes the same `__lock` metadata document, then reads current history, applies
the next batch and commits its checkpoint atomically. Concurrent runners may
interleave **between** batches, but conflicting batches serialize and re-read
the committed cursor; transaction retries cannot advance a checkpoint alone.
No lease expiry can allow a stale runner to write outside that transaction.

Core migration signature:

```javascript
module.exports = async ({ db, session, cursor, batchSize }) => {
  // Read at most batchSize rows ordered by a stable unique key after cursor.
  // Every read/write MUST use session. No network calls or external side effects.
  // Modify only reviewed additive fields; never historical IDs/facts/receipts.
  // Return a durable cursor and done flag; unfinished batches must advance.
  return { cursor: nextKey, done: noMoreRows };
};
```

Default limits are 100 rows/batch and 100 batches/run, with a maximum of 1000
for either library option, a 30-second transaction retry deadline and five-second
commit timeout. Author code must honor the supplied row bound and use indexed
keyset queries; the framework cannot sandbox arbitrary migration JavaScript.
A failed batch rolls back data and checkpoint. Rerunning resumes the last
committed cursor. `batches` records committed batches, not an invented row count.
Completed adoption reruns do not change even the lock revision.

Arcade and Interview retain service-owned Mongo data. When their first schema
change arrives, add a local catalog, checkpoint collection and explicit runner
following the same transaction/cursor/checksum protocol, with their own DB
credentials. Do not run Core's catalog on module databases or use a cross-service
transaction. Deploy compatible consumers first, expand each service separately,
verify old reads, backfill, then enable producers. Keep pending delivery IDs and
receipts intact throughout; do not replay settled work as a new event.

## Snapshot and restore procedure

1. Pause application writers, deadline scanners and module reconcilers for the
   snapshot window. Keep all four services paused until the mutually related
   snapshots are complete. Record release commit, UTC snapshot time, database
   names, schema marker, migration history and operator separately in private
   storage. Do not assume free hosting supplies automatic backups or PITR.
2. Inventory each selected database. The helper below emits per-table/collection
   counts and SHA-256 over sorted full-row encodings, plus pending delivery counts
   and canonical Core receipt totals. It excludes only migration metadata from
   data comparison. It refuses to overwrite an evidence file. Keep output under
   ignored `.local` or equally private backup storage.
3. Export Learn with `pg_dump --format=custom`, including schema, data, indexes
   and triggers. Use private `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` settings
   or a protected password file rather than a URI in a command transcript.
   Export each Mongo DB separately with MongoDB Database Tools `mongodump`
   using protected connection configuration, BSON plus metadata/indexes. Do not
   substitute CSV/relaxed JSON, which can change ObjectIds, dates or integers.
4. Restore into **new empty disposable databases**, never into the live target.
   Learn: `pg_restore --exit-on-error --no-owner --dbname=<new-name> <dump>`.
   Mongo: `mongorestore` with explicit source/destination namespace mapping;
   omit `--drop` and retain index/collection metadata. Scope credentials to the
   intended database. Existing/nonempty destinations are not approved targets.
5. Point the inventory helper at the restored copies and compare `stores`,
   pending counts and receipt totals (database names intentionally differ).
   Also verify indexes/triggers and migration history, acknowledged source bytes,
   revision/hash/owner/room IDs, account IDs, attempt/completion identities and
   immutable receipt IDs. Compare old application reads on the restored copies.
6. Only after restore equality, run dry-run/apply on the intended target; repeat
   inventory and compatibility checks. Resume writers in staged service order.
   Retain backups privately until release acceptance; do not commit dumps or
   expose real resume/session data. Follow retention policy when disposing them.

```powershell
node scripts/migration-inventory.cjs --service=learn --database=collegehubs_demo_learn_rehearsal --output=.local/learn-before.json
node scripts/migration-inventory.cjs --service=core --database=collegehubs_demo_rehearsal --output=.local/core-before.json
# pg_* settings supplied privately; these commands contain no credentials.
pg_dump --format=custom --file=.local/learn.dump --dbname=collegehubs_demo_learn_rehearsal
pg_restore --exit-on-error --no-owner --dbname=collegehubs_demo_learn_restore .local/learn.dump
```

Inventory is intended for this bounded application's offline restore rehearsal:
it sorts each store's encodings in memory. It does not offer a consistent
cross-service live snapshot. Learn uses repeatable-read; Mongo inventory requires
the declared writer pause. For larger retained stores, implement an external-sort
inventory before claiming scalability. Row hashes include private fields without
printing them; treat even the resulting evidence as private.

## Compatible rollback and recovery

For TP0.2, roll back application code while leaving migration metadata intact:
the old application ignores the new table/collection. Do not erase ledger rows
to force a replay. For a failed Learn migration, fix availability or submit a new
reviewed migration after identifying whether the failed ID committed; do not
change an already applied file. For a failed Core batch, resolve the cause and
rerun the same catalog/checksum from its saved cursor.

For a future incompatible change, stop writers and restore into new databases,
verify equality and switch the affected service configuration deliberately.
Account for all acknowledged writes after the backup before switching: an older
snapshot alone is not lossless rollback. Do not overwrite the live DB to hide a
failed migration. Prefer a forward repair when compatible; retain old fields
until release gates justify removal. Backups of related services must preserve
pending event/grant/receipt relationships; rollback is not a distributed DB
transaction and must not recreate rewards.

## Local rehearsal evidence

Prerequisites: Node 24.12+, root dependencies, local PostgreSQL with permission
to create/drop **random disposable test databases**, `pg_dump`/`pg_restore` on
PATH, and the MongoDB 7.0.14 memory-server binary (downloaded on first use if
absent). The test refuses a missing/nonlocal PostgreSQL URL; it never silently
skips database coverage. Use the local `postgres` admin database as the entry
point; tests create their own randomly suffixed databases, not tables in it.

```powershell
$env:MIGRATION_TEST_DATABASE_URL='postgresql://tp01@127.0.0.1:55431/postgres'
npm run test:migrations
```

The local role/port above refer to the loopback disposable cluster used in TP0.1;
substitute a private local test configuration. Tests clean up only databases they
created and stop their own Mongo replica set. No production bootstrap/reset is
invoked. SQL schema bootstrap in the test is only for its new empty fixture.

Rehearsal uses real model-created Core users/Hub/channel, an active two-user room
and acknowledged revision-1 source, a model-valid immutable receipt/balance and
pending Study award. Learn has a seeded DSA enrollment/graph, a retained finalized
attempt, completion and pending/settled events. Comparisons cover all data rows,
not just counts. The test deliberately fails a SQL transaction after DDL/data
and a Core backfill after its first committed batch; both roll back only their
uncommitted work, then retry/resume. Concurrent resume increments each probe row
exactly once. The probe migrations are test-only and never shipped in catalogs.

Learn restore uses actual `pg_dump`/`pg_restore`. Mongo Database Tools were not
installed on this machine: the fixture instead writes BSON documents and
collection/index metadata to disk, reads those files into a new database, and
compares all data hashes/indexes. This is actual driver-based fixture restoration,
not a claim that the `mongodump`/`mongorestore` CLI or hosted snapshots were tested.
Existing learner graph/attempt, Core Study and Aura reads are exercised before
and after adoption/restoration. SQL immutable triggers reject forbidden edits
on both copies. Mismatched CLI targets fail before connecting.

Evidence: `.local/tp02/tests.tap`, `.local/tp02/restore-summary.json`,
`.local/tp02/learn.dump`, `.local/tp02/mongo/`, and matching private inventory
reports. These are synthetic local artifacts; no live provider calls, paid
resource, hosted migration or real-user export was made.

Final verification on 18 October 2026:

| Check | Result | Evidence |
|---|---|---|
| Focused migration/restore suite | 9 passed, 0 failed, 0 skipped; 13.46 seconds | `.local/tp02/tests.tap` |
| Existing G1–G4 and schedule guards, fresh local integration fixture | 108 passed, 0 failed, 0 skipped; 54.98 seconds | `.local/tp02/guards.tap` |
| All five workspace builds | PASS | `.local/tp02/build.log` |
| Inventory source/restore comparison | Core and Learn reports match apart from destination name | `.local/tp02/*-inventory-*.json` |
| Diff whitespace and documentation links | PASS | Local inspection |

The fixture retained a canonical Core receipt total of 10, one pending Study
award, the same room/owner/revision/source, one Learn completion, and one pending
plus one settled Learn event. Acknowledged draft SHA-256:
`2c0c55cf91406e7b3d09fdbf0f20b8fa3395298acc955c9a7ecd391284695a95`.
Exact synthetic IDs and per-store hashes are in the private restore summary.
No test failure or skipped database gate remains.

TP0.2 is complete for baseline adoption and the migration/restore mechanism.
Feature-specific migration content, public-host execution and backup-tool checks
remain gates of the tickets that introduce those changes; this result does not
claim a future identity, reward or curriculum migration is already tested.

TP1.1 adds Core migration `0002_membership_notice` after the unchanged baseline.
It adds evidence metadata/notice timestamps only; enforcement is a separate
recorded, bounded operation. Follow [the identity cutover runbook](identity-verification.md)
for cohort counts, advance notice, module credential drain and rollback. Do not
use the TP0.2 baseline's historical one-migration count as the current catalog.
