// Domain flow adapted from MargaAI LearnerStateService/ProfilerAgent,
// RetrieverAgent and TutorAgent; see docs/THIRD_PARTY.md and docs/learn.md.
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { owned } from '../db/index.ts';
import type { Database, Owner } from '../db/index.ts';
import { pathsFor } from '../data/starterPaths.ts';
import { createHash } from 'node:crypto';
import type { Domain } from '../data/starterPaths.ts';
import { release, latestVersion, canonicalId, validateCurriculum } from './plannerAgent.ts';
import { unlockDownstream,pathProgress } from './progressAgent.ts';
import {remedialPlans} from './remediationPlanner.ts';
export const fail = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code });
export const ratings = ['new', 'some', 'comfortable', 'advanced'];
export function domainValue(value: unknown): Domain {
  if (typeof value !== 'string' || !Object.hasOwn(pathsFor(latestVersion),value)) throw fail(400, 'INVALID_DOMAIN', 'Choose a published learning domain.');
  return value as Domain;
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
export async function schemaVersion(c: PoolClient) { return (await c.query('SELECT version FROM learn_schema')).rows[0].version as number; }
async function availableVersion(c: PoolClient) { return await schemaVersion(c)>=3 ? latestVersion : 'demo-v1'; }
async function selectedVersion(c: PoolClient,o:Owner,domain:Domain) {
 const row=(await c.query('SELECT version FROM enrollment WHERE hub_id=$1 AND user_id=$2 AND domain=$3 ORDER BY active DESC,created_at DESC LIMIT 1', [...scope(o),domain])).rows[0];
 return row?.version || await availableVersion(c);
}
const catalog = (version:string) => Object.entries(pathsFor(version)).map(([domain,p])=>({domain,label:p!.label,description:p!.description,version,nodeCount:p!.nodes.length}));
export async function seedPath(c: PoolClient, o: Owner, domain: Domain, version?:string) {
  version ||= await availableVersion(c);
  const path=pathsFor(version)[domain];if(!path)throw fail(400,'DOMAIN_UNAVAILABLE','This domain requires the current curriculum.');
  const {curriculum,bank}=release(version);validateCurriculum(curriculum,bank);
  if(await schemaVersion(c)>=3) {
    const hash=createHash('sha256').update(JSON.stringify({curriculum,bank,paths:pathsFor(version)})).digest('hex');
    await c.query('INSERT INTO curriculum_publication(version,content_hash,metadata) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[version,hash,JSON.stringify({review:bank.review,attribution:bank.attribution,nodes:curriculum.nodes.length})]);
    if((await c.query('SELECT content_hash FROM curriculum_publication WHERE version=$1',[version])).rows[0].content_hash!==hash)throw fail(503,'CURRICULUM_CHANGED','Published content changed without a new version.');
  } else if(version!=='demo-v1')throw fail(503,'SCHEMA_UPGRADE_REQUIRED','The new paths are not available yet.');
  // Serialize a Hub catalog once across concurrent learners. No provider/LLM calls.
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`learn:${o.hubId}:${domain}:${version}`]);
  await c.query('INSERT INTO learning_path(hub_id,domain,version) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [o.hubId, domain, version]);
  const ids = new Map<string, string>();
  for (const [position, n] of path.nodes.entries()) {
    await c.query('INSERT INTO skill_node(hub_id,id,domain,version,slug,label,description,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(hub_id,domain,version,slug) DO NOTHING', [o.hubId, randomUUID(), domain, version, n.slug, n.label, n.description, position]);
    const { rows } = await c.query('SELECT id FROM skill_node WHERE hub_id=$1 AND domain=$2 AND version=$3 AND slug=$4', [o.hubId, domain, version, n.slug]);
    const id = rows[0].id; ids.set(n.slug, id);
    for (const item of bank.nodes.find((group:any) => group.slug === n.slug && group.domain === domain)!.items) {
      await c.query('INSERT INTO quiz_item(hub_id,node_id,seed_id,mode,item) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [o.hubId,id,item.id,item.mode,JSON.stringify(item)]);
    }
    await c.query(`INSERT INTO content_item(hub_id,node_id,id,title,summary,url,attribution,checked_at)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8
      WHERE NOT EXISTS(SELECT 1 FROM content_item WHERE hub_id=$1 AND node_id=$2)`, [o.hubId, id, randomUUID(), n.resource.title, n.resource.summary, n.resource.url, 'Linked documentation: '+new URL(n.resource.url).hostname+'; external content retains its publisher’s license.',bank.review.reviewedAt]);
    if (n.prerequisite) await c.query('INSERT INTO node_prerequisite(hub_id,domain,version,node_id,prerequisite_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [o.hubId, domain, version, id, ids.get(n.prerequisite)]);
  }
}
async function initialize(c: PoolClient, o: Owner, domain: Domain, requestedVersion?:string) {
  const version=requestedVersion || await selectedVersion(c,o,domain);
  await seedPath(c, o, domain,version);
  await c.query(`INSERT INTO enrollment(hub_id,user_id,domain,version) VALUES($1,$2,$3,$4)
    ON CONFLICT(hub_id,user_id,domain,version) DO UPDATE SET active=true,updated_at=now()`, [...scope(o), domain, version]);
  await c.query(`INSERT INTO learner_node_state(hub_id,user_id,domain,version,node_id,status)
    SELECT n.hub_id,$2,n.domain,n.version,n.id,CASE WHEN EXISTS(SELECT 1 FROM node_prerequisite p WHERE p.hub_id=n.hub_id AND p.node_id=n.id) THEN 'locked' ELSE 'unlocked' END
    FROM skill_node n WHERE n.hub_id=$1 AND n.domain=$3 AND n.version=$4 ON CONFLICT DO NOTHING`, [...scope(o), domain, version]);
  return { domain, version, initialized: true, assessmentAvailable: true };
}
async function enrolled(c: PoolClient, o: Owner, domain: Domain) {
  const version=await selectedVersion(c,o,domain);
  const result = await c.query('SELECT 1 FROM enrollment WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4 AND active', [...scope(o), domain, version]);
  if (!result.rowCount) throw fail(404, 'PATH_NOT_FOUND', 'Enroll in this learning path first.');
  return version;
}
export async function accessibleNode(c: PoolClient, o: Owner, id: string) {
  const { rows } = await c.query(`SELECT n.id,n.slug,n.label,n.description,n.domain,n.version,s.status,e.active,e.updated_at::text AS generation
    FROM learner_node_state s JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
    JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version
    WHERE s.hub_id=$1 AND s.user_id=$2 AND s.node_id=$3 AND (e.active OR EXISTS(SELECT 1 FROM enrollment newer WHERE newer.hub_id=e.hub_id AND newer.user_id=e.user_id AND newer.domain=e.domain AND newer.active AND newer.version<>e.version))`, [...scope(o), id]);
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
      const latest=await availableVersion(c);
      const {rows}=await c.query('SELECT domain,version,self_rating AS "selfRating" FROM enrollment WHERE hub_id=$1 AND user_id=$2 AND active',scope(o));
      return {domains:catalog(latest).map(p=>{const r=rows.find(r=>r.domain===p.domain);return {...p,enrolled:!!r,selfRating:r?.selfRating||'new',version:r?.version||latest,latestVersion:latest,nodeCount:pathsFor(r?.version||latest)[p.domain as Domain]!.nodes.length,latestNodeCount:p.nodeCount,upgradeAvailable:!!r&&r.version!==latest};})};
    }),
    onboardingProfile: (o:Owner,domain: Domain) => owned(pool,o,async c=>{const version=await selectedVersion(c,o,domain),path=pathsFor(version)[domain];if(!path)throw fail(400,'DOMAIN_UNAVAILABLE','Choose a currently available path.');return {domain,version,seedTopics:path.nodes.map(n=>n.label),assessmentAvailable:true};}),
    initialize: (o: Owner, domain: Domain) => owned(pool, o, c => initialize(c, o, domain)),
    upgrade: (o:Owner,domain:Domain,fromVersion:string,toVersion:string) => owned(pool,o,async c=>{
      const latest=await availableVersion(c),current=await enrolled(c,o,domain);
      if(toVersion!==latest||fromVersion===toVersion)throw fail(400,'INVALID_UPGRADE','Choose the published upgrade.');
      if(current===toVersion)return {domain,version:current,upgraded:true};
      if(current!==fromVersion)throw fail(409,'PATH_CHANGED','Reload your saved path before upgrading.');
      await c.query("UPDATE quiz_attempt SET status='cancelled' WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4 AND status='active'",[...scope(o),domain,current]);
      await c.query('UPDATE enrollment SET active=false,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4',[...scope(o),domain,current]);
      await initialize(c,o,domain,toVersion);
      // Equivalent mastery is copied as progress, never as a new completion/event.
      await c.query(`UPDATE learner_node_state s SET status='completed',theta=old.theta,assessed_at=old.assessed_at,updated_at=now()
        FROM skill_node n,skill_node prior,learner_node_state old
        WHERE s.hub_id=$1 AND s.user_id=$2 AND s.domain=$3 AND s.version=$5
        AND n.hub_id=s.hub_id AND n.id=s.node_id AND prior.hub_id=n.hub_id AND prior.domain=n.domain AND prior.slug=n.slug AND prior.version=$4
        AND old.hub_id=prior.hub_id AND old.user_id=s.user_id AND old.node_id=prior.id AND old.status='completed'`,[...scope(o),domain,current,toVersion]);
      await unlockDownstream(c,o,domain,toVersion);
      return {domain,version:toVersion,upgraded:true,historyPreserved:true};
    }),
    onboard: (o: Owner, domain: Domain, selfRating: string, p: { goal: string; dailyMinutes: number }) => owned(pool, o, async c => {
      const result = await initialize(c, o, domain), version=result.version;
      await c.query('UPDATE enrollment SET self_rating=$5,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4', [...scope(o), domain, version, selfRating]);
      await c.query('UPDATE learner SET goal=$3,daily_minutes=$4,updated_at=now() WHERE hub_id=$1 AND user_id=$2', [...scope(o), p.goal, p.dailyMinutes]);
      return result;
    }),
    intake: (o: Owner, domain: Domain, selfRating: string) => owned(pool, o, async c => {
      const version=await enrolled(c, o, domain);
      await c.query('UPDATE enrollment SET self_rating=$5,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4', [...scope(o), domain, version, selfRating]);
      return { domain, selfRating, assessmentAvailable: true };
    }),
    graph: (o: Owner) => owned(pool, o, async c => {
      const { rows: nodes } = await c.query(`SELECT n.id,n.label,n.description,n.domain,n.version,s.status,CASE WHEN n.position=0 THEN 'Start here' ELSE 'Build on it' END AS category
        FROM learner_node_state s JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
        JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version AND e.active
        WHERE s.hub_id=$1 AND s.user_id=$2 ORDER BY n.domain,n.position,n.id`, scope(o));
      const { rows: links } = await c.query(`SELECT p.prerequisite_id AS source,p.node_id AS target FROM node_prerequisite p
        JOIN enrollment e ON e.hub_id=p.hub_id AND e.domain=p.domain AND e.version=p.version AND e.active
        WHERE e.hub_id=$1 AND e.user_id=$2 ORDER BY p.domain,p.node_id`, scope(o));
      return { userId: o.userId, hubId: o.hubId, versions:[...new Set(nodes.map(n=>n.version))], nodes, links, assessmentAvailable: true };
    }),
    stats: (o: Owner) => owned(pool, o, async c => {
      const { rows } = await c.query(`SELECT count(DISTINCT e.domain)::int AS "activePaths",count(s.node_id)::int AS "totalTopics",count(s.node_id) FILTER(WHERE s.status='unlocked')::int AS "availableTopics"
        FROM enrollment e LEFT JOIN learner_node_state s ON s.hub_id=e.hub_id AND s.user_id=e.user_id AND s.domain=e.domain AND s.version=e.version
        WHERE e.hub_id=$1 AND e.user_id=$2 AND e.active`, scope(o));
      return { ...rows[0], paths:await pathProgress(c,o), assessmentAvailable: true };
    }),
    // No local Aura-derived milestones or inferred completion from opening content.
    milestones: (o: Owner) => owned(pool, o, async c => {
      const { rows } = await c.query(`SELECT n.id AS "nodeId",n.label,n.domain,s.assessed_at AS "assessedAt" FROM learner_node_state s
        JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
        JOIN enrollment e ON e.hub_id=s.hub_id AND e.user_id=s.user_id AND e.domain=s.domain AND e.version=s.version AND e.active
        WHERE s.hub_id=$1 AND s.user_id=$2 AND s.status='completed' AND s.assessed_at IS NOT NULL
        ORDER BY s.assessed_at DESC,n.id LIMIT 5`, scope(o));
      return { milestones: rows, paths:await pathProgress(c,o), assessmentAvailable: true };
    }),
    node: (o: Owner, id: string) => owned(pool, o, async c => {
      const node=await accessibleNode(c,o,id);
      const history=await c.query('SELECT id,mode,status,expires_at FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND version=$4 ORDER BY created_at DESC',[...scope(o),id,node.version]);
      const current=history.rows.find(a=>a.status==='active'&&+a.expires_at>Date.now());
      return {node,resources:await resources(c,o,id),remediation:await schemaVersion(c)>=4?await remedialPlans(c,o,id):[],source:'seed',assessmentAvailable:true,testOutEligible:node.active&&node.status==='unlocked'&&!history.rowCount,activeAttemptId:current?.id||null};
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
    reviewRemediation:(o:Owner,id:string)=>owned(pool,o,async c=>{
      if(await schemaVersion(c)<4)throw fail(404,'REMEDIATION_UNAVAILABLE','Review steps are unavailable.');
      const plan=(await remedialPlans(c,o)).find(p=>p.id===id);
      if(!plan)throw fail(404,'REMEDIATION_UNAVAILABLE','Review steps are unavailable.');
      await c.query('UPDATE remedial_plan SET reviewed=true WHERE id=$1 AND hub_id=$2 AND user_id=$3',[id,o.hubId,o.userId]);
      return {reviewed:true,assessmentRequired:true};
    }),
    reset: (o: Owner, domain: Domain) => owned(pool, o, async c => {
      const version=await selectedVersion(c,o,domain);
      await c.query("UPDATE quiz_attempt SET status='cancelled' WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4 AND status='active'", [...scope(o),domain,version]);
      // Never delete enrollment identities or any immutable result/event records.
      await c.query(`UPDATE learner_node_state s SET status=CASE WHEN EXISTS(SELECT 1 FROM node_prerequisite p WHERE p.hub_id=s.hub_id AND p.node_id=s.node_id) THEN 'locked' ELSE 'unlocked' END,
        theta=NULL,assessed_at=NULL,updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4`, [...scope(o), domain, version]);
      await c.query("UPDATE enrollment SET active=false,self_rating='new',updated_at=now() WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND version=$4", [...scope(o), domain, version]);
      return { domain, reset: true, rewardHistoryPreserved: true };
    })
  };
}
