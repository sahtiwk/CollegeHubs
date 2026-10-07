// Explicit local/disposable integration fixture. Starts independent API listeners and Vite.
// PostgreSQL must already exist with the guarded session-only schema.
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { generateKeyPairSync } = require('node:crypto');
const { mkdirSync, createWriteStream } = require('node:fs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const root = resolve(__dirname, '..');
async function main() {
  const url = new URL(process.env.GUARD_LEARN_DATABASE_URL || '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !/^\/collegehubs_demo_learn_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Requires explicit disposable local PostgreSQL');
  const pool = new Pool({ connectionString: url.toString() });
  pool.on('error', () => console.log('Fixture Learn database disconnected'));
  const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
  const admin = new Pool({ connectionString: adminUrl.toString() });
  const databaseName = url.pathname.slice(1);
  await pool.query('SELECT session_hash FROM module_session LIMIT 0');
  const repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1 } });
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const origin = 'http://localhost:5182';
  Object.assign(process.env, { JWT_SECRET: 'p32-local-disposable-core-secret', ALLOWED_ORIGINS: origin + ',http://127.0.0.1:5182', APP_ORIGIN: origin, ENABLE_MODULES: 'learn,arcade,interview', NODE_ENV: 'test',
    CORE_MODULE_PRIVATE_KEY: keys.privateKey, CORE_MODULE_KEY_ID: 'p32-key', CORE_MODULE_PUBLIC_KEYS: JSON.stringify({ 'p32-key': keys.publicKey }), MONGO_URI: repl.getUri('collegehubs_demo_p32') });
  mongoose.set('autoCreate', false).set('autoIndex', false);
  await mongoose.connect(process.env.MONGO_URI);
  const names = ['College', 'Hub', 'Channel', 'Message', 'NativeFact', 'AuraRuleSet', 'Contest', 'CalendarEvent', 'Problem', 'StudyRoom', 'StudySolution', 'PeerReview', 'User', 'Post', 'ModuleGrant', 'ServiceCredential', 'AuraEvent', 'AuraBalance', 'AuraDayCounter', 'DailyActivity'];
  const models = Object.fromEntries(names.map(name => [name, require('../services/core/models/' + name)]));
  await Promise.all(Object.values(models).map(async model => { await model.createCollection(); await model.createIndexes(); }));
  const provision = require('../services/core/services/hubProvisioning');
  await provision.provisionConfiguredHubs(); await provision.provisionConfiguredHubs();
  const college = await models.College.findOne({ slug: 'cvr' }); const hub = await models.Hub.findOne({ collegeId: college.id });
  if (await models.Hub.countDocuments({ collegeId: college.id }) !== 1 || await models.Channel.countDocuments({ hubId: hub.id }) !== 4) throw new Error('Provisioning not idempotent');
  await require('../services/core/services/scheduleService').seedCalendar();
  const second = await models.College.create({ name: 'Sky College · fixture', slug: 'p32-sky', status: 'active', timezone: 'Asia/Kolkata', themeTokens: { ...college.themeTokens, background: '#DFF7FF', surface: '#DFF7FF', surfaceRaised: '#F4ECD6', secondary: '#F4ECD6' }, domains: [{ normalizedDomain: 'sky.example.test', verifiedAt: new Date(), evidenceRef: 'synthetic fixture' }] });
  const secondHub = await provision.ensureHubForCollege(second.id);
  for (const [username, email, hubId] of [['cvr-preview', 'preview@cvr.ac.in', hub.id], ['cvr-peer', 'peer@cvr.ac.in', hub.id], ['sky-preview', 'preview@sky.example.test', secondHub.id]]) await models.User.create({ username, email, password: 'Preview-only-32!', hubId, membershipStatus: 'active', membershipVersion: 1, onboardingComplete: true });
  const { opaque, digest } = require('../services/core/services/moduleTokenService');
  const serviceKey = 'p32learn.' + opaque(); await models.ServiceCredential.create({ service: 'learn', keyId: 'p32learn', keyHash: digest(serviceKey) });
  const arcadeKey = 'p71arcade.' + opaque(), reconcileKey = opaque();
  await models.ServiceCredential.create({ service: 'arcade', keyId: 'p71arcade', keyHash: digest(arcadeKey), eventTypes: ['arcade.game_completed'] });
  const arcadeUri = repl.getUri('collegehubs_demo_arcade');
  const interviewUri = repl.getUri('collegehubs_demo_interview'), interviewKey = 'p81interview.' + opaque(), interviewReconcileKey = opaque();
  await models.ServiceCredential.create({ service: 'interview', keyId: 'p81interview', keyHash: digest(interviewKey), eventTypes: ['interview.completed'] });
  const children = [];
  function child(cwd, args, env) { const childEnv = { ...process.env, ...env }; if (cwd === 'services/interview') for (const key of ['JWT_SECRET','MONGO_URI','CORE_MODULE_PRIVATE_KEY','DATABASE_URL','REDIS_URL','CLOUDINARY_URL','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','OPENAI_API_KEY','GROQ_API_KEY','ADZUNA_APP_ID','ADZUNA_API_KEY']) delete childEnv[key]; const proc = spawn(process.execPath, args, { cwd: resolve(root, cwd), env: childEnv, stdio: ['ignore', 'inherit', 'inherit'] }); children.push(proc); return proc; }
  let core = child('services/core', ['index.js'], { PORT: '5183' });
  const learnEnv = { PORT: '5184', DATABASE_URL: url.toString(), CORE_PUBLIC_KEY: keys.publicKey, CORE_KEY_ID: 'p32-key', CORE_TOKEN_ISSUER: 'collegehubs-core', CORE_TOKEN_AUDIENCE: 'collegehubs-learn', CORE_API_BASE_URL: 'http://127.0.0.1:5183', CORE_SERVICE_KEY: serviceKey };
  let learn = child('services/learn', ['dist/server.js'], learnEnv);
  const arcadeEnv = { PORT: '5185', ARCADE_MONGO_URI: arcadeUri, CORE_PUBLIC_KEY: keys.publicKey, CORE_KEY_ID: 'p32-key', CORE_TOKEN_ISSUER: 'collegehubs-core', CORE_TOKEN_AUDIENCE: 'collegehubs-arcade', CORE_API_BASE_URL: 'http://127.0.0.1:5183', CORE_SERVICE_KEY: arcadeKey, ARCADE_RECONCILE_KEY: reconcileKey };
  let arcade = child('services/arcade', ['src/server.js'], arcadeEnv);
  const interviewEnv = { PORT: '5186', INTERVIEW_MONGO_URI: interviewUri, CORE_PUBLIC_KEY: keys.publicKey, CORE_KEY_ID: 'p32-key', CORE_TOKEN_ISSUER: 'collegehubs-core', CORE_TOKEN_AUDIENCE: 'collegehubs-interview', CORE_API_BASE_URL: 'http://127.0.0.1:5183', CORE_SERVICE_KEY: interviewKey, INTERVIEW_RECONCILE_KEY: interviewReconcileKey };
  let interview = child('services/interview', ['--require', '../../scripts/interview-ai-fixture.cjs', 'src/server.js'], interviewEnv);

  child('apps/web', ['../../node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5182'], { CORE_API_ORIGIN: 'http://127.0.0.1:5183', LEARN_API_ORIGIN: 'http://127.0.0.1:5184', ARCADE_API_ORIGIN: 'http://127.0.0.1:5185', INTERVIEW_API_ORIGIN: 'http://127.0.0.1:5186', VITE_GOOGLE_CLIENT_ID: '', VITE_CORE_SOCKET_ORIGIN: 'http://localhost:5183' });
  let guardRunning = false;
  async function guards() {
    if (guardRunning) { console.log("Guard run already in progress"); return; }
    guardRunning = true;
    mkdirSync(resolve(root, '.local'), { recursive: true });
    const log = createWriteStream(resolve(root, '.local/p32-guards.tap'));
    const proc = spawn(process.execPath, ['--test', '--test-reporter=tap', 'tests/guards/hub-isolation.test.js', 'tests/guards/module-grants.test.js', 'tests/guards/aura-events.test.js', 'tests/guards/study-room.test.js', 'tests/guards/schedules.test.js'], { cwd: root, env: { ...process.env, GUARD_INTERVIEW_MONGO_URI: interviewUri, GUARD_INTERVIEW_SERVICE_KEY: interviewKey, GUARD_INTERVIEW_RECONCILE_KEY: interviewReconcileKey, GUARD_MONGO_URI: repl.getUri(), GUARD_ARCADE_MONGO_URI: arcadeUri, GUARD_ARCADE_SERVICE_KEY: arcadeKey, GUARD_ARCADE_RECONCILE_KEY: reconcileKey, GUARD_CORE_SIGNING_SECRET: process.env.JWT_SECRET, GUARD_APP_ORIGIN: origin, GUARD_LEARN_DATABASE_URL: url.toString() }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(proc); proc.stdout.pipe(log, { end: false }); proc.stderr.pipe(log, { end: false });
    await new Promise(resolve => proc.once('close', code => { log.end(); guardRunning = false; console.log('Guard exit:', code, '(report .local/p32-guards.tap)'); resolve(); }));
  }
  let closing = false;
  async function close() { if (closing) return; closing = true; for (const proc of children) proc.kill(); await admin.query(`ALTER DATABASE "${databaseName}" ALLOW_CONNECTIONS true`); await pool.end(); await admin.end(); await mongoose.disconnect(); await repl.stop(); process.exit(); }
  process.on('SIGINT', close); process.on('SIGTERM', close);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async input => {
    const command = input.trim();
    try {
      if (command === 'stop-core') { core.kill(); console.log('Core stopped; fixture Mongo remains live'); }
      if (command === 'start-core') { core = child('services/core', ['index.js'], { PORT: '5183' }); }
      if (command === 'guards') await guards();
      if (command === 'schedule-timeout') {
        core.kill(); await new Promise(resolve => core.once('exit', resolve));
        await models.Contest.updateOne({ provider: 'codeforces' }, { $set: { nextAttemptAt: new Date(0), leaseUntil: new Date(0) } });
        core = child('services/core', ['--require', '../../scripts/schedule-timeout-fixture.cjs', 'index.js'], { PORT: '5183' });
        console.log('Disposable Core schedule transport now times out; saved cache retained');
      }
      if (command === 'schedule-disable') {
        core.kill(); await new Promise(resolve => core.once('exit', resolve));
        core = child('services/core', ['index.js'], { PORT: '5183', SCHEDULE_REFRESH_ENABLED: 'false' });
        console.log('Provider refresh disabled; Core routes remain available');
      }

      if (command === 'stop-arcade') { arcade.kill(); console.log('Arcade stopped; Core and Learn remain live'); }
      if (command === 'stop-interview') { interview.kill(); console.log('Interview stopped; other services remain live'); }
      if (command === 'interview-live') { interview.kill(); await new Promise(resolve => interview.once('exit', resolve)); interview = child('services/interview', ['src/server.js'], interviewEnv); console.log('Interview now uses locally configured real Groq transport'); }
      if (command === 'interview-retry-due') { await mongoose.connection.useDb('collegehubs_demo_interview').collection('sessions').updateMany({ deliveryStatus: 'pending' }, { $set: { nextAttemptAt: new Date(0) } }); }
      if (command === 'start-interview') { interview = child('services/interview', ['--require', '../../scripts/interview-ai-fixture.cjs', 'src/server.js'], interviewEnv); }
      if (command === 'start-arcade') { arcade = child('services/arcade', ['src/server.js'], arcadeEnv); }
      if (command === 'arcade-retry-due') { const db = mongoose.connection.useDb('collegehubs_demo_arcade'); await db.collection('gamesessions').updateMany({ deliveryStatus: 'pending' }, { $set: { nextAttemptAt: new Date(0) } }); console.log('Disposable pending Arcade events made due'); }
      if (command === 'stop-learn') { learn.kill(); console.log('Learn stopped'); }
      if (command === 'start-learn') { learn = child('services/learn', ['dist/server.js'], learnEnv); }
      if (command === 'expire-learn') { await pool.query("UPDATE module_session SET expires_at=now()-interval '1 second'"); console.log('Fixture Learn sessions expired'); }
      if (command === 'db-down') { await admin.query(`ALTER DATABASE "${databaseName}" ALLOW_CONNECTIONS false`); await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1', [databaseName]); console.log('Only the disposable Learn database is offline'); }
      if (command === 'db-up') { await admin.query(`ALTER DATABASE "${databaseName}" ALLOW_CONNECTIONS true`); console.log('Disposable Learn database restored'); }
      if (command === 'quit') await close();
    } catch { console.error('Fixture command failed'); }
  });
  console.log('Integration fixture prepared at ' + origin + '. Commands: stop-core, start-core, stop-arcade, start-arcade, arcade-retry-due, stop-interview, start-interview, guards, stop-learn, start-learn, expire-learn, db-down, db-up, schedule-timeout, schedule-disable, quit.');
}
main().catch(() => { console.error('P3.2 fixture failed; check local disposable database and ports.'); process.exitCode = 1; });
