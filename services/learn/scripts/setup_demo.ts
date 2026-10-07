// Execute with Node >=22.18: node --experimental-strip-types scripts/setup_demo.ts.
// Additive fresh bootstrap only. Never drops, resets or migrates an existing DB.
import { Pool } from 'pg';
import { schemaDDL } from '../src/db/schema.ts';
async function main() {
 const url = new URL(process.env.DATABASE_URL || '');
 const name = decodeURIComponent(url.pathname.slice(1));
 if (process.env.NODE_ENV === 'production' || process.env.DEMO_RESET_ENABLED !== 'true' || !/^collegehubs_demo_learn_[a-z0-9_]+$/.test(name) ||
   !(process.env.DEMO_DB_NAME_ALLOWLIST || '').split(',').includes(name) || process.argv.slice(2).join(' ') !== '--confirm=' + name + ' --disposable-data-only') throw new Error('guard');
 const pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 3000 });
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(31001)');
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  if (tables.rowCount) throw new Error('Bootstrap requires a fresh empty database');
  await client.query(schemaDDL); await client.query('COMMIT');
  console.log('Fresh Learn schema v2 created: sessions, learners, scoped paths, nodes, resources, enrollments state, private quiz bank, attempts, completions, resources cache and outbox. No legacy tables installed.');
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { client.release(); await pool.end(); }
}
main().catch(() => { console.error('Learn bootstrap refused or failed. Check the disposable database name, confirmation and empty schema.'); process.exitCode = 1; });
