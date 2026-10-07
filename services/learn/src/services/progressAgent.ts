// MargaAI progression port: all prerequisite states scoped to the same learner.
import type { PoolClient } from 'pg';
import type { Owner } from '../db/index.ts';
export async function unlockDownstream(c: PoolClient, o: Owner, domain: string, version: string) {
  await c.query(`UPDATE learner_node_state s SET status='unlocked',updated_at=now()
    WHERE s.hub_id=$1 AND s.user_id=$2 AND s.domain=$3 AND s.version=$4 AND s.status='locked'
    AND NOT EXISTS(SELECT 1 FROM node_prerequisite p LEFT JOIN learner_node_state prior
      ON prior.hub_id=p.hub_id AND prior.user_id=s.user_id AND prior.node_id=p.prerequisite_id
      WHERE p.hub_id=s.hub_id AND p.node_id=s.node_id AND (prior.status IS DISTINCT FROM 'completed'))`, [o.hubId,o.userId,domain,version]);
}
