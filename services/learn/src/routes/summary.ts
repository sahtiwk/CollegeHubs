import type { Request, Response, NextFunction } from 'express';
import type { Database } from '../db/index.ts';
import type { LearnConfig } from '../auth/sessionService.ts';
import { authorizeRead } from '@collegehubs/contracts/module-read.cjs';
import {pathProgress} from '../services/progressAgent.ts';
export const summary = (pool: Database, config: LearnConfig) => async (req: Request, res: Response, next: NextFunction) => {
  let client;
  try {
    const principal = authorizeRead(req, config, 'learn');
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '500ms'");
    const { rows } = await client.query(`SELECT
      (SELECT count(*)::int FROM enrollment WHERE user_id=$1 AND hub_id=$2 AND active) AS enrollments,
      (SELECT count(DISTINCT (n.domain,n.slug))::int FROM node_completion c JOIN skill_node n ON n.hub_id=c.hub_id AND n.id=c.node_id WHERE c.user_id=$1 AND c.hub_id=$2) AS "completedNodes",
      (SELECT count(*)::int FROM quiz_attempt WHERE user_id=$1 AND hub_id=$2 AND status='finalized') AS "completedQuizzes",
      (SELECT count(*)::int FROM learn_event WHERE user_id=$1 AND hub_id=$2 AND status='pending') AS pending`, [principal.sub, principal.hubId]);
    const paths=await pathProgress(client,{hubId:principal.hubId,userId:principal.sub});
    const recent=(await client.query(`SELECT q.id FROM quiz_attempt q JOIN enrollment e ON e.hub_id=q.hub_id AND e.user_id=q.user_id AND e.domain=q.domain AND e.version=q.version AND e.active WHERE q.user_id=$1 AND q.hub_id=$2 AND q.status='active' AND q.expires_at>now() ORDER BY q.created_at DESC,q.id DESC LIMIT 1`,[principal.sub,principal.hubId])).rows[0];
    const nextNode=paths.find(p=>p.nextNode)?.nextNode;
    const next=recent?{kind:'quiz',id:recent.id}:nextNode?{kind:'node',id:nextNode.id}:null;
    await client.query('COMMIT');
    res.json({ schemaVersion:2, next, paths:paths.map(p=>({domain:p.domain,version:p.version,required:p.requiredCount,completed:p.completedCount})), status: 'ok', asOf: new Date().toISOString(), ...rows[0],requiredNodes:paths.reduce((n,p)=>n+p.requiredCount,0),optionalNodes:paths.reduce((n,p)=>n+p.optionalCount,0),completedPaths:paths.filter(p=>p.completedCount===p.requiredCount).length });
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); next(error); }
  finally { client?.release(); }
};
