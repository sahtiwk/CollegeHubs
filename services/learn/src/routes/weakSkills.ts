import type { Request, Response, NextFunction } from 'express';
import type { Database } from '../db/index.ts';
import type { LearnConfig } from '../auth/sessionService.ts';
import { authorizeRead } from '@collegehubs/contracts/module-read.cjs';
export const weakSkills = (pool: Database, config: LearnConfig) => async (req: Request, res: Response, next: NextFunction) => {
  let client;
  try {
    const owner = authorizeRead(req, config, 'learn', 'weak-skills');
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '500ms'");
    // Select the latest final assessment BEFORE filtering its grade. Resets and inactive paths are excluded.
    const { rows } = await client.query(`SELECT n.id AS "nodeId", n.label, n.version, n.domain,
      'Last assessed ratio below 0.6' AS reason, a.finalized_at AS "asOf"
      FROM learner_node_state s
      JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version AND e.active
      JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id AND n.version=s.version
      JOIN LATERAL (SELECT result,finalized_at FROM quiz_attempt q
        WHERE q.hub_id=s.hub_id AND q.user_id=s.user_id AND q.node_id=s.node_id AND q.version=s.version AND q.status='finalized'
        ORDER BY q.finalized_at DESC,q.id DESC LIMIT 1) a ON a.finalized_at=s.assessed_at
      WHERE s.user_id=$1 AND s.hub_id=$2 AND s.assessed_at IS NOT NULL
        AND a.finalized_at >= now()-interval '30 days' AND a.finalized_at <= now()
        AND (a.result->>'ratio')::numeric >= 0 AND (a.result->>'ratio')::numeric < 0.6
      ORDER BY a.finalized_at DESC,n.id LIMIT 5`, [owner.sub, owner.hubId]);
    await client.query('COMMIT');
    res.json({ status: 'ok', asOf: new Date().toISOString(), items: rows });
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); next(error); }
  finally { client?.release(); }
};
