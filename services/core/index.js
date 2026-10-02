require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const { createApp } = require('./app');

async function start() {
  // Build collections/indexes explicitly after connecting. With buffering disabled,
  // model auto-initialization during app composition can race the connection.
  mongoose.set('autoCreate', false).set('autoIndex', false);
  const app = createApp(); // Required auth/CORS configuration is validated first.
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.db.command({ ping: 1 });
  // Unique provisioning/receipt keys must exist before accepting any write.
  await Promise.all(['College', 'Hub', 'Channel', 'Message', 'NativeFact', 'AuraRuleSet', 'Problem', 'StudyRoom', 'StudySolution', 'PeerReview', 'User', 'Post', 'ModuleGrant', 'ServiceCredential', 'AuraEvent', 'AuraBalance', 'AuraDayCounter', 'DailyActivity'].map(async name => {
    const model = require('./models/' + name);
    await model.createCollection();
    await model.createIndexes();
  }));
  await require('./services/nativeAuraService').activate();
  const stopDeadlines = await require('./services/studyDeadlineService').start(event => app.locals.publishStudy?.(event));
  const server = app.listen(process.env.PORT || 5000, () => console.log('Core API listening'));
  const io = require('./realtime').attachRealtime(server, app);
  server.on('error', async () => {
    console.error('Core API listener failed');
    await stopDeadlines();
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  const shutdown = async () => {
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
