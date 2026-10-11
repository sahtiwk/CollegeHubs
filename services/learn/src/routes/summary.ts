import type { Request, Response, NextFunction } from 'express';
import type { Database } from '../db/index.ts';
import type { LearnConfig } from '../auth/sessionService.ts';
import { authorizeRead } from '@collegehubs/contracts/module-read.cjs';
export const summary = (pool: Database, config: LearnConfig) => async (req: Request, res: Response, next: NextFunction) => {
  let client;
  try {
    const principal = authorizeRead(req, config, 'learn');
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '500ms'");
    const { rows } = await client.query(`SELECT
      (SELECT count(*)::int FROM enrollment WHERE user_id=$1 AND hub_id=$2) AS enrollments,
      (SELECT count(*)::int FROM node_completion WHERE user_id=$1 AND hub_id=$2) AS "completedNodes",
      (SELECT count(*)::int FROM quiz_attempt WHERE user_id=$1 AND hub_id=$2 AND status='finalized') AS "completedQuizzes",
      (SELECT count(*)::int FROM learn_event WHERE user_id=$1 AND hub_id=$2 AND status='pending') AS pending`, [principal.sub, principal.hubId]);
    await client.query('COMMIT');
    res.json({ status: 'ok', asOf: new Date().toISOString(), ...rows[0] });
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); next(error); }
  finally { client?.release(); }
};
