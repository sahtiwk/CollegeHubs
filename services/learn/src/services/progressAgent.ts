// MargaAI progression port: all prerequisite states scoped to the same learner.
import type { PoolClient } from 'pg';
import type { Owner } from '../db/index.ts';
import {release} from './plannerAgent.ts';
export async function pathProgress(c:PoolClient,o:Owner){
 const enrollments=(await c.query('SELECT domain,version FROM enrollment WHERE hub_id=$1 AND user_id=$2 AND active ORDER BY domain',[o.hubId,o.userId])).rows;
 const schema=(await c.query('SELECT version FROM learn_schema')).rows[0].version;
 const paths=[];
 for(const e of enrollments){
  const required=release(e.version).curriculum.nodes.filter((n:any)=>n.domain===e.domain&&n.required!==false);
  const states=(await c.query('SELECT n.id,n.slug,n.label,s.status FROM skill_node n JOIN learner_node_state s ON s.hub_id=n.hub_id AND s.node_id=n.id WHERE s.hub_id=$1 AND s.user_id=$2 AND s.domain=$3 AND s.version=$4 ORDER BY n.position',[o.hubId,o.userId,e.domain,e.version])).rows;
  const completed=required.filter((n:any)=>states.some(s=>s.slug===n.slug&&s.status==='completed')).length;
  const optional=schema>=4?(await c.query(`SELECT COALESCE(sum(jsonb_array_length(r.steps)),0)::int AS total,COALESCE(sum(jsonb_array_length(r.steps)) FILTER(WHERE r.reviewed OR r.resolved),0)::int AS completed FROM remedial_plan r JOIN skill_node n ON n.hub_id=r.hub_id AND n.id=r.node_id WHERE r.hub_id=$1 AND r.user_id=$2 AND n.domain=$3 AND r.version=$4`,[o.hubId,o.userId,e.domain,e.version])).rows[0]:{total:0,completed:0};
  const completion=schema>=4?(await c.query('SELECT completed_at AS "completedAt",attempt_id AS "attemptId" FROM path_completion WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4',[o.hubId,o.userId,e.domain,e.version])).rows[0]||null:null;
  paths.push({...e,requiredCount:required.length,completedCount:completed,optionalCount:optional.total,optionalCompletedCount:optional.completed,nextNode:states.find(s=>s.status==='unlocked')||null,completion});
 }
 return paths;
}
export async function unlockDownstream(c: PoolClient, o: Owner, domain: string, version: string) {
  await c.query(`UPDATE learner_node_state s SET status='unlocked',updated_at=now()
    WHERE s.hub_id=$1 AND s.user_id=$2 AND s.domain=$3 AND s.version=$4 AND s.status='locked'
    AND NOT EXISTS(SELECT 1 FROM node_prerequisite p LEFT JOIN learner_node_state prior
      ON prior.hub_id=p.hub_id AND prior.user_id=s.user_id AND prior.node_id=p.prerequisite_id
      WHERE p.hub_id=s.hub_id AND p.node_id=s.node_id AND (prior.status IS DISTINCT FROM 'completed'))`, [o.hubId,o.userId,domain,version]);
}
