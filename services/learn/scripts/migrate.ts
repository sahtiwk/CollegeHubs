import { Pool } from 'pg';
import { migrate } from '../src/db/migrations/runner.ts';

async function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => a.startsWith('--database='))?.slice(11);
  if (!target || !/^[a-zA-Z0-9_]+$/.test(target) || args.length !== 2 || !args.some(a => ['--dry-run','--apply'].includes(a))) throw Error('arguments');
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || decodeURIComponent(url.pathname.slice(1)) !== target) throw Error('target');
  const pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 5000 });
  try {
    if ((await pool.query('SELECT current_database() AS name')).rows[0].name !== target) throw Error('target');
    console.log(JSON.stringify(await migrate(pool, { dryRun: args.includes('--dry-run') })));
  } finally { await pool.end(); }
}
main().catch(() => { console.error('Learn migration refused or failed. Check explicit target, retained v2 schema, migration history and database availability. No credentials are logged.'); process.exitCode = 1; });
