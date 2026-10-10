require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
let startupStage = 'configuration';
async function start() {
  const config = require('./auth/config').configuration();
  if (process.env.INTERVIEW_RECONCILE_KEY && !/^[a-zA-Z0-9_-]{43}$/.test(process.env.INTERVIEW_RECONCILE_KEY)) throw Error('Invalid Interview reconcile configuration');
  config.reconcileKey = process.env.INTERVIEW_RECONCILE_KEY;
  if (!process.env.INTERVIEW_MONGO_URI) throw Error('Interview database configuration required');
  startupStage = 'database-connect';
  const connection = await mongoose.createConnection(process.env.INTERVIEW_MONGO_URI, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 15000, waitQueueTimeoutMS: 5000, maxPoolSize: 10, bufferCommands: false, autoCreate: false, autoIndex: false }).asPromise();
  startupStage = 'models';
  const models = { ...require('./models/ModuleSession')(connection), Resume: require('./models/Resume.model')(connection), Interview: require('./models/Interview.model')(connection), Session: require('./models/Session.model')(connection), AiControl: require('./models/AiControl')(connection) };
  startupStage = 'database-indexes';
  await Promise.all(Object.values(models).map(async model => { await model.createCollection(); await model.createIndexes(); }));
  startupStage = 'application';
  const server = require('./app').createApp({ connection, models, config }).listen(process.env.PORT || 5002, () => console.log('Interview API listening'));
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  const close = () => { server.close(); void connection.close().finally(() => process.exit()); }; process.on('SIGTERM', close); process.on('SIGINT', close);
}
start().catch(error => {
  // Do not log error messages/stacks: driver errors can contain database credentials.
  const safeNames = ['MongoServerSelectionError', 'MongoNetworkError', 'MongoServerError', 'MongooseError', 'TypeError', 'Error'];
  console.error('Interview startup failed', JSON.stringify({ stage: startupStage,
    type: safeNames.includes(error?.name) ? error.name : 'Error',
    code: Number.isInteger(error?.code) ? error.code : undefined }));
  void mongoose.disconnect().finally(() => { process.exitCode = 1; });
});
