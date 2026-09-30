import 'server-only';
import { cookies } from 'next/headers';
import { Pool } from 'pg';
import { configuration, createSessionStore, sessionDto } from './sessionBoundary.cjs';
const globalPool = globalThis as unknown as { learnSessionPool?: Pool };
export function sessionStore() {
  const config = configuration();
  if (!process.env.DATABASE_URL) throw new Error('Learn database unavailable');
  const pool = globalPool.learnSessionPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 3000, query_timeout: 4000, statement_timeout: 4000 });
  return { store: createSessionStore(pool, config), config };
}
export async function getCoreSession() {
  const handle = (await cookies()).get('ch_learn_session')?.value;
  const row = await sessionStore().store.get(handle);
  return sessionDto(row, handle);
}
export const cookieOptions = { path: '/learn', secure: true, httpOnly: true, sameSite: 'lax' as const };
export const privateHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
