const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
test('TP8.1 publications validate all five domains, canonical equivalence and private answer banks',async()=>{
 const p=await import('../../services/learn/src/services/plannerAgent.ts');
 assert.deepEqual(p.validateCurriculum(),{nodes:15,questions:225,version:'foundations-v1'});
 const old=p.release('demo-v1');assert.equal(p.validateCurriculum(old.curriculum,old.bank).nodes,4);
 for(const domain of ['dsa','web','ml','backend','devops'])assert.equal(p.curriculum.nodes.filter(n=>n.domain===domain&&n.required).length,3);
 assert.equal(p.canonicalId('dsa','arrays','demo-v1'),p.canonicalId('dsa','arrays','foundations-v1'));
 for(const mutate of [c=>c.nodes[0].prerequisites=['iteration'],c=>c.nodes[0].prerequisites=['html'],c=>c.nodes[0].canonicalId=c.nodes[1].canonicalId,c=>c.nodes[0].resourceUrl='https://developer.mozilla.org.evil.test/',c=>c.review.status='draft']){const c=structuredClone(p.curriculum);mutate(c);assert.throws(()=>p.validateCurriculum(c,p.bank));}
 for(const url of ['http://developer.mozilla.org/x','https://developer.mozilla.org@evil.test/x','https://developer.mozilla.org:444/x','https://docs.github.com/x?next=evil','https://developer.mozilla.org\\@evil.test/'])assert.equal(p.permittedUrl(url),false);
 for(const mutate of [b=>b.nodes[0].items.pop(),b=>b.nodes[0].items[0].correct='z',b=>b.nodes[0].items[1].id=b.nodes[0].items[0].id,b=>b.nodes[0].source='https://evil.test/']){const b=structuredClone(p.bank);mutate(b);assert.throws(()=>p.validateCurriculum(p.curriculum,b));}
});
test('TP8.1 retained v2 migration, explicit upgrade, five paths and cross-Hub reward deduplication', {skip:!process.env.GUARD_LEARN_DATABASE_URL},async()=>{
 const {Pool}=require('pg');const base=new URL(process.env.GUARD_LEARN_DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
 const name='collegehubs_demo_learn_tp81_'+randomUUID().replaceAll('-','');base.pathname='/postgres';const admin=new Pool({connectionString:base.toString()});let pool;
 try {
  await admin.query(`CREATE DATABASE "${name}"`);base.pathname='/'+name;pool=new Pool({connectionString:base.toString()});
  const {schemaDDL}=await import('../../services/learn/src/db/schema.ts');await pool.query(schemaDDL);
  const {learnerService}=await import('../../services/learn/src/services/learnerService.ts'),{attemptService}=await import('../../services/learn/src/services/attemptService.ts');
  const learn=learnerService(pool),quiz=attemptService(pool),owner={hubId:'a'.repeat(24),userId:'b'.repeat(24)},fresh={...owner,userId:'c'.repeat(24)};
  async function pass(o,nodeId){let a=await quiz.create(o,nodeId,'checkpoint',randomUUID());const snapshot=(await pool.query('SELECT questions FROM quiz_attempt WHERE id=$1',[a.id])).rows[0].questions;assert.equal(a.questions,undefined);while(a.question){const q=snapshot.find(q=>q.id===a.question.id);assert.equal(a.question.correct,undefined);a=await quiz.answer(o,a.id,q.id,q.correct,randomUUID());}return quiz.finalize(o,a.id,{jti:randomUUID(),exp:Math.floor(Date.now()/1000)+900});}
  await learn.initialize(owner,'dsa');const legacy=(await learn.graph(owner)).nodes;const result=await pass(owner,legacy[0].id);assert.equal(result.rewards.length,2);
  const before=(await pool.query('SELECT * FROM quiz_attempt WHERE id=$1',[result.id])).rows[0];const outbox=(await pool.query('SELECT event_id,payload FROM learn_event ORDER BY event_id')).rows;
  const {migrate}=await import('../../services/learn/src/db/migrations/runner.ts');assert.ok((await migrate(pool)).pending.includes('0003_versioned_curricula'));
  await migrate(pool,{dryRun:false});assert.deepEqual((await migrate(pool)).pending,[]);assert.equal((await pool.query('SELECT version FROM learn_schema')).rows[0].version,5);
  assert.deepEqual((await pool.query('SELECT * FROM quiz_attempt WHERE id=$1',[result.id])).rows[0],before);assert.deepEqual((await pool.query('SELECT event_id,payload FROM learn_event ORDER BY event_id')).rows,outbox);
  assert.equal((await learn.initialize(owner,'dsa')).version,'demo-v1');assert.equal((await learn.graph(owner)).nodes.length,2);
  assert.equal((await learn.domains(owner)).domains.find(d=>d.domain==='dsa').upgradeAvailable,true);
  await Promise.all([learn.upgrade(owner,'dsa','demo-v1','foundations-v1'),learn.upgrade(owner,'dsa','demo-v1','foundations-v1')]);
  const upgraded=(await learn.graph(owner)).nodes;assert.equal(upgraded.length,3);assert.equal(upgraded[0].status,'completed');assert.equal(upgraded[1].status,'unlocked');assert.equal(upgraded[2].status,'locked');
  assert.equal((await learn.node(owner,legacy[0].id)).node.active,false);assert.equal((await quiz.get(owner,result.id)).result.passed,true);
  await assert.rejects(quiz.create(owner,legacy[1].id,'checkpoint',randomUUID()),{code:'PATH_ARCHIVED'});
  assert.equal((await pool.query('SELECT count(*)::int n FROM learn_event')).rows[0].n,2);
  await assert.rejects(pool.query('UPDATE node_completion SET version=$1',['bad']),/Immutable/);
  await assert.rejects(pool.query('UPDATE node_award_claim SET user_id=$1',['bad']),/Immutable/);
  for(const domain of ['dsa','web','ml','backend','devops'])await learn.initialize(fresh,domain);
  const graph=await learn.graph(fresh);assert.equal(graph.nodes.length,15);assert.equal(graph.nodes.filter(n=>n.status==='unlocked').length,5);
  assert.equal((await learn.stats(fresh)).totalTopics,15);
  for(const node of graph.nodes.filter(n=>n.status==='locked'))await assert.rejects(learn.node(fresh,node.id),{code:'NODE_LOCKED'});
  for(const node of graph.nodes.filter(n=>n.status==='unlocked')){await assert.rejects(learn.node({...fresh,hubId:'d'.repeat(24)},node.id),{code:'NODE_NOT_FOUND'});const r=await pass(fresh,node.id);assert.equal(r.rewards.length,2);}
  const copied={...owner,hubId:'d'.repeat(24)};await learn.initialize(copied,'dsa');const duplicate=await pass(copied,(await learn.graph(copied)).nodes[0].id);assert.equal(duplicate.rewards.length,0);
  const event=(await pool.query("SELECT payload FROM learn_event WHERE user_id=$1 AND payload->'metadata'->>'curriculumVersion'='foundations-v1' LIMIT 1",[fresh.userId])).rows[0].payload;assert.match(event.metadata.nodeId,/^[a-f0-9-]{36}$/);assert.ok(!graph.nodes.some(n=>n.id===event.metadata.nodeId));
  const content=(await pool.query('SELECT * FROM content_item LIMIT 1')).rows[0];
  await assert.rejects(pool.query("UPDATE content_item SET url='https://developer.mozilla.org.evil.test/x' WHERE id=$1",[content.id]),/check constraint/);
  await assert.rejects(pool.query("INSERT INTO learning_path VALUES($1,'foreign','v1')",[owner.hubId]),/foreign key/);
 }finally{if(pool)await pool.end();await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();}
});
