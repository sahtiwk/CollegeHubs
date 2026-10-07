import { randomUUID } from 'node:crypto';
import { owned } from '../db/index.ts';
import type { Database, Owner } from '../db/index.ts';
import type { PoolClient } from 'pg';
import { fail, accessibleNode } from './learnerService.ts';
import { gradeAttempt } from './assessmentService.ts';
import type { Mode, SavedAnswer } from './assessmentService.ts';
import { snapshotQuestions } from './quizAgent.ts';
import { unlockDownstream } from './progressAgent.ts';

async function attempt(c: PoolClient, o: Owner, id: string) {
  const { rows } = await c.query('SELECT * FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND id=$3', [o.hubId,o.userId,id]);
  if (!rows[0]) throw fail(404,'ATTEMPT_NOT_FOUND','This attempt is unavailable.');
  return rows[0];
}
async function publicAttempt(c: PoolClient, a: any) {
  const answers = a.answers as Record<string,SavedAnswer>;
  const index = a.questions.findIndex((q: any) => !answers[q.id]);
  const q = a.status === 'active' && +a.expires_at > Date.now() && index >= 0 ? a.questions[index] : null;
  const { rows: rewards } = await c.query('SELECT event_id AS "eventId",status,receipt FROM learn_event WHERE hub_id=$1 AND user_id=$2 AND attempt_id=$3 ORDER BY event_id', [a.hub_id,a.user_id,a.id]);
  return { id:a.id,nodeId:a.node_id,domain:a.domain,version:a.version,mode:a.mode,status:a.status === 'active' && +a.expires_at <= Date.now() ? 'expired' : a.status,
    createdAt:a.created_at,expiresAt:a.expires_at,itemCount:a.questions.length,answeredCount:Object.keys(answers).length,
    question:q ? {id:q.id,prompt:q.prompt,options:q.options,number:index+1} : null,
    result:a.result,rewards };
}
async function active(c: PoolClient, o: Owner, a: any) {
  if (a.status !== 'active') throw fail(409,'ATTEMPT_CLOSED','This attempt is already closed.');
  if (+a.expires_at <= Date.now()) throw fail(409,'ATTEMPT_EXPIRED','This attempt expired. Start a new checkpoint.');
  await accessibleNode(c,o,a.node_id);
}
export function attemptService(pool: Database) {
  return {
    create:(o:Owner,nodeId:string,mode:Mode,requestId:string) => owned(pool,o,async c=>{
      const previous = await c.query('SELECT * FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND request_id=$3',[o.hubId,o.userId,requestId]);
      if(previous.rows[0]) {
        const a=previous.rows[0]; if(a.node_id!==nodeId||a.mode!==mode)throw fail(409,'REQUEST_CONFLICT','This request ID was already used for another quiz.');
        return publicAttempt(c,a);
      }
      const node=await accessibleNode(c,o,nodeId);
      if(node.status==='completed')throw fail(409,'NODE_COMPLETED','This topic is already complete.');
      await c.query("UPDATE quiz_attempt SET status='expired' WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND status='active' AND expires_at<=now()",[o.hubId,o.userId,nodeId]);
      const open=await c.query("SELECT * FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND status='active'",[o.hubId,o.userId,nodeId]);
      if(open.rows[0]) { if(open.rows[0].mode!==mode)throw fail(409,'ATTEMPT_ACTIVE','Resume the existing quiz for this topic.'); return publicAttempt(c,open.rows[0]); }
      const history=await c.query('SELECT mode FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND version=$4',[o.hubId,o.userId,nodeId,node.version]);
      if(mode==='test-out'&&history.rowCount)throw fail(409,'TEST_OUT_INELIGIBLE','Test-out is available once, before any assessment of this topic. Use a checkpoint.');
      const count=await c.query("SELECT count(*)::int AS n FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND created_at>now()-interval '24 hours'",[o.hubId,o.userId,nodeId]);
      if(count.rows[0].n>=5)throw Object.assign(fail(429,'ATTEMPT_LIMIT','Five attempts per topic are allowed in 24 hours.'),{retryAfter:86400});
      const bank=await c.query('SELECT item FROM quiz_item WHERE hub_id=$1 AND node_id=$2 AND mode=$3 ORDER BY seed_id',[o.hubId,nodeId,mode]);
      if(bank.rowCount!==(mode==='checkpoint'?5:10))throw fail(503,'QUESTION_BANK_UNAVAILABLE','The reviewed question bank is unavailable.');
      const questions=snapshotQuestions(bank.rows.map(r=>r.item));
      const {rows}=await c.query('INSERT INTO quiz_attempt(hub_id,user_id,id,request_id,node_id,domain,version,mode,questions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[o.hubId,o.userId,randomUUID(),requestId,nodeId,node.domain,node.version,mode,JSON.stringify(questions)]);
      return publicAttempt(c,rows[0]);
    }),
    get:(o:Owner,id:string)=>owned(pool,o,async c=>publicAttempt(c,await attempt(c,o,id))),
    list:(o:Owner)=>owned(pool,o,async c=>({attempts:(await c.query('SELECT id,node_id AS "nodeId",domain,mode,status,result,created_at AS "createdAt",expires_at AS "expiresAt" FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 ORDER BY created_at DESC,id LIMIT 30',[o.hubId,o.userId])).rows.map(a=>({...a,status:a.status==='active'&&+a.expiresAt<=Date.now()?'expired':a.status}))})),
    answer:(o:Owner,id:string,questionId:string,optionId:string,requestId:string)=>owned(pool,o,async c=>{
      const a=await attempt(c,o,id), old=a.answers[questionId];
      if(old) { if(old.optionId!==optionId||old.requestId!==requestId)throw fail(409,'ANSWER_CONFLICT','This question already has a saved answer.'); return publicAttempt(c,a); }
      await active(c,o,a);
      if(Object.values(a.answers).some((v:any)=>v.requestId===requestId))throw fail(409,'REQUEST_CONFLICT','Use a new request ID for each answer.');
      const q=a.questions.find((q:any)=>!a.answers[q.id]);
      if(!q||q.id!==questionId||!q.options.some((v:any)=>v.id===optionId))throw fail(400,'INVALID_ANSWER','Answer the currently issued question with one of its option IDs.');
      a.answers[questionId]={optionId,requestId};
      await c.query('UPDATE quiz_attempt SET answers=$4 WHERE hub_id=$1 AND user_id=$2 AND id=$3',[o.hubId,o.userId,id,JSON.stringify(a.answers)]);
      return publicAttempt(c,a);
    }),
    finalize:(o:Owner,id:string,principal:any)=>owned(pool,o,async c=>{
      let a=await attempt(c,o,id);
      if(a.status==='finalized')return publicAttempt(c,a);
      await active(c,o,a);
      if(a.questions.some((q:any)=>!a.answers[q.id]))throw fail(409,'ANSWERS_REQUIRED','Save an answer to every question first.');
      const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;
      if(!principal?.jti||!Number.isSafeInteger(principal.exp)||principal.exp*1000<=+now)throw fail(401,'LEARN_SESSION_REQUIRED','Reconnect Learn before finalizing.');
      const grade=gradeAttempt(a.mode,a.questions,a.answers);
      const result={...grade,finalizedAt:now.toISOString(),heuristic:'Theta is a practice estimate, not a calibrated ability score.',review:a.questions.map((q:any)=>({questionId:q.id,prompt:q.prompt,options:q.options,selectedOptionId:a.answers[q.id].optionId,correctOptionId:q.correct,explanation:q.explanation}))};
      a=(await c.query("UPDATE quiz_attempt SET status='finalized',result=$4,finalized_at=$5 WHERE hub_id=$1 AND user_id=$2 AND id=$3 RETURNING *",[o.hubId,o.userId,id,JSON.stringify(result),now])).rows[0];
      await c.query('UPDATE learner_node_state SET status=$4,theta=$5,assessed_at=$6,updated_at=$6 WHERE hub_id=$1 AND user_id=$2 AND node_id=$3',[o.hubId,o.userId,a.node_id,grade.passed?'completed':'unlocked',grade.theta,now]);
      if(grade.passed){
        await unlockDownstream(c,o,a.domain,a.version);
        const first=await c.query('INSERT INTO node_completion(hub_id,user_id,node_id,version,attempt_id,completed_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING node_id',[o.hubId,o.userId,a.node_id,a.version,id,now]);
        // Re-enrollment can re-assess skills, but cannot create another first-pass award.
        if(first.rowCount){
          const common={accessJti:principal.jti,domainVersion:'v1',nodeId:a.node_id,curriculumVersion:a.version};
          const events=[{type:'learn.quiz_completed',eventId:`learn:${id}:quiz:v1`,metadata:{...common,sourceId:id,attemptId:id,mode:a.mode,passed:true,correctCount:grade.correctCount,itemCount:grade.itemCount}},
            {type:'learn.node_mastered',eventId:`learn:${id}:mastered:v1`,metadata:{...common,sourceId:a.node_id+':'+a.version,masteryMethod:a.mode}}];
          for(const event of events){const payload={schemaVersion:1,eventId:event.eventId,userId:o.userId,hubId:o.hubId,source:'learn',type:event.type,value:1,occurredAt:now.toISOString(),metadata:event.metadata};
            await c.query('INSERT INTO learn_event(hub_id,user_id,attempt_id,event_id,payload) VALUES($1,$2,$3,$4,$5)',[o.hubId,o.userId,id,event.eventId,JSON.stringify(payload)]);}
        }
      }
      return publicAttempt(c,a);
    })
  };
}
