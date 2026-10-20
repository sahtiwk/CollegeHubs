const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
function loadMigrations() {
  return readdirSync(__dirname).filter(n => /^\d{4}_[a-z0-9_]+\.js$/.test(n)).sort().map(name => ({
    id: name.slice(0,-3), checksum: createHash('sha256').update(readFileSync(join(__dirname,name),'utf8').replace(/\r\n/g,'\n')).digest('hex'), up: require('./'+name), prepare: require('./'+name).prepare,
  }));
}
function inspect(catalog, rows) {
  if (rows.length > catalog.length || rows.some((r,i) => catalog[i]?.id !== r._id || catalog[i]?.checksum !== r.checksum || (i < rows.length-1 && !r.done))) throw Error('Migration history/checksum mismatch');
}
async function migrate(client, database, { dryRun = true, migrations = loadMigrations(), batchSize = 100, maxBatches = 100 } = {}) {
  if (![batchSize,maxBatches].every(n => Number.isInteger(n) && n >= 1 && n <= 1000) || !migrations.length || migrations.some((m,i) => !/^\d{4}_[a-z0-9_]+$/.test(m.id) || !/^[a-f0-9]{64}$/.test(m.checksum) || typeof m.up !== 'function' || (i && migrations[i-1].id >= m.id))) throw Error('Invalid migration options');
  const db = client.db(database), ledger = db.collection('migrationcheckpoints');
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  if (['users','hubs','channels'].some(name => !collections.some(c => c.name === name))) throw Error('Retained Core schema required');
  const rows = await ledger.find({ _id: { $ne: '__lock' } }).sort({ _id: 1 }).toArray();
  inspect(migrations, rows);
  if (dryRun) return { dryRun, pending: migrations.filter(m => !rows.some(r => r._id === m.id && r.done)).map(m => m.id), cohorts: {
    users: await db.collection('users').countDocuments(),
    reverificationRequired: await db.collection('users').countDocuments({ membershipStatus:'active', hubId:{$ne:null}, $nor:[{membershipVerified:true,verificationMethod:{$in:['email','google']}}] }),
    verificationPending: await db.collection('users').countDocuments({membershipStatus:'verification-pending'}),
  } };
  // Unique _id serializes metadata initialization. Every batch writes this same
  // lock row inside its transaction; conflicting runners retry from fresh state.
  for (const migration of migrations) if (migration.prepare) await migration.prepare(db);
  try { await ledger.updateOne({ _id: '__lock' }, { $setOnInsert: { revision: 0 } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const session = client.startSession();
  try {
    for (let batch = 0; batch < maxBatches; batch++) {
      let finished = false;
      await session.withTransaction(async () => {
        await ledger.updateOne({ _id: '__lock' }, { $inc: { revision: 1 } }, { session });
        const current = await ledger.find({ _id: { $ne: '__lock' } }, { session }).sort({ _id: 1 }).toArray();
        inspect(migrations, current);
        const next = migrations.find(m => !current.some(r => r._id === m.id && r.done));
        if (!next) { finished = true; await session.abortTransaction(); return; }
        const old = current.find(r => r._id === next.id);
        const result = await next.up({ db, session, cursor: old?.cursor ?? null, batchSize });
        if (!result || typeof result.done !== 'boolean' || !Object.hasOwn(result,'cursor') || (!result.done && JSON.stringify(result.cursor) === JSON.stringify(old?.cursor ?? null))) throw Error('Migration must advance a bounded cursor');
        await ledger.updateOne({ _id: next.id }, { $set: { checksum: next.checksum, cursor: result.cursor, done: result.done, updatedAt: new Date() }, $inc: { batches: 1 } }, { upsert: true, session });
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000, timeoutMS: 30000 });
      if (finished) return { dryRun, complete: true };
    }
    const remaining = await ledger.find({ _id: { $ne: '__lock' } }).toArray();
    return { dryRun, complete: migrations.every(m => remaining.some(r => r._id === m.id && r.done)) };
  } finally { await session.endSession(); }
}
module.exports = { loadMigrations, migrate };
