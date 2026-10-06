import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createApp } from './app.ts';
import { configuration, createSessionStore } from './auth/sessionService.ts';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
async function start() {
  const config = configuration();
  if (!process.env.DATABASE_URL) throw new Error('Learn DATABASE_URL required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 3000, query_timeout: 4000, statement_timeout: 4000 });
  pool.on('error', () => console.error('Learn database connection unavailable'));
  const app = createApp({ config, pool, store: createSessionStore(pool, config) });
  const server = app.listen(Number(process.env.PORT || 5003), () => console.log('Learn API listening'));
  function stop() { const timer = setTimeout(() => process.exit(1), 10000); timer.unref(); server.close(async () => { await pool.end(); clearTimeout(timer); }); }
  server.on('error', () => { console.error('Learn listener failed'); void pool.end(); process.exitCode = 1; });
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
start().catch(() => { console.error('Learn startup failed. Check required service configuration.'); process.exitCode = 1; });
