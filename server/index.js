require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const { createApp } = require('./app');

async function start() {
  const app = createApp(); // Required auth/CORS configuration is validated first.
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.db.command({ ping: 1 });
  const server = app.listen(process.env.PORT || 5000, () => console.log('Core API listening'));
  server.on('error', async () => {
    console.error('Core API listener failed');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  const shutdown = () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
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
