import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

export type Migration = { id: string; checksum: string; sql: string };
export async function loadMigrations(): Promise<Migration[]> {
  const directory = new URL('./', import.meta.url);
  const names = (await readdir(directory)).filter(n => /^\d{4}_[a-z0-9_]+\.sql$/.test(n)).sort();
  return Promise.all(names.map(async name => {
    const sql = (await readFile(new URL(name, directory), 'utf8')).replace(/\r\n/g, '\n');
    return { id: name.slice(0, -4), checksum: createHash('sha256').update(sql).digest('hex'), sql };
  }));
}
const tables = ['module_handoff','module_session','learn_schema','learner','learning_path','skill_node','node_prerequisite','content_item','enrollment','learner_node_state','quiz_item','quiz_attempt','node_completion','learn_event','resource_cache'];
export async function migrate(pool: Pool, { dryRun = true, migrations }: { dryRun?: boolean; migrations?: Migration[] } = {}) {
  const catalog = migrations ?? await loadMigrations();
  if (!catalog.length || catalog.some((m,i) => !/^\d{4}_[a-z0-9_]+$/.test(m.id) || !/^[a-f0-9]{64}$/.test(m.checksum) || (i > 0 && catalog[i-1].id >= m.id))) throw Error('Invalid migration catalog');
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query("SET lock_timeout='5s'; SET statement_timeout='30s'; SET search_path=public");
    await client.query('SELECT pg_advisory_lock(31002)'); locked = true;
    const found = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if (tables.some(t => !found.rows.some(r => r.tablename === t))) throw Error('Retained schema v2 required; use fresh bootstrap only on an empty database');
    const version = await client.query('SELECT version FROM learn_schema');
    if (version.rows.length !== 1 || ![2,3,4,5].includes(version.rows[0].version)) throw Error('Unsupported schema version');
    const triggers = await client.query("SELECT tgname, relname FROM pg_trigger JOIN pg_class ON tgrelid=pg_class.oid JOIN pg_namespace ON relnamespace=pg_namespace.oid WHERE nspname='public' AND tgenabled='O' AND NOT tgisinternal");
    for (const [name, table] of [['protect_quiz_attempt','quiz_attempt'],['protect_completion','node_completion'],['protect_learn_event','learn_event']]) {
      if (!triggers.rows.some(r => r.tgname === name && r.relname === table)) throw Error('Immutable trigger missing');
    }
    const hasLedger = found.rows.some(r => r.tablename === 'schema_migration');
    const applied = hasLedger ? (await client.query('SELECT id,checksum FROM schema_migration ORDER BY id')).rows : [];
    if (applied.some((r,i) => catalog[i]?.id !== r.id || catalog[i]?.checksum !== r.checksum)) throw Error('Migration history/checksum mismatch');
    const pending = catalog.slice(applied.length);
    if (dryRun) return { dryRun, applied: applied.map(r => r.id), pending: pending.map(m => m.id) };
    // One transaction per migration; ledger write commits with its DDL/data.
    // Session advisory lock spans all migrations and is released on disconnect.
    for (const migration of pending) {
      await client.query('BEGIN');
      try {
        await client.query('CREATE TABLE IF NOT EXISTS schema_migration (id text PRIMARY KEY, checksum text NOT NULL CHECK(length(checksum)=64), applied_at timestamptz NOT NULL DEFAULT now())');
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migration(id,checksum) VALUES($1,$2)', [migration.id,migration.checksum]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    return { dryRun, applied: catalog.map(m => m.id), pending: [] };
  } finally {
    // Destroy this dedicated connection rather than leaking session settings/locks.
    if (locked) await client.query('SELECT pg_advisory_unlock(31002)').catch(() => {});
    client.release(true);
  }
}
