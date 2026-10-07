import type { Pool, PoolClient } from 'pg';
export type Database = Pick<Pool, 'query' | 'connect'>;
export type Owner = { hubId: string; userId: string };

// The owner comes only from the validated module session. Locking this row
// serializes initialization, preferences and reset, including resource reads.
export async function owned<T>(pool: Database, owner: Owner, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '4s'");
    await client.query('INSERT INTO learner(hub_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [owner.hubId, owner.userId]);
    await client.query('SELECT user_id FROM learner WHERE hub_id=$1 AND user_id=$2 FOR UPDATE', [owner.hubId, owner.userId]);
    const result = await work(client);
    await client.query('COMMIT'); return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
