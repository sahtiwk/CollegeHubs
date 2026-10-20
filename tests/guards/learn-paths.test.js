const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('TP8.2 remedial attachment rejects cycles, foreign prerequisites and unsafe resources',async()=>{
 const {validateRemedialSteps}=await import('../../services/learn/src/services/remediationPlanner.ts');
 const step={id:'review-1',prerequisite:'parent',url:'https://developer.mozilla.org/en-US/docs/Web',explanation:'Reviewed concept'};
 validateRemedialSteps([step],'parent');
 for(const bad of [[{...step,prerequisite:'review-1'}],[{...step,prerequisite:'foreign'}],[{...step,url:'https://evil.test'}],[step,step],Array(4).fill(step)])assert.throws(()=>validateRemedialSteps(bad,'parent'));
});
test('TP8.2 five path journeys, failed recovery, immutable facts, concurrency, reset and receipt retry',{skip:!process.env.GUARD_LEARN_DATABASE_URL},async()=>{
 const {Pool}=require('pg'),url=new URL(process.env.GUARD_LEARN_DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));url.pathname='/postgres';
 const admin=new Pool({connectionString:url.toString()}),name='collegehubs_demo_tp82_'+randomUUID().replaceAll('-','');let pool;
 try{
 await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;pool=new Pool({connectionString:url.toString()});
 await pool.query((await import('../../services/learn/src/db/schema.ts')).schemaDDL);await(await import('../../services/learn/src/db/migrations/runner.ts')).migrate(pool,{dryRun:false});
 const app=(await import('../../services/learn/src/app.ts')).createApp({pool,config:{origin:'http://localhost',secure:false},store:{}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/health/ready')).status,200);}finally{await new Promise(r=>server.close(r));}
 const learn=(await import('../../services/learn/src/services/learnerService.ts')).learnerService(pool),quiz=(await import('../../services/learn/src/services/attemptService.ts')).attemptService(pool);
 const owner={hubId:'a'.repeat(24),userId:'b'.repeat(24)},principal={jti:randomUUID(),exp:Math.floor(Date.now()/1000)+900};
 async function answered(o,nodeId,correct=true){let a=await quiz.create(o,nodeId,'checkpoint',randomUUID());assert.equal(a.questions,undefined);assert.equal(a.question.correct,undefined);await assert.rejects(quiz.finalize(o,a.id,principal),{code:'ANSWERS_REQUIRED'});const qs=(await pool.query('SELECT questions FROM quiz_attempt WHERE id=$1',[a.id])).rows[0].questions;while(a.question){const q=qs.find(q=>q.id===a.question.id);a=await quiz.answer(o,a.id,q.id,correct?q.correct:q.options.find(x=>x.id!==q.correct).id,randomUUID());}return a;}
 let failedId,firstNode,finalId;
 for(const domain of ['dsa','web','ml','backend','devops']){
  await learn.initialize(owner,domain);const nodes=(await learn.graph(owner)).nodes.filter(n=>n.domain===domain);
  if(domain==='dsa'){
   firstNode=nodes[0].id;let bad=await answered(owner,firstNode,false);failedId=bad.id;bad=await quiz.finalize(owner,bad.id,principal);assert.equal(bad.result.passed,false);assert.equal(bad.rewards.length,0);assert.equal(bad.remediation[0].steps.length,3);
   await assert.rejects(learn.reviewRemediation({...owner,userId:'c'.repeat(24)},bad.remediation[0].id),{code:'REMEDIATION_UNAVAILABLE'});
   await learn.reviewRemediation(owner,bad.remediation[0].id);assert.equal((await learn.node(owner,firstNode)).node.status,'unlocked');
  }
  for(const n of nodes){const a=await answered(owner,n.id);const results=await Promise.all([quiz.finalize(owner,a.id,principal),quiz.finalize(owner,a.id,principal)]);assert.equal(results[0].result.passed,true);assert.deepEqual(results[0],results[1]);finalId=a.id;}
  const result=await quiz.get(owner,finalId);assert.equal(result.pathCompletion.requiredCount,3);assert.equal(result.rewards.length,3);
 }
 assert.equal((await pool.query('SELECT count(*)::int n FROM path_completion')).rows[0].n,5);
 assert.equal((await learn.stats(owner)).paths.filter(p=>p.completedCount===p.requiredCount).length,5);
 assert.equal((await quiz.get(owner,failedId)).remediation[0].resolved,true);
 await assert.rejects(pool.query('UPDATE path_completion SET version=$1',['bad']),/Immutable/);
 await assert.rejects(pool.query("UPDATE quiz_attempt SET result='{}' WHERE id=$1",[failedId]),/Immutable/);
 const eventCount=(await pool.query('SELECT count(*)::int n FROM learn_event')).rows[0].n;
 await learn.reset(owner,'dsa');await learn.initialize(owner,'dsa');for(const n of (await learn.graph(owner)).nodes.filter(n=>n.domain==='dsa')){const a=await answered(owner,n.id);await quiz.finalize(owner,a.id,principal);}
 assert.equal((await pool.query('SELECT count(*)::int n FROM learn_event')).rows[0].n,eventCount);
 const other={...owner,hubId:'d'.repeat(24)};await learn.initialize(other,'dsa');for(const n of (await learn.graph(other)).nodes){const a=await answered(other,n.id);await quiz.finalize(other,a.id,principal);}
 assert.equal((await pool.query('SELECT count(*)::int n FROM learn_event')).rows[0].n,eventCount);
 // Parallel final two assessments in a branched fixture still serialize on the owned learner.
 const parallel={...owner,userId:'e'.repeat(24)};await learn.initialize(parallel,'web');const nodes=(await learn.graph(parallel)).nodes;
 let a=await answered(parallel,nodes[0].id);await quiz.finalize(parallel,a.id,principal);
 await pool.query("UPDATE learner_node_state SET status='unlocked' WHERE hub_id=$1 AND user_id=$2 AND node_id=$3",[parallel.hubId,parallel.userId,nodes[2].id]);
 const pending=await Promise.all(nodes.slice(1).map(n=>answered(parallel,n.id)));await Promise.all(pending.map(a=>quiz.finalize(parallel,a.id,principal)));
 assert.equal((await pool.query('SELECT count(*)::int n FROM path_completion WHERE user_id=$1',[parallel.userId])).rows[0].n,1);
 // Lost response retains the same immutable event; bounded 30-point receipt settles on retry.
 const ev=(await pool.query("SELECT * FROM learn_event WHERE payload->>'type'='learn.path_completed' LIMIT 1")).rows[0];let calls=0;
 const fetcher=async()=>{if(++calls===1)throw Error('lost response');return new Response(JSON.stringify({receipt:{eventId:ev.event_id,userId:ev.user_id,hubId:ev.hub_id,awardedAura:30,reason:'awarded',dayKey:'2026-10-20'}}),{status:200});};
 const delivery=(await import('../../services/learn/src/services/coreEvents.ts')).coreEvents(pool,{core:'http://localhost',serviceKey:'fixture'},fetcher);
 await delivery.deliver(ev.event_id);assert.equal((await pool.query('SELECT status FROM learn_event WHERE event_id=$1',[ev.event_id])).rows[0].status,'pending');await pool.query('UPDATE learn_event SET next_attempt_at=now() WHERE event_id=$1',[ev.event_id]);await delivery.deliver(ev.event_id);assert.equal((await pool.query('SELECT receipt FROM learn_event WHERE event_id=$1',[ev.event_id])).rows[0].receipt.awardedAura,30);
 }finally{if(pool)await pool.end();await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();}
});
