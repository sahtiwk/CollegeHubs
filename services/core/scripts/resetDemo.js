const path = require('path');
const mongoose = require('mongoose');

// Deliberate allowlist, extended only when later Core phases add their models.
const resetCollections = ['auraevents', 'aurabalances', 'auradaycounters', 'dailyactivities', 'modulegrants', 'nativefacts', 'problems', 'studyrooms', 'studysolutions', 'messages', 'posts', 'users', 'channels', 'hubs', 'colleges'];
// Operator-provisioned service credentials are configuration, not disposable user data.
const preservedCollections = ['servicecredentials'];
class ResetGuardError extends Error {}

function parseTarget(env, args) {
  if (!['development', 'test'].includes(env.NODE_ENV)) throw new ResetGuardError('Reset requires NODE_ENV=development or test');
  if (env.DEMO_RESET_ENABLED !== 'true') throw new ResetGuardError('DEMO_RESET_ENABLED must explicitly be true');
  const databaseArg = args.find(arg => arg.startsWith('--database='));
  const database = databaseArg?.slice('--database='.length);
  if (!database || !/^collegehubs_demo(?:_[a-z0-9_]+)?$/.test(database)) {
    throw new ResetGuardError('Explicit --database=collegehubs_demo[_suffix] is required');
  }
  const allowed = (env.DEMO_DB_NAME_ALLOWLIST || '').split(',').map(name => name.trim()).filter(Boolean);
  if (!allowed.includes(database)) throw new ResetGuardError('Database is not in DEMO_DB_NAME_ALLOWLIST');
  if (!args.includes(`--confirm=${database}`)) throw new ResetGuardError('Explicit --confirm matching the database is required');
  if (!args.includes('--disposable-data-only')) throw new ResetGuardError('Confirm that all data is disposable with --disposable-data-only');
  const permitted = new Set([databaseArg, `--confirm=${database}`, '--disposable-data-only', '--dry-run']);
  if (args.some(arg => !permitted.has(arg)) || new Set(args).size !== args.length) throw new ResetGuardError('Unknown or duplicate reset argument');
  if (!env.MONGO_URI) throw new ResetGuardError('MONGO_URI is required');
  let client;
  try {
    // The installed Mongo driver parses credentials, SRV and multi-host URIs without connecting.
    client = new mongoose.mongo.MongoClient(env.MONGO_URI);
  } catch {
    throw new ResetGuardError('Invalid MongoDB configuration');
  }
  if (client.options.dbName !== database) throw new ResetGuardError('MONGO_URI database must exactly match --database');
  return { database, dryRun: args.includes('--dry-run') };
}

async function inspectDemo(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  if (collections.some(({ name }) => ![...resetCollections, ...preservedCollections].includes(name))) {
    throw new ResetGuardError('Unknown collections found; stop and review the target before resetting');
  }
  const counts = {};
  for (const name of [...resetCollections, ...preservedCollections]) counts[name] = await db.collection(name).countDocuments({});
  // P0.2 only recognizes synthetic identities. Never treat a real college domain as disposable.
  const nonDemoUser = await db.collection('users').findOne({
    $or: [{ email: { $not: /@(?:[a-z0-9-]+\.)*example\.test$/ } }, { googleId: { $exists: true } }, { googleSubject: { $exists: true } }],
  }, { projection: { _id: 1 } });
  if (nonDemoUser) throw new ResetGuardError('Non-synthetic identity found; stop reset and use a reviewed data migration');
  return counts;
}

async function seedDemo(connection) {
  const { provisionConfiguredHubs } = require('../services/hubProvisioning');
  await provisionConfiguredHubs(connection);
  // P5/P6 will add their idempotent problem/calendar seeds after those models exist.
}

async function resetDemo({ env = process.env, args = process.argv.slice(2) } = {}) {
  const target = parseTarget(env, args); // All config/confirmation checks precede a connection.
  const connection = mongoose.createConnection();
  try {
    await connection.openUri(env.MONGO_URI, { serverSelectionTimeoutMS: 5000, autoIndex: false });
    if (connection.name !== target.database) throw new ResetGuardError('Connected database does not match the approved target');
    const counts = await inspectDemo(connection.db);
    console.log(JSON.stringify({ database: target.database, counts, dryRun: target.dryRun }));
    if (target.dryRun) return;
    // API must be stopped during reset. Keep indexes; never drop a DB or unknown collections.
    for (const name of resetCollections) await connection.db.collection(name).deleteMany({});
    await seedDemo(connection);
    console.log('Core demo reset complete. Configured colleges and active Hubs/channels seeded.');
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  resetDemo().catch(err => {
    // Driver errors may contain connection details; only our guard messages are safe to print.
    const safe = err instanceof ResetGuardError;
    console.error(safe ? err.message : 'Demo reset failed; check database availability and configuration');
    process.exitCode = 1;
  });
}

module.exports = { parseTarget, inspectDemo, resetDemo };
