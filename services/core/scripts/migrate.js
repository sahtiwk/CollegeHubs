const { MongoClient } = require('mongoose').mongo;
const { migrate } = require('../migrations/runner');
async function main() {
  const args = process.argv.slice(2), database = args.find(a => a.startsWith('--database='))?.slice(11);
  if (!database || !/^[a-zA-Z0-9_]+$/.test(database) || args.length !== 2 || !args.some(a => ['--dry-run','--apply'].includes(a))) throw Error('arguments');
  const client = new MongoClient(process.env.MONGO_URI || '', { serverSelectionTimeoutMS: 5000 });
  if (client.options.dbName !== database || ['admin','local','config'].includes(database)) throw Error('target');
  try {
    await client.connect();
    const result = await migrate(client, database, { dryRun: args.includes('--dry-run') });
    console.log(JSON.stringify(result));
    if (result.complete === false) process.exitCode = 2; // Safe bounded stop; rerun.
  } finally { await client.close(); }
}
if (require.main === module) main().catch(() => { console.error('Core migration refused or failed. Check explicit target, replica set, migration history and database availability. No credentials are logged.'); process.exitCode = 1; });
