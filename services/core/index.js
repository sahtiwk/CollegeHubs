require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const { createApp } = require('./app');

async function start() {
  // Build collections/indexes explicitly after connecting. With buffering disabled,
  // model auto-initialization during app composition can race the connection.
  mongoose.set('autoCreate', false).set('autoIndex', false);
  const app = createApp(); // Required auth/CORS configuration is validated first.
  require('./config/externalProviders').config();
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10, minPoolSize: 0, waitQueueTimeoutMS: 5000 });
  await mongoose.connection.db.command({ ping: 1 });
  // Unique provisioning/receipt keys must exist before accepting any write.
  await Promise.all(['College', 'Hub', 'Channel', 'Message', 'NativeFact', 'AchievementAward', 'AuraRuleSet', 'Contest', 'CalendarEvent', 'Problem', 'StudyRoom', 'StudySolution', 'PeerReview', 'User', 'VerificationChallenge', 'AuthSession', 'AuthThrottle', 'Post', 'ModuleGrant', 'ServiceCredential', 'AuraEvent', 'AuraBalance', 'AuraDayCounter', 'DailyActivity', 'ReconciliationLease', 'ExternalAccount', 'ExternalSnapshot', 'ProviderRequestLease'].map(async name => {
    const model = require('./models/' + name);
    await model.createCollection();
    await model.createIndexes();
  }));
  await require('./services/nativeAuraService').activate();
  const calendarConnection = require('./models/GoogleCalendarConnection');
  await calendarConnection.createCollection();
  await calendarConnection.createIndexes();
  if (require('./config/modules').moduleConfig().enabled.includes('arcade')) await require('./services/nativeAuraService').activate(require('./config/auraRules.arcade.v1.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('arcade')) await require('./services/nativeAuraService').activate(require('./config/auraRules.arcade.v2.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('arcade')) await require('./services/nativeAuraService').activate(require('./config/auraRules.arcade.v3.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('arcade')) await require('./services/nativeAuraService').activate(require('./config/auraRules.arcade.v4.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('interview')) await require('./services/nativeAuraService').activate(require('./config/auraRules.interview.v1.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('learn')) await require('./services/nativeAuraService').activate(require('./config/auraRules.learn.v1.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('learn')) await require('./services/nativeAuraService').activate(require('./config/auraRules.learn.v2.json'));
  if (require('./config/modules').moduleConfig().enabled.includes('learn')) await require('./services/nativeAuraService').activate(require('./config/auraRules.learn.paths.v1.json'));
  const stopDeadlines = await require('./services/studyDeadlineService').start(event => app.locals.publishStudy?.(event));
  const capture = require('./services/verificationMail').capability().mode === 'local-capture';
  const server = app.listen(process.env.PORT || 5000, capture ? '127.0.0.1' : undefined, () => console.log('Core API listening'));
  const io = require('./realtime').attachRealtime(server, app);
  const stopReconciliation = require('./services/reconciliationCoordinator').createCoordinator().start();
  const stopCalendar = require('./services/googleCalendarSync').startWorker();
  server.on('error', async () => {
    console.error('Core API listener failed');
    stopReconciliation();
    stopCalendar();
    await stopDeadlines();
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  const shutdown = async () => {
    stopReconciliation();
    stopCalendar();
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    await stopDeadlines();
    io.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  // Explicit loopback binding resolves asynchronously; callers need a ready address.
  if (!server.listening) await new Promise((resolve, reject) => {
    const ready = () => { server.off('error', reject); resolve(); };
    server.once('listening', ready);
    server.once('error', reject);
  });
  return server;
}

if (require.main === module) {
  start().catch(async () => {
    // Never log a connection error containing a URI or credentials.
    console.error('Core startup failed. Check required configuration and database availability.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = { start };
