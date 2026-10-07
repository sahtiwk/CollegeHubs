require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
async function start() {
  const config = require('./auth/config').configuration();
  if (!process.env.INTERVIEW_MONGO_URI) throw Error('Interview database configuration required');
  const connection = await mongoose.createConnection(process.env.INTERVIEW_MONGO_URI, { serverSelectionTimeoutMS: 3000, socketTimeoutMS: 5000, waitQueueTimeoutMS: 2000, maxPoolSize: 10, bufferCommands: false, autoCreate: false, autoIndex: false }).asPromise();
  const models = { ...require('./models/ModuleSession')(connection), Resume: require('./models/Resume.model')(connection), Interview: require('./models/Interview.model')(connection), Session: require('./models/Session.model')(connection) };
  await Promise.all(Object.values(models).map(async model => { await model.createCollection(); await model.createIndexes(); }));
  const server = require('./app').createApp({ connection, models, config }).listen(process.env.PORT || 5002, () => console.log('Interview API listening'));
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  const close = () => { server.close(); void connection.close().finally(() => process.exit()); }; process.on('SIGTERM', close); process.on('SIGINT', close);
}
start().catch(() => { console.error('Interview startup failed; verify its own database, public key, origins and service configuration.'); process.exitCode = 1; });
