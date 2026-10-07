// Domain flow adapted from MargaAI LearnerStateService/ProfilerAgent,
// RetrieverAgent and TutorAgent; see THIRD_PARTY.md and docs/learn.md.
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { owned } from '../db/index.ts';
import type { Database, Owner } from '../db/index.ts';
import { starterPaths, curriculumVersion as version } from '../data/starterPaths.ts';
import type { Domain } from '../data/starterPaths.ts';
import { bank } from './plannerAgent.ts';
export const fail = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code });
export const ratings = ['new', 'some', 'comfortable', 'advanced'];
export function domainValue(value: unknown): Domain {
  if (value !== 'dsa' && value !== 'web') throw fail(400, 'INVALID_DOMAIN', 'Choose DSA or Web development.');
  return value;
}
export function ratingValue(value: unknown): string {
  if (typeof value !== 'string' || !ratings.includes(value)) throw fail(400, 'INVALID_RATING', 'Choose a supported self-rating.');
  return value;
}
export function preferencesValue(input: any) {
  if (typeof input.goal !== 'string' || input.goal.length > 240 || /[\x00-\x1f\x7f]/.test(input.goal) || ![10,20,30,45,60].includes(input.dailyMinutes)) throw fail(400, 'INVALID_PREFERENCES', 'Use a goal up to 240 characters and a supported daily duration.');
  return { goal: input.goal.trim(), dailyMinutes: input.dailyMinutes as number };
}
export function nodeId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)) throw fail(400, 'INVALID_ID', 'Invalid topic or resource identifier.');
  return value;
}
const scope = (o: Owner) => [o.hubId, o.userId];
const catalog = () => Object.entries(starterPaths).map(([domain, p]) => ({ domain, label: p.label, description: p.description, version, nodeCount: p.nodes.length }));
export async function seedPath(c: PoolClient, o: Owner, domain: Domain) {
  // Serialize a Hub catalog once across concurrent learners. No provider/LLM calls.
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`learn:${o.hubId}:${domain}:${version}`]);
  await c.query('INSERT INTO learning_path(hub_id,domain,version) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [o.hubId, domain, version]);
  const ids = new Map<string, string>();
  for (const [position, n] of starterPaths[domain].nodes.entries()) {
    await c.query('INSERT INTO skill_node(hub_id,id,domain,version,slug,label,description,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(hub_id,domain,version,slug) DO NOTHING', [o.hubId, randomUUID(), domain, version, n.slug, n.label, n.description, position]);
    const { rows } = await c.query('SELECT id FROM skill_node WHERE hub_id=$1 AND domain=$2 AND version=$3 AND slug=$4', [o.hubId, domain, version, n.slug]);
    const id = rows[0].id; ids.set(n.slug, id);
    for (const item of bank.nodes.find(group => group.slug === n.slug && group.domain === domain)!.items) {
      await c.query('INSERT INTO quiz_item(hub_id,node_id,seed_id,mode,item) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [o.hubId,id,item.id,item.mode,JSON.stringify(item)]);
    }
    await c.query(`INSERT INTO content_item(hub_id,node_id,id,title,summary,url,attribution,checked_at)
      SELECT $1,$2,$3,$4,$5,$6,'MDN Web Docs contributors; linked reading, not reproduced content.','2026-10-07T00:00:00Z'
      WHERE NOT EXISTS(SELECT 1 FROM content_item WHERE hub_id=$1 AND node_id=$2)`, [o.hubId, id, randomUUID(), n.resource.title, n.resource.summary, n.resource.url]);
    if (n.prerequisite) await c.query('INSERT INTO node_prerequisite(hub_id,domain,version,node_id,prerequisite_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [o.hubId, domain, version, id, ids.get(n.prerequisite)]);
  }
}
async function initialize(c: PoolClient, o: Owner, domain: Domain) {
  await seedPath(c, o, domain);
  await c.query(`INSERT INTO enrollment(hub_id,user_id,domain,version) VALUES($1,$2,$3,$4)
    ON CONFLICT(hub_id,user_id,domain,version) DO UPDATE SET active=true,updated_at=now()`, [...scope(o), domain, version]);
  await c.query(`INSERT INTO learner_node_state(hub_id,user_id,domain,version,node_id,status)
    SELECT n.hub_id,$2,n.domain,n.version,n.id,CASE WHEN EXISTS(SELECT 1 FROM node_prerequisite p WHERE p.hub_id=n.hub_id AND p.node_id=n.id) THEN 'locked' ELSE 'unlocked' END
    FROM skill_node n WHERE n.hub_id=$1 AND n.domain=$3 AND n.version=$4 ON CONFLICT DO NOTHING`, [...scope(o), domain, version]);
  return { domain, version, initialized: true, assessmentAvailable: true };
}
async function enrolled(c: PoolClient, o: Owner, domain: Domain) {
  const result = await c.query('SELECT 1 FROM enrollment WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4 AND active', [...scope(o), domain, version]);
  if (!result.rowCount) throw fail(404, 'PATH_NOT_FOUND', 'Enroll in this learning path first.');
}
export async function accessibleNode(c: PoolClient, o: Owner, id: string) {
  const { rows } = await c.query(`SELECT n.id,n.label,n.description,n.domain,n.version,s.status
    FROM learner_node_state s JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
    JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version AND e.active
    WHERE s.hub_id=$1 AND s.user_id=$2 AND s.node_id=$3 AND s.version=$4`, [...scope(o), id, version]);
  if (!rows[0]) throw fail(404, 'NODE_NOT_FOUND', 'This topic is not in your active learning paths.');
  if (rows[0].status === 'locked') throw fail(403, 'NODE_LOCKED', 'Complete the prerequisite assessment before opening this topic.');
  return rows[0];
}
async function resources(c: PoolClient, o: Owner, id: string) {
  const { rows } = await c.query('SELECT id,title,summary,url,attribution,checked_at AS "checkedAt" FROM content_item WHERE hub_id=$1 AND node_id=$2 ORDER BY title,id LIMIT 10', [o.hubId, id]);
  return rows;
}
export function learnerService(pool: Database) {
  return {
    profile: (o: Owner) => owned(pool, o, async c => (await c.query('SELECT goal,daily_minutes AS "dailyMinutes",created_at AS "createdAt",updated_at AS "updatedAt" FROM learner WHERE hub_id=$1 AND user_id=$2', scope(o))).rows[0]),
    preferences: (o: Owner, p: { goal: string; dailyMinutes: number }) => owned(pool, o, async c => (await c.query('UPDATE learner SET goal=$3,daily_minutes=$4,updated_at=now() WHERE hub_id=$1 AND user_id=$2 RETURNING goal,daily_minutes AS "dailyMinutes",updated_at AS "updatedAt"', [...scope(o), p.goal, p.dailyMinutes])).rows[0]),
    domains: (o: Owner) => owned(pool, o, async c => {
      const { rows } = await c.query('SELECT domain,self_rating AS "selfRating" FROM enrollment WHERE hub_id=$1 AND user_id=$2 AND version=$3 AND active', [...scope(o), version]);
      return { domains: catalog().map(p => ({ ...p, enrolled: rows.some(r => r.domain === p.domain), selfRating: rows.find(r => r.domain === p.domain)?.selfRating || 'new' })) };
    }),
    onboardingProfile: (domain: Domain) => ({ domain, version, seedTopics: starterPaths[domain].nodes.map(n => n.label), assessmentAvailable: true }),
    initialize: (o: Owner, domain: Domain) => owned(pool, o, c => initialize(c, o, domain)),
    onboard: (o: Owner, domain: Domain, selfRating: string, p: { goal: string; dailyMinutes: number }) => owned(pool, o, async c => {
      const result = await initialize(c, o, domain);
      await c.query('UPDATE enrollment SET self_rating=$5,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4', [...scope(o), domain, version, selfRating]);
      await c.query('UPDATE learner SET goal=$3,daily_minutes=$4,updated_at=now() WHERE hub_id=$1 AND user_id=$2', [...scope(o), p.goal, p.dailyMinutes]);
      return result;
    }),
    intake: (o: Owner, domain: Domain, selfRating: string) => owned(pool, o, async c => {
      await enrolled(c, o, domain);
      await c.query('UPDATE enrollment SET self_rating=$5,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4', [...scope(o), domain, version, selfRating]);
      return { domain, selfRating, assessmentAvailable: true };
    }),
    graph: (o: Owner) => owned(pool, o, async c => {
      const { rows: nodes } = await c.query(`SELECT n.id,n.label,n.description,n.domain,n.version,s.status,CASE WHEN n.position=0 THEN 'Start here' ELSE 'Build on it' END AS category
        FROM learner_node_state s JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
        JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version AND e.active
        WHERE s.hub_id=$1 AND s.user_id=$2 AND s.version=$3 ORDER BY n.domain,n.position,n.id`, [...scope(o), version]);
      const { rows: links } = await c.query(`SELECT p.prerequisite_id AS source,p.node_id AS target FROM node_prerequisite p
        JOIN enrollment e ON e.hub_id=p.hub_id AND e.domain=p.domain AND e.version=p.version AND e.active
        WHERE e.hub_id=$1 AND e.user_id=$2 AND e.version=$3 ORDER BY p.domain,p.node_id`, [...scope(o), version]);
      return { userId: o.userId, hubId: o.hubId, version, nodes, links, assessmentAvailable: true };
    }),
    stats: (o: Owner) => owned(pool, o, async c => {
      const { rows } = await c.query(`SELECT count(DISTINCT e.domain)::int AS "activePaths",count(s.node_id)::int AS "totalTopics",count(s.node_id) FILTER(WHERE s.status='unlocked')::int AS "availableTopics"
        FROM enrollment e LEFT JOIN learner_node_state s ON s.hub_id=e.hub_id AND s.user_id=e.user_id AND s.domain=e.domain AND s.version=e.version
        WHERE e.hub_id=$1 AND e.user_id=$2 AND e.version=$3 AND e.active`, [...scope(o), version]);
      return { ...rows[0], assessmentAvailable: true };
    }),
    // No local Aura-derived milestones or inferred completion from opening content.
    milestones: (o: Owner) => owned(pool, o, async c => {
      const { rows } = await c.query(`SELECT n.id AS "nodeId",n.label,n.domain,s.assessed_at AS "assessedAt" FROM learner_node_state s
        JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
        JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version AND e.active
        WHERE s.hub_id=$1 AND s.user_id=$2 AND s.version=$3 AND s.status='completed' AND s.assessed_at IS NOT NULL
        ORDER BY s.assessed_at DESC,n.id LIMIT 5`, [...scope(o), version]);
      return { milestones: rows, assessmentAvailable: true };
    }),
    node: (o: Owner, id: string) => owned(pool, o, async c => {
      const node=await accessibleNode(c,o,id);
      const history=await c.query('SELECT id,mode,status,expires_at FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND version=$4 ORDER BY created_at DESC',[...scope(o),id,version]);
      const current=history.rows.find(a=>a.status==='active'&&+a.expires_at>Date.now());
      return {node,resources:await resources(c,o,id),source:'seed',assessmentAvailable:true,testOutEligible:node.status==='unlocked'&&!history.rowCount,activeAttemptId:current?.id||null};
    }),
    recommend: (o: Owner, id: string) => owned(pool, o, async c => {
      await accessibleNode(c, o, id);
      const items = await resources(c, o, id);
      return { recommendedItem: items[0] || null, source: items.length ? 'seed' : 'unavailable', reasoning: items.length ? 'A curated starting resource for this topic. No assessed ability is assumed.' : 'No resource is available for this topic.' };
    }),
    tutor: (o: Owner, id: string, contentId: string) => owned(pool, o, async c => {
      const n = await accessibleNode(c, o, id);
      const item = (await resources(c, o, id)).find(r => r.id === contentId);
      if (!item) throw fail(404, 'RESOURCE_NOT_FOUND', 'This resource does not belong to the topic.');
      return { source: 'template', explanation: `Start with ${n.label}. ${n.description} Read “${item.title}”, then explain one example in your own words. This is reading guidance, not an assessment of your ability.` };
    }),
    reset: (o: Owner, domain: Domain) => owned(pool, o, async c => {
      await c.query("UPDATE quiz_attempt SET status='cancelled' WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4 AND status='active'", [...scope(o),domain,version]);
      // Never delete enrollment identities or any immutable result/event records.
      await c.query(`UPDATE learner_node_state s SET status=CASE WHEN EXISTS(SELECT 1 FROM node_prerequisite p WHERE p.hub_id=s.hub_id AND p.node_id=s.node_id) THEN 'locked' ELSE 'unlocked' END,
        theta=NULL,assessed_at=NULL,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4`, [...scope(o), domain, version]);
      await c.query("UPDATE enrollment SET active=false,self_rating='new',updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4", [...scope(o), domain, version]);
      return { domain, reset: true, rewardHistoryPreserved: true };
    })
  };
}
