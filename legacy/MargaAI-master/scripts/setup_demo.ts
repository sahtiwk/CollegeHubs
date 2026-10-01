// Execute with Node >=22.18: node --experimental-strip-types scripts/setup_demo.ts.
// Additive fresh bootstrap only. Never drops, resets or migrates an existing DB.
import { Pool } from 'pg';
export const sessionDDL = `
CREATE TABLE module_handoff (
 state_hash text PRIMARY KEY CHECK (state_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_handoff_expiry ON module_handoff(expires_at);
CREATE TABLE module_session (
 session_hash text PRIMARY KEY CHECK (session_hash ~ '^[a-f0-9]{64}$'),
 user_id text NOT NULL CHECK (user_id ~ '^[a-f0-9]{24}$'),
 hub_id text NOT NULL CHECK (hub_id ~ '^[a-f0-9]{24}$'),
 principal json NOT NULL, theme json NOT NULL,
 csrf_hash text NOT NULL CHECK (csrf_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_session_owner ON module_session(hub_id,user_id);
CREATE INDEX module_session_expiry ON module_session(expires_at);
`;
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
  await client.query(sessionDDL); await client.query('COMMIT');
  console.log('Fresh Learn session-only schema created. No legacy tables installed.');
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { client.release(); await pool.end(); }
}
main().catch(() => { console.error('Learn bootstrap refused or failed. Check the disposable database name, confirmation and empty schema.'); process.exitCode = 1; });
