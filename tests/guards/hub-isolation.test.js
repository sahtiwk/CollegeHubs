const test = require('node:test');
const assert = require('node:assert/strict');

test('G1: P9.2 private SQL attempts, thresholds, locks, reset retention and resource cache isolation', {skip:!process.env.GUARD_LEARN_DATABASE_URL}, async()=>{
  const {Pool}=require('pg'),{randomUUID,randomBytes}=require('node:crypto');
  const url=new URL(process.env.GUARD_LEARN_DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.match(url.pathname,/^\/collegehubs_demo_learn_/);
  const pool=new Pool({connectionString:url.toString(),max:10});
  const {learnerService}=await import('../../services/learn/src/services/learnerService.ts'),{attemptService}=await import('../../services/learn/src/services/attemptService.ts'),{resourceLookup}=await import('../../services/learn/src/services/roadmapAdapter.ts');
  const learning=learnerService(pool),quizzes=attemptService(pool),id=()=>randomBytes(12).toString('hex');
  const a={hubId:id(),userId:id()},peer={hubId:a.hubId,userId:id()},b={hubId:id(),userId:id()},principal={jti:randomUUID(),exp:Math.floor(Date.now()/1000)+900};
  async function saved(o,attempt){return (await pool.query('SELECT * FROM quiz_attempt WHERE hub_id=$1 AND user_id=$2 AND id=$3',[o.hubId,o.userId,attempt.id])).rows[0];}
  async function solve(o,dto,correct){let index=dto.answeredCount;while(dto.question){const snap=await saved(o,dto);const q=snap.questions.find(q=>q.id===dto.question.id);const option=index<correct?q.correct:q.options.find(v=>v.id!==q.correct).id;dto=await quizzes.answer(o,dto.id,q.id,option,randomUUID());index++;}return quizzes.finalize(o,dto.id,principal);}
  const privateKeys=/"(?:correct|correctOptionId|explanation|seedId|accessJti|answers)":/;
  try{
    await Promise.all([learning.initialize(a,'dsa'),learning.initialize(a,'web'),learning.initialize(peer,'dsa'),learning.initialize(b,'dsa')]);
    const graph=await learning.graph(a),root=graph.nodes.find(n=>n.domain==='dsa'&&n.status==='unlocked'),locked=graph.nodes.find(n=>n.domain==='dsa'&&n.status==='locked'),web=graph.nodes.find(n=>n.domain==='web'&&n.status==='unlocked');
    await assert.rejects(quizzes.create(a,locked.id,'checkpoint',randomUUID()),{status:403});
    await assert.rejects(quizzes.create(b,root.id,'checkpoint',randomUUID()),{status:404});
    const request=randomUUID(),created=await Promise.all(Array.from({length:8},()=>quizzes.create(a,root.id,'checkpoint',request)));let first=created[0];assert.equal(new Set(created.map(a=>a.id)).size,1);assert.doesNotMatch(JSON.stringify(first),privateKeys);
    await assert.rejects(quizzes.create(a,web.id,'checkpoint',request),{status:409});
    await assert.rejects(quizzes.get(peer,first.id),{status:404});await assert.rejects(quizzes.get(b,first.id),{status:404});
    await assert.rejects(quizzes.finalize(a,first.id,principal),{status:409});
    await assert.rejects(quizzes.answer(a,first.id,randomUUID(),randomUUID(),randomUUID()),{status:400});
    const initial=await saved(a,first),q=initial.questions[0],answerRequest=randomUUID();
    const repeats=await Promise.all(Array.from({length:5},()=>quizzes.answer(a,first.id,q.id,q.correct,answerRequest)));assert.ok(repeats.every(a=>a.answeredCount===1));assert.doesNotMatch(JSON.stringify(repeats[0]),privateKeys);
    await assert.rejects(quizzes.answer(a,first.id,q.id,q.options.find(v=>v.id!==q.correct).id,answerRequest),{status:409});
    await assert.rejects(quizzes.answer(a,first.id,repeats[0].question.id,repeats[0].question.options[0].id,answerRequest),{status:409});
    first=await solve(a,repeats[0],2);assert.equal(first.result.passed,false);assert.equal(first.result.correctCount,2);assert.equal(first.rewards.length,0);assert.equal((await learning.graph(a)).nodes.find(n=>n.id===locked.id).status,'locked');
    await assert.rejects(quizzes.create(a,root.id,'test-out',randomUUID()),{status:409});
    const next=await quizzes.create(a,root.id,'checkpoint',randomUUID());let dto=next;while(dto.question){const snap=await saved(a,dto),q=snap.questions.find(q=>q.id===dto.question.id);dto=await quizzes.answer(a,dto.id,q.id,dto.answeredCount<3?q.correct:q.options.find(v=>v.id!==q.correct).id,randomUUID());}
    const finals=await Promise.all(Array.from({length:6},()=>quizzes.finalize(a,next.id,principal)));assert.ok(finals.every(r=>r.result.passed));assert.ok(finals.every(r=>r.rewards.length===2));assert.deepEqual(finals[0],finals[5]);
    assert.equal((await learning.graph(a)).nodes.find(n=>n.id===locked.id).status,'unlocked');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM node_completion WHERE hub_id=$1 AND user_id=$2',[a.hubId,a.userId])).rows[0].n,1);
    await assert.rejects(pool.query("UPDATE quiz_attempt SET result='{}' WHERE hub_id=$1 AND user_id=$2 AND id=$3",[a.hubId,a.userId,next.id]),/Immutable/);
    await assert.rejects(pool.query('DELETE FROM node_completion WHERE hub_id=$1 AND user_id=$2',[a.hubId,a.userId]),/Immutable/);
    await assert.rejects(pool.query('INSERT INTO node_completion(hub_id,user_id,node_id,version,attempt_id,completed_at) VALUES($1,$2,$3,$4,$5,now())',[a.hubId,a.userId,root.id,'foreign-version',next.id]),{code:'23503'});
    const testOut=await solve(a,await quizzes.create(a,locked.id,'test-out',randomUUID()),7);assert.equal(testOut.result.passed,false);assert.equal(testOut.result.threshold,.8);assert.equal(testOut.rewards.length,0);
    await assert.rejects(quizzes.create(a,locked.id,'test-out',randomUUID()),{status:409});
    const webPass=await solve(a,await quizzes.create(a,web.id,'test-out',randomUUID()),8);assert.equal(webPass.result.passed,true);assert.equal(webPass.rewards.length,2);
    assert.equal((await learning.graph(a)).nodes.find(n=>n.domain==='web'&&n.id!==web.id).status,'unlocked');
    const active=await quizzes.create(a,locked.id,'checkpoint',randomUUID());const before=(await pool.query('SELECT payload FROM learn_event WHERE hub_id=$1 AND user_id=$2 ORDER BY event_id',[a.hubId,a.userId])).rows;
    await learning.reset(a,'dsa');assert.equal((await quizzes.get(a,active.id)).status,'cancelled');await assert.rejects(quizzes.finalize(a,active.id,principal),{status:409});
    assert.deepEqual((await quizzes.finalize(a,next.id,principal)).result,finals[0].result);
    await learning.initialize(a,'dsa');const again=await solve(a,await quizzes.create(a,root.id,'checkpoint',randomUUID()),5);assert.equal(again.result.passed,true);assert.equal(again.rewards.length,0);
    assert.deepEqual((await pool.query('SELECT payload FROM learn_event WHERE hub_id=$1 AND user_id=$2 ORDER BY event_id',[a.hubId,a.userId])).rows,before);
    await assert.rejects(quizzes.create(a,locked.id,'test-out',randomUUID()),{status:409});
    let calls=0;const lookup=resourceLookup(pool,{enabled:true,fetcher:async()=>{calls++;return new Response(JSON.stringify(['Arrays',['Array data structure'],[''],['https://en.wikipedia.org/wiki/Array_data_structure']]));}});
    await assert.rejects(lookup(b,root.id),{status:404});assert.equal(calls,0);
    const live=await lookup(a,root.id);assert.equal(live.source,'live');assert.equal(calls,1);assert.equal((await lookup(a,root.id)).source,'cache');assert.equal(calls,1);
    await pool.query("UPDATE resource_cache SET fetched_at=now()-interval '2 days',retry_at=to_timestamp(0) WHERE hub_id=$1 AND node_id=$2",[a.hubId,root.id]);
    const timeout=resourceLookup(pool,{enabled:true,fetcher:async()=>{throw Error('provider timeout');}});const stale=await timeout(a,root.id);assert.equal(stale.source,'cache');assert.equal(stale.stale,true);assert.equal(stale.items[0].url,live.items[0].url);
    await assert.rejects(timeout(b,root.id),{status:404});const fallback=await timeout(a,web.id);assert.equal(fallback.source,'seed');assert.ok(fallback.items.length);
    assert.equal((await resourceLookup(pool,{enabled:false})(a,root.id)).source,'seed');
  }finally{await pool.end();}
});

test('G1: P9.1 SQL enrollment races, scoped FKs, locked resources, preferences and reset', { skip: !process.env.GUARD_LEARN_DATABASE_URL }, async () => {
  const { Pool } = require('pg'), crypto = require('node:crypto');
  const { createApp } = await import('../../services/learn/src/app.ts');
  const { createSessionStore } = require('../../services/learn/src/auth/sessionBoundary.cjs');
  const url = new URL(process.env.GUARD_LEARN_DATABASE_URL);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname)); assert.match(url.pathname, /^\/collegehubs_demo_learn_/);
  const pool = new Pool({ connectionString: url.toString(), max: 8 });
  let resourceReads = 0;
  const observed = { query: pool.query.bind(pool), connect: async () => {
    const client = await pool.connect();
    return { query: (sql, values) => { if (/FROM content_item/i.test(sql)) resourceReads++; return client.query(sql, values); }, release: () => client.release() };
  } };
  const origin = 'http://localhost:5173', store = createSessionStore(pool, { origin });
  const server = createApp({ config: { origin, secure: false }, pool: observed, store }).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  const hubA = crypto.randomBytes(12).toString('hex'), hubB = crypto.randomBytes(12).toString('hex');
  async function owner(hubId) {
    const userId = crypto.randomBytes(12).toString('hex'), handle = crypto.randomBytes(32).toString('base64url'), csrf = digest('csrf:' + handle), exp = Math.floor(Date.now()/1000)+900;
    await pool.query('INSERT INTO module_session(session_hash,user_id,hub_id,principal,theme,csrf_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)', [digest(handle),userId,hubId,{ sub:userId,hubId,exp },{},digest(csrf),new Date(exp*1000)]);
    return { userId,hubId,handle,csrf };
  }
  const a = await owner(hubA), peer = await owner(hubA), b = await owner(hubB);
  async function call(o, path, method='GET', body, expected=200, headers={}) {
    const r = await fetch(base+'/api/learn'+path, { method, headers: { Origin:origin, Cookie:'ch_learn_session='+o.handle, 'X-CSRF-Token':o.csrf, ...(body ? {'Content-Type':'application/json'} : {}), ...headers }, ...(body ? {body:JSON.stringify(body)} : {}) });
    const dto = await r.json(); assert.equal(r.status,expected,path+': '+JSON.stringify(dto)); return dto;
  }
  try {
    assert.equal((await call(a,'/dashboard/graph')).nodes.length,0);
    await call(a,'/learner/intake','POST',{domain:'dsa',selfRating:'advanced'},404);
    await call(a,'/learner/init-graph','POST',{domain:'dsa'},403,{'X-CSRF-Token':'forged'});
    await call(a,'/learner/init-graph','POST',{domain:'dsa'},403,{Origin:'https://foreign.example'});
    await call(a,'/onboarding','POST',{domain:'dsa',selfRating:'new',goal:'x',dailyMinutes:20,hubId:hubB},400);
    await call(a,'/onboarding','POST',{domain:'machine-learning',selfRating:'new',goal:'x',dailyMinutes:20},400);
    await Promise.all(Array.from({length:8}, () => call(a,'/learner/init-graph','POST',{domain:'dsa'})));
    let graph = await call(a,'/dashboard/graph'); assert.equal(graph.nodes.length,2); assert.equal(graph.links.length,1);
    assert.equal(graph.userId,a.userId); assert.equal(graph.hubId,hubA);
    const root = graph.nodes.find(n=>n.status==='unlocked'), locked = graph.nodes.find(n=>n.status==='locked');
    assert.ok(root && locked); assert.equal(graph.nodes.some(n=>'resources' in n || 'theta' in n),false);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM learner_node_state WHERE hub_id=$1 AND user_id=$2',[hubA,a.userId])).rows[0].n,2);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM learner WHERE hub_id=$1 AND user_id=$2',[hubA,a.userId])).rows[0].n,1);
    const startReads = resourceReads;
    await call(peer,'/nodes/'+root.id,'GET',undefined,404);
    await call(b,'/nodes/'+root.id,'GET',undefined,404);
    await call(a,'/nodes/'+locked.id,'GET',undefined,403);
    await call(a,'/recommendation','POST',{nodeId:locked.id},403);
    await call(a,'/tutor/fast','POST',{nodeId:locked.id,contentId:crypto.randomUUID()},403);
    await call(b,'/recommendation','POST',{nodeId:root.id},404);
    assert.equal(resourceReads,startReads,'denied access must precede resource reads');
    const content = await call(a,'/nodes/'+root.id); assert.equal(content.source,'seed'); assert.equal(content.resources.length,1);
    const assessmentBody={nodeId:root.id,mode:'checkpoint',requestId:crypto.randomUUID()};
    await call(a,'/quiz/attempts','POST',assessmentBody,403,{'X-CSRF-Token':'forged'});
    await call(a,'/quiz/attempts','POST',{...assessmentBody,earnedPoints:999},400);
    await call(a,'/quiz/attempts','POST',{...assessmentBody,nodeId:locked.id},403);
    const assessment=await call(a,'/quiz/attempts','POST',assessmentBody);
    assert.doesNotMatch(JSON.stringify(assessment),/"(?:correct|correctOptionId|explanation|seedId|answers)":/);
    await call(peer,'/quiz/attempts/'+assessment.id,'GET',undefined,404);
    await call(b,'/quiz/next','POST',{attemptId:assessment.id},404);
    await call(a,'/quiz/answer','POST',{attemptId:assessment.id,questionId:assessment.question.id,optionId:assessment.question.options[0].id,requestId:crypto.randomUUID(),newTheta:3},400);
    await call(a,'/quiz/finalize','POST',{attemptId:assessment.id,total:100},400);
    await call(a,'/quiz/finalize','POST',{attemptId:assessment.id},409);
    await call(a,'/resources','POST',{nodeId:locked.id},403);
    await call(b,'/resources','POST',{nodeId:root.id},404);
    const rec = await call(a,'/recommendation','POST',{nodeId:root.id}); assert.equal(rec.recommendedItem.id,content.resources[0].id);
    const guide = await call(a,'/tutor/fast','POST',{nodeId:root.id,contentId:content.resources[0].id}); assert.equal(guide.source,'template');
    await call(a,'/tutor/fast','POST',{nodeId:root.id,contentId:crypto.randomUUID()},404);
    await call(a,'/nodes/not-a-uuid','GET',undefined,400);
    await call(a,'/dashboard/graph?hubId='+hubB,'GET',undefined,400);
    await call(a,'/profile/preferences','PUT',{goal:'<script>literal goal</script>',dailyMinutes:30});
    assert.equal((await call(a,'/profile/preferences')).goal,'<script>literal goal</script>');
    assert.equal((await call(peer,'/profile/preferences')).goal,'');
    await call(a,'/profile/preferences','PUT',{goal:'x'.repeat(241),dailyMinutes:20},400);
    await call(a,'/profile/preferences','PUT',{goal:'x',dailyMinutes:21},400);
    await call(a,'/learner/intake','POST',{domain:'dsa',selfRating:'advanced'});
    await call(a,'/learner/intake','POST',{domain:'dsa',selfRating:'advanced',theta:3,status:'completed'},400);
    graph = await call(a,'/dashboard/graph'); assert.equal(graph.nodes.find(n=>n.id===locked.id).status,'locked');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM learner_node_state WHERE hub_id=$1 AND user_id=$2 AND theta IS NOT NULL',[hubA,a.userId])).rows[0].n,0);
    assert.deepEqual((await call(a,'/dashboard/milestones')).milestones,[]);
    assert.equal((await call(a,'/dashboard/stats')).availableTopics,1);
    await call(peer,'/learner/init-graph','POST',{domain:'dsa'});
    await call(b,'/learner/init-graph','POST',{domain:'dsa'});
    const bg = await call(b,'/dashboard/graph'); assert.ok(bg.nodes.every(n=>!graph.nodes.some(x=>x.id===n.id)));
    await call(a,'/tutor/fast','POST',{nodeId:root.id,contentId:(await call(b,'/nodes/'+bg.nodes.find(n=>n.status==='unlocked').id)).resources[0].id},404);
    const fk = await pool.query('SELECT id FROM skill_node WHERE hub_id=$1 LIMIT 1',[hubB]);
    await assert.rejects(pool.query('INSERT INTO learner_node_state(hub_id,user_id,domain,version,node_id,status) VALUES($1,$2,$3,$4,$5,$6)',[hubA,a.userId,'dsa','demo-v1',fk.rows[0].id,'unlocked']),{code:'23503'});
    await assert.rejects(pool.query('UPDATE content_item SET node_id=$1 WHERE hub_id=$2',[fk.rows[0].id,hubA]),{code:'23503'});
    await assert.rejects(pool.query('UPDATE learner_node_state SET theta=4,assessed_at=now() WHERE hub_id=$1 AND user_id=$2',[hubA,a.userId]),{code:'23514'});
    for(const p of ['/maintenance','/generate-dag','/process-llm','/ingest','/quiz-generate','/tutor/slow','/profile','/dashboard/leaderboard']) {
      await call(a,p,'GET',undefined,404); await call(a,p,'POST',{},404);
    }
    // Future assessed state simulates a reset/re-init without making a public grading API.
    await pool.query("UPDATE learner_node_state SET status='completed',theta=1,assessed_at=now() WHERE hub_id=$1 AND user_id=$2 AND node_id=$3",[hubA,a.userId,root.id]);
    await call(a,'/learner/init-graph','POST',{domain:'dsa'});
    assert.equal((await call(a,'/dashboard/graph')).nodes.find(n=>n.id===root.id).status,'completed','init cannot overwrite progress');
    assert.equal((await call(a,'/dashboard/milestones')).milestones[0].nodeId,root.id);
    assert.deepEqual((await call(peer,'/dashboard/milestones')).milestones,[]);
    assert.deepEqual((await call(b,'/dashboard/milestones')).milestones,[]);
    const reset = await call(a,'/profile/path','DELETE',{domain:'dsa'}); assert.equal(reset.rewardHistoryPreserved,true);
    assert.equal((await call(a,'/dashboard/graph')).nodes.length,0);
    assert.deepEqual((await call(a,'/dashboard/milestones')).milestones,[]);
    await call(a,'/nodes/'+root.id,'GET',undefined,404);
    assert.equal((await call(peer,'/dashboard/graph')).nodes.length,2);
    assert.equal((await call(b,'/dashboard/graph')).nodes.length,2);
    await call(a,'/profile/path','DELETE',{domain:'dsa'});
    await call(a,'/onboarding','POST',{domain:'dsa',selfRating:'advanced',goal:'Resume fundamentals',dailyMinutes:20});
    const resetGraph = await call(a,'/dashboard/graph'); assert.equal(resetGraph.nodes.length,2); assert.equal(resetGraph.nodes.find(n=>n.id===root.id).status,'unlocked');
    assert.equal(resetGraph.nodes.find(n=>n.id===locked.id).status,'locked');
    await call(a,'/onboarding','POST',{domain:'web',selfRating:'new',goal:'Build a page',dailyMinutes:20});
    assert.equal((await call(a,'/dashboard/graph')).nodes.length,4);
    await pool.query("UPDATE module_session SET expires_at=now()-interval '1 second' WHERE session_hash=$1",[digest(a.handle)]);
    await call(a,'/dashboard/graph','GET',undefined,401);
    await call(a,'/profile/path','DELETE',{domain:'dsa'},401);
  } finally { await new Promise(r=>server.close(r)); await pool.end(); }
});

test('G1: text-only PDF parsing rejects unsafe inputs and terminates bounded workers', async()=>{
  const {inspectFile,parsePdf}=require('../../services/interview/src/services/fileStorage');
  const {pdfFixture}=require('../../scripts/pdf-fixture.cjs');
  const bytes=pdfFixture();const file={buffer:bytes,size:bytes.length,mimetype:'application/pdf',originalname:'synthetic.pdf'};
  assert.equal(inspectFile(file).originalName,'synthetic.pdf');
  for(const changed of [{mimetype:'application/msword'},{originalname:'resume.doc'},{buffer:Buffer.from('not a PDF'),size:9},{size:5*1024*1024+1}])assert.throws(()=>inspectFile({...file,...changed}));
  const result=await parsePdf(bytes);assert.match(result.text,/SYNTHETIC RESUME/);assert.equal(result.pageCount,1);assert.equal(result.truncated,false);
  await assert.rejects(parsePdf(pdfFixture('',{})),{code:'PDF_EMPTY'});
  await assert.rejects(parsePdf(pdfFixture('Encrypted fixture',{encrypted:true})),{code:'PDF_ENCRYPTED'});
  await assert.rejects(parsePdf(Buffer.from('%PDF-1.4\nbroken\n%%EOF')),{code:'PDF_INVALID'});
  await assert.rejects(parsePdf(pdfFixture('Too many pages',{pages:21})),{code:'PDF_PAGE_LIMIT'});
  const long=await parsePdf(pdfFixture('x'.repeat(10000)));assert.equal(long.text.length,8000);assert.equal(long.truncated,true);
  await assert.rejects(parsePdf(bytes,{timeoutMs:100,workerPath:require('node:path').resolve(__dirname,'../../scripts/pdf-timeout-fixture.cjs')}),{code:'PDF_PARSE_TIMEOUT'});
  const abort=new AbortController();abort.abort();await assert.rejects(parsePdf(bytes,{signal:abort.signal}),{code:'UPLOAD_CANCELLED'});
  const activeAbort=new AbortController();const pending=parsePdf(bytes,{workerPath:require('node:path').resolve(__dirname,'../../scripts/pdf-timeout-fixture.cjs'),signal:activeAbort.signal});activeAbort.abort();await assert.rejects(pending,{code:'UPLOAD_CANCELLED'});
});

test('G1: study rooms hide foreign rooms, problems and participant work over HTTP', async () => {
  assert.ok(process.env.GUARD_APP_ORIGIN, 'Requires disposable integration fixture');
  const base = process.env.GUARD_APP_ORIGIN;
  async function call(path, token, body) {
    const response = await fetch(base + '/api' + path, { method: body ? 'POST' : 'GET', headers: { Origin: base, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  const login = async email => { const r = await call('/auth/login', null, { email, password: 'Preview-only-32!' }); assert.equal(r.status, 200); return r.data; };
  const a = await login('preview@cvr.ac.in'), b = await login('preview@sky.example.test'), peer = await login('peer@cvr.ac.in');
  assert.equal((await call('/me/aura')).status, 401);
  assert.equal((await call('/me/aura?userId=' + b.user._id, a.token)).status, 400);
  assert.equal((await call('/me/progress?hubId=' + b.user.hubId, a.token)).status, 400);
  assert.equal((await call('/hubs/' + b.user.hubId + '/leaderboard', a.token)).status, 403);
  const aura = await call('/me/aura', a.token); assert.equal(aura.status, 200);
  assert.equal(aura.data.userId, a.user._id); assert.equal(aura.data.hubId, a.user.hubId);
  assert.ok(aura.data.recent.every(row => !('metadata' in row) && !('userId' in row)));
  const homeChannels = (await call('/hubs/' + a.user.hubId + '/channels', a.token)).data.items;
  const dsa = homeChannels.find(c => c.slug === 'dsa')._id;
  const ownCalendar = '/hubs/' + a.user.hubId + '/calendar?channelId=' + dsa;
  assert.equal((await call(ownCalendar)).status, 401);
  const calendar = await call(ownCalendar, a.token); assert.equal(calendar.status, 200); assert.ok(calendar.data.items.some(row => row.provenance === 'seeded_fixture'));
  assert.equal((await call(ownCalendar, b.token)).status, 403);
  assert.equal((await call('/hubs/' + b.user.hubId + '/calendar?channelId=' + dsa, b.token)).status, 404);
  assert.equal((await call(ownCalendar + '&userId=' + b.user._id, a.token)).status, 400);
  assert.equal((await call('/contests')).status, 401);
  assert.equal((await call('/contests?url=https://example.test', a.token)).status, 400);
  const channelId = (await call('/hubs/' + a.user.hubId + '/channels', a.token)).data.items[0]._id;
  const problems = await call('/study-rooms/problems', a.token);
  assert.equal(problems.status, 200);
  const input = { channelId, problemId: problems.data.items[0]._id, durationMinutes: 5, clientRoomId: require('node:crypto').randomUUID() };
  assert.equal((await call('/study-rooms', b.token, input)).status, 404);
  const foreignChannel = (await call('/hubs/' + b.user.hubId + '/channels', b.token)).data.items[0]._id;
  assert.equal((await call('/study-rooms', b.token, { ...input, channelId: foreignChannel })).status, 404);
  assert.equal((await call('/study-rooms', a.token, { ...input, hubId: b.user.hubId })).status, 400);
  const created = await call('/study-rooms', a.token, input); assert.equal(created.status, 201);
  const path = '/study-rooms/' + created.data.room._id;
  for (const suffix of ['', '/submissions', '/reviews']) assert.equal((await call(path + suffix, b.token)).status, 404);
  for (const suffix of ['/join', '/start', '/draft', '/submit']) assert.equal((await call(path + suffix, b.token, suffix === '/draft' ? { expectedRevision: 0, revision: 1, source: 'foreign', language: 'python' } : suffix === '/submit' ? { draftRevision: 0 } : {})).status, 404);
  assert.equal((await call(path, peer.token)).status, 404);
  assert.equal((await call(path + '/join', peer.token, {})).status, 200);
  assert.equal((await call(path + '/start', peer.token, {})).status, 403);
  assert.equal((await call(path + '/start', a.token, {})).status, 200);
  const source = 'private-peer-source-' + require('node:crypto').randomUUID();
  assert.equal((await call(path + '/draft', peer.token, { expectedRevision: 0, revision: 1, source, language: 'python' })).status, 200);
  assert.ok(!JSON.stringify((await call(path, a.token)).data).includes(source));
  assert.equal((await call(path + '/submissions', a.token)).status, 409);
  assert.equal((await call(path + '/reviews', b.token, { solutionId: created.data.ownSolution._id, body: 'foreign review' })).status, 404);
  assert.equal((await call(path + '/reviews', peer.token, { solutionId: created.data.ownSolution._id, body: 'premature review' })).status, 409);
});

test('G1: typed message contract enforces UTF-8 limits and safe resource schemes', () => {
  const { normalizeMessage, resourceUrl } = require('../../packages/contracts/channel.cjs');
  const base = { clientMessageId: require('node:crypto').randomUUID(), type: 'code', language: 'javascript', text: '  <script>literal</script>\n' };
  assert.equal(normalizeMessage(base).text, base.text);
  assert.equal(normalizeMessage({ ...base, text: 'x'.repeat(32768) }).text.length, 32768);
  assert.throws(() => normalizeMessage({ ...base, text: 'x'.repeat(32769) }), { status: 413 });
  assert.throws(() => normalizeMessage({ ...base, text: '\u00e9'.repeat(16385) }), { status: 413 });
  assert.throws(() => normalizeMessage({ ...base, hubId: 'caller-selected' }), { status: 400 });
  for (const url of ['http://example.test', 'javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.test', 'https://example.test/\npath']) assert.throws(() => resourceUrl(url), { status: 400 });
  assert.equal(resourceUrl('https://example.test/docs?q=one#section'), 'https://example.test/docs?q=one#section');
});

test('G1: P4.2 typed content stays literal; threads enforce owner, Hub and immutable acceptance', async () => {
  assert.ok(process.env.GUARD_APP_ORIGIN, 'Requires disposable integration fixture');
  const base = process.env.GUARD_APP_ORIGIN;
  async function call(path, token, body) {
    const response = await fetch(base + '/api' + path, { method: body ? 'POST' : 'GET', headers: { Origin: base, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  const login = async email => { const reply = await call('/auth/login', null, { email, password: 'Preview-only-32!' }); assert.equal(reply.status, 200, 'Fixture login must succeed'); return reply.data; };
  const a = await login('preview@cvr.ac.in'), b = await login('preview@sky.example.test');
  const channel = (await call('/hubs/' + a.user.hubId + '/channels', a.token)).data.items.find(row => row.slug === 'dsa')._id;
  const path = '/channels/' + channel + '/messages';
  const send = (user, body) => call(path, user.token, { clientMessageId: require('node:crypto').randomUUID(), ...body });
  const literal = '<script>alert("literal-[a-z]+")</script>\n  const value = "<&>";';
  const code = await send(a, { type: 'code', text: literal, language: 'javascript' });
  assert.equal(code.status, 201, JSON.stringify(code)); assert.equal(code.data.message.text, literal);
  const peer = await login('peer@cvr.ac.in'); assert.ok(peer.token);
  assert.equal((await send(a, { type: 'code', text: literal, language: 'executable' })).status, 400);
  assert.equal((await send(a, { type: 'resource', text: 'Read this', title: 'Unsafe', url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await send(a, { type: 'resource', text: '', title: 'Unsafe', url: 'https://name:secret@example.test/' })).status, 400);
  const resource = await send(a, { type: 'resource', text: '', title: 'Documentation', url: 'https://example.test/docs' }); assert.equal(resource.status, 201);
  const found = await call(path + '?q=' + encodeURIComponent('literal-[a-z]+'), a.token);
  assert.equal(found.status, 200); assert.ok(found.data.items.some(row => row._id === code.data.message._id));
  assert.equal((await call(path + '?q=' + 'x'.repeat(121), a.token)).status, 400);
  const foreignSearch = await call(path + '?q=literal', b.token);
  assert.equal(foreignSearch.status, 404, JSON.stringify(foreignSearch.data));
  const question = (await send(a, { type: 'question', text: 'How does binary search terminate?' })).data.message;
  const otherQuestion = (await send(a, { type: 'question', text: 'Another question' })).data.message;
  const self = (await send(a, { type: 'answer', text: 'Self reply', questionId: question._id })).data.message;
  const answer = (await send(peer, { type: 'answer', text: 'The search interval shrinks each iteration.', questionId: question._id })).data.message;
  const wrong = (await send(peer, { type: 'answer', text: 'Other thread', questionId: otherQuestion._id })).data.message;
  const acceptPath = '/messages/' + question._id + '/accepted-answer';
  assert.equal((await call(acceptPath, a.token, { answerId: self._id })).status, 403);
  assert.equal((await call(acceptPath, peer.token, { answerId: answer._id })).status, 403);
  assert.equal((await call(acceptPath, b.token, { answerId: answer._id })).status, 404);
  assert.equal((await call(acceptPath, a.token, { answerId: wrong._id })).status, 404);
  const accepts = await Promise.all([call(acceptPath, a.token, { answerId: answer._id }), call(acceptPath, a.token, { answerId: answer._id })]);
  assert.ok(accepts.every(reply => reply.status === 200));
  const another = (await send(peer, { type: 'answer', text: 'Another valid reply', questionId: question._id })).data.message;
  assert.equal((await call(acceptPath, a.token, { answerId: another._id })).status, 409);
  const thread = await call('/messages/' + question._id + '/thread', a.token);
  assert.equal(thread.data.question.acceptedAnswerId, answer._id);
  assert.ok(thread.data.items.some(row => row._id === answer._id));
  assert.equal((await call('/messages/' + question._id + '/thread', b.token)).status, 404);
  const raceQuestion = (await send(a, { type: 'question', text: 'Race question' })).data.message;
  const raceA = (await send(peer, { type: 'answer', text: 'First option', questionId: raceQuestion._id })).data.message;
  const raceB = (await send(peer, { type: 'answer', text: 'Second option', questionId: raceQuestion._id })).data.message;
  const competing = await Promise.all([raceA, raceB].map(answer => call('/messages/' + raceQuestion._id + '/accepted-answer', a.token, { answerId: answer._id })));
  assert.deepEqual(competing.map(reply => reply.status).sort(), [200, 409]);
});

test('G1: channel recovery deduplicates persisted pages and rejects gaps or foreign cache data', async () => {
  const { mergeHistory } = await import('../../apps/web/src/realtime/history.js');
  const row = seq => ({ _id: 'message-' + seq, seq, hubId: 'hub-a', channelId: 'channel-a' });
  const page = items => ({ hubId: 'hub-a', channelId: 'channel-a', items });
  const first = mergeHistory([], page([row(20), row(21)]), 'hub-a', 'channel-a', null);
  const next = mergeHistory(first.items, page([row(21), row(22)]), 'hub-a', 'channel-a', first.cursor);
  assert.deepEqual(next.items.map(item => item.seq), [20, 21, 22]);
  assert.equal(next.cursor, 22);
  assert.throws(() => mergeHistory(next.items, page([row(24)]), 'hub-a', 'channel-a', 22));
  assert.throws(() => mergeHistory([], page([row(1)]), 'hub-b', 'channel-a', null));
  assert.throws(() => mergeHistory(next.items, page([{ ...row(22), _id: 'forged' }]), 'hub-a', 'channel-a', 22));
});

test('G1: real sockets deny foreign rooms, invalid origins and expired/revoked membership', async () => {
  const base = process.env.GUARD_APP_ORIGIN;
  assert.ok(base, 'Requires disposable integration fixture');
  const { io } = require('socket.io-client');
  const origin = 'http://localhost:5183';
  const sockets = [];
  async function connect(token, browserOrigin = base, denied = false) {
    const socket = io(origin + '/core', { auth: { token }, extraHeaders: { Origin: browserOrigin }, reconnection: false, timeout: 3000, forceNew: true });
    sockets.push(socket);
    await new Promise((resolve, reject) => {
      socket.once('connect', () => denied ? reject(new Error('Connection should be rejected')) : resolve());
      socket.once('connect_error', error => denied ? resolve() : reject(error));
    });
    return socket;
  }
  const ack = (socket, event, input) => new Promise((resolve, reject) => socket.timeout(4000).emit(event, input, (error, value) => error ? reject(error) : resolve(value)));
  async function account(email) {
    const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email, password: 'Preview-only-32!' }) });
    assert.equal(response.status, 200); return response.json();
  }
  async function channels(account) { return (await (await fetch(base + '/api/hubs/' + account.user.hubId + '/channels', { headers: { Authorization: 'Bearer ' + account.token } })).json()).items; }
  try {
    const a = await account('preview@cvr.ac.in'), b = await account('preview@sky.example.test');
    const channelId = (await channels(a))[0]._id, foreign = (await channels(b))[0]._id;
    await connect(a.token, 'https://foreign.invalid', true);
    await connect('invalid', base, true);
    const first = await connect(a.token), second = await connect(a.token), other = await connect(b.token);
    assert.equal((await ack(other, 'channel:join', { channelId })).error.code, 'CHANNEL_NOT_FOUND');
    assert.equal((await ack(other, 'channel:sync', { channelId })).error.code, 'CHANNEL_NOT_FOUND');
    assert.equal((await ack(other, 'message:send', { channelId, clientMessageId: require('node:crypto').randomUUID(), type: 'text', text: 'Forbidden' })).error.code, 'CHANNEL_NOT_FOUND');
    await ack(other, 'channel:join', { channelId: foreign });
    await ack(first, 'channel:join', { channelId });
    await ack(second, 'channel:join', { channelId });
    let leaked = false; other.on('message:created', () => { leaked = true; });
    const received = new Promise(resolve => second.once('message:created', resolve));
    const body = { channelId, clientMessageId: require('node:crypto').randomUUID(), type: 'text', text: 'Socket commit fixture' };
    const sent = await ack(first, 'message:send', body);
    assert.ok(sent.message, JSON.stringify(sent));
    assert.equal((await received)._id, sent.message._id);
    assert.equal((await ack(first, 'message:send', body)).message._id, sent.message._id);
    second.disconnect();
    const follow = await ack(first, 'message:send', { ...body, clientMessageId: require('node:crypto').randomUUID(), text: 'While peer disconnected' });
    const reconnected = await connect(a.token);
    const recovered = await ack(reconnected, 'channel:sync', { channelId, afterSeq: sent.message.seq });
    assert.equal(recovered.items[0]._id, follow.message._id);
    assert.equal(leaked, false);
    assert.equal((await ack(first, 'message:send', { ...body, text: 'Changed' })).error.code, 'MESSAGE_CONFLICT');
    assert.equal((await ack(first, 'message:send', { ...body, clientMessageId: require('node:crypto').randomUUID(), text: 'x'.repeat(8193) })).error.code, 'MESSAGE_TOO_LARGE');
    assert.equal((await ack(first, 'channel:join', { channelId, room: 'arbitrary' })).error.code, 'INVALID_INPUT');
    const jwt = require('jsonwebtoken'), claims = jwt.decode(a.token);
    assert.ok(process.env.GUARD_CORE_SIGNING_SECRET, 'Fixture signing key required for expiry assertion');
    const expiryToken = jwt.sign({ ...claims, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 2 }, process.env.GUARD_CORE_SIGNING_SECRET, { algorithm: 'HS256' });
    const expiring = await connect(expiryToken);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Expired socket remained connected')), 3500); expiring.once('disconnect', () => { clearTimeout(timer); resolve(); }); });
    await connect(expiryToken, base, true);
    const db = require('mongoose').createConnection();
    assert.ok(process.env.GUARD_MONGO_URI);
    assert.match(process.env.GUARD_MONGO_URI, /^mongodb:\/\/(127\.0\.0\.1|localhost):[0-9]+\//, 'Only the local disposable replica set may be mutated');
    await db.openUri(process.env.GUARD_MONGO_URI, { dbName: 'collegehubs_demo_p32' });
    const userId = new (require('mongoose').Types.ObjectId)(a.user._id);
    try {
      await db.collection('users').updateOne({ _id: userId }, { $inc: { membershipVersion: 1 } });
      assert.equal((await ack(first, 'channel:sync', { channelId })).error.code, 'MEMBERSHIP_CHANGED');
      await connect(a.token, base, true);
    } finally { await db.collection('users').updateOne({ _id: userId }, { $set: { membershipVersion: claims.membershipVersion } }); await db.close(); }
  } finally { for (const socket of sockets) socket.disconnect(); }
});

test('G1: durable channel history hides foreign Hubs and concurrent replay commits once', async () => {
  assert.ok(process.env.GUARD_APP_ORIGIN, 'Run with the disposable integration fixture; no database skip');
  const base = process.env.GUARD_APP_ORIGIN;
  async function call(path, token, body) {
    const response = await fetch(base + '/api' + path, { method: body ? 'POST' : 'GET', headers: { Origin: base, ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  const a = (await call('/auth/login', null, { email: 'preview@cvr.ac.in', password: 'Preview-only-32!' })).data;
  const b = (await call('/auth/login', null, { email: 'preview@sky.example.test', password: 'Preview-only-32!' })).data;
  const channel = (await call('/hubs/' + a.user.hubId + '/channels', a.token)).data.items[0]._id;
  const path = '/channels/' + channel + '/messages';
  assert.equal((await call(path, b.token)).status, 404);
  const body = { clientMessageId: require('node:crypto').randomUUID(), type: 'text', text: 'Durable fixture message' };
  const replies = await Promise.all(Array.from({ length: 5 }, () => call(path, a.token, body)));
  for (const reply of replies) assert.ok([200, 201].includes(reply.status), JSON.stringify(reply));
  assert.equal(new Set(replies.map(reply => reply.data.message._id)).size, 1);
  assert.equal((await call(path, b.token, body)).status, 404);
  assert.equal((await call(path, a.token, { ...body, text: 'Altered retry' })).status, 409);
  assert.equal((await call(path + '?limit=51', a.token)).status, 400);
  assert.equal((await call(path + '?limit[]=1', a.token)).status, 400);
  assert.equal((await call(path + '?hubId=' + b.user.hubId, a.token)).status, 400);
  const history = (await call(path + '?afterSeq=' + (replies[0].data.message.seq - 1), a.token)).data;
  assert.equal(history.items.filter(row => row.clientMessageId === body.clientMessageId).length, 1);
  assert.equal(history.items[0].hubId, a.user.hubId);
  const parallel = await Promise.all(Array.from({ length: 6 }, (_, i) => call(path, a.token, { ...body, clientMessageId: require('node:crypto').randomUUID(), text: 'Ordered ' + i })));
  const seqs = parallel.map(reply => { assert.equal(reply.status, 201); return reply.data.message.seq; }).sort((a, b) => a - b);
  assert.deepEqual(seqs, Array.from({ length: 6 }, (_, i) => replies[0].data.message.seq + i + 1));
  const page = (await call(path + '?afterSeq=' + replies[0].data.message.seq + '&limit=2', a.token)).data;
  assert.equal(page.hasMore, true); assert.deepEqual(page.items.map(row => row.seq), seqs.slice(0, 2));
  const next = (await call(path + '?afterSeq=' + page.items.at(-1).seq, a.token)).data;
  assert.deepEqual(next.items.map(row => row.seq), seqs.slice(2));
});

test('G1: real Learn SQL keeps two users, Hubs and themes separate through the gateway', { skip: !process.env.GUARD_APP_ORIGIN || !process.env.GUARD_LEARN_DATABASE_URL }, async () => {
  const { Pool } = require('pg');
  const { createSessionStore } = require('../../services/learn/src/auth/sessionBoundary.cjs');
  const base = process.env.GUARD_APP_ORIGIN, db = new URL(process.env.GUARD_LEARN_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  assert.ok(['localhost', '127.0.0.1'].includes(db.hostname)); assert.match(db.pathname, /^\/collegehubs_demo_learn_/);
  const pool = new Pool({ connectionString: db.toString() });
  async function account(email) {
    const jar = new Map();
    const call = async (path, body, token) => {
      const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), Cookie: [...jar].map(([k,v]) => k + '=' + v).join('; ') }, ...(body ? { body: JSON.stringify(body) } : {}) });
      for (const value of response.headers.getSetCookie()) { const [k,v] = value.split(';')[0].split('='); jar.set(k,v); }
      assert.ok(response.ok, path + ': ' + response.status); return response.json();
    };
    const core = await call('/api/auth/login', { email, password: 'Preview-only-32!' });
    const { state } = await call('/api/learn/auth/start', {});
    const issued = await call('/api/auth/module-grants', { module: 'learn', state, returnPath: '/learn' }, core.token);
    await call('/api/learn/auth/callback', { module: 'learn', state, grant: issued.grant });
    const dto = await call('/api/learn/session'), graph = await call('/api/learn/spike/graph');
    assert.equal(dto.userId, core.user._id); assert.equal(dto.hubId, core.user.hubId);
    assert.equal(graph.userId, dto.userId); assert.equal(graph.hubId, dto.hubId);
    return { dto, handle: jar.get('ch_learn_session') };
  }
  try {
    const a = await account('preview@cvr.ac.in'), b = await account('preview@sky.example.test');
    assert.notEqual(a.dto.userId, b.dto.userId); assert.notEqual(a.dto.hubId, b.dto.hubId);
    assert.equal(a.dto.theme.tokens.background, '#F4ECD6'); assert.equal(b.dto.theme.tokens.background, '#DFF7FF');
    const store = createSessionStore(pool, { origin: base });
    await assert.rejects(store.get(a.handle, { userId: b.dto.userId, hubId: b.dto.hubId }), { status: 401 });
    await assert.rejects(store.get(a.handle, { userId: b.dto.userId, hubId: a.dto.hubId }), { status: 401 });
    assert.equal((await store.get(a.handle, { userId: a.dto.userId, hubId: a.dto.hubId })).hub_id, a.dto.hubId);
  } finally { await pool.end(); }
});
process.env.JWT_SECRET = 'isolated-guard-fixture-secret-not-for-deployment';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'guard-google-client';
process.env.ENABLE_MODULES = '';
const { createApp } = require('../../services/core/app');
const User = require('../../services/core/models/User');
const Hub = require('../../services/core/models/Hub');
const College = require('../../services/core/models/College');
const Post = require('../../services/core/models/Post');
const Channel = require('../../services/core/models/Channel');
const { generateToken, verifyToken } = require('../../services/core/config/auth');
const { getUserHubs, requireHubAccess, scopedFilter } = require('../../services/core/services/hubAccess');
const { normalizeDomain } = require('../../services/core/config/collegeRegistry');

const id = value => value.toString(16).padStart(24, '0');

test('G1: confirmed CVR registry uses only the exact active domain', () => {
  const cvr = require('../../services/core/config/collegeRegistry').config.colleges.find(item => item.slug === 'cvr');
  assert.equal(cvr.status, 'active');
  assert.deepEqual(cvr.domains.map(item => item.normalizedDomain), ['cvr.ac.in']);
  assert.match(cvr.domains[0].evidenceRef, /user-confirmed/);
});

test('G1: Learn theme cache is bound to Hub and version, sanitized and isolated', async () => {
  const { createThemeCache } = await import('../../apps/web/src/features/learn/hubTheme.ts');
  const cache = createThemeCache();
  const tokens = require('../../services/core/config/collegeRegistry').config.defaultTheme;
  const a = { hubId: id(10), themeVersion: 1, name: 'A', tokens };
  const b = { hubId: id(20), themeVersion: 1, name: 'B', tokens: { ...tokens, background: '#DFF7FF' } };
  assert.equal(cache.read(a, id(10), 1).tokens.background, '#F4ECD6');
  assert.equal(cache.read(b, id(20), 1).tokens.background, '#DFF7FF');
  assert.equal(cache.read(a, id(10), 1).tokens.background, '#F4ECD6');
  assert.throws(() => cache.read(b, id(10), 1));
  assert.throws(() => cache.read(a, id(10), 2));
  assert.throws(() => cache.read({ ...a, tokens: { ...tokens, background: 'url(evil)' } }, id(10), 1));
  assert.equal(cache.read({ ...a, themeVersion: 2, tokens: { ...tokens, background: '#FFD3B6' } }, id(10), 2).tokens.background, '#FFD3B6');
});

test('G1: Learn session ownership denies foreign, missing-Hub and expired rows', () => {
  const { authorizeSession } = require('../../services/learn/src/auth/sessionBoundary.cjs');
  const row = { user_id: id(1), hub_id: id(10), expires_at: new Date((Math.floor(Date.now() / 1000) + 60) * 1000), principal: { sub: id(1), hubId: id(10), exp: Math.floor(Date.now() / 1000) + 60 } };
  assert.ok(authorizeSession(row, { userId: id(1), hubId: id(10) }));
  for (const owner of [{ userId: id(2), hubId: id(10) }, { userId: id(1), hubId: id(20) }]) assert.throws(() => authorizeSession(row, owner));
  assert.throws(() => authorizeSession({ ...row, hub_id: null }));
  assert.throws(() => authorizeSession({ ...row, expires_at: new Date(0) }));
});

test('G1: a signed Core user cannot submit module events for either Hub', async () => {
  await withApi(async request => {
    const response = await request('/aura/events', users[0], 'POST', { userId: id(2), hubId: id(20), awardedAura: 100 });
    assert.equal(response.status, 401);
  });
});
let users, hubs, colleges, posts, restores;
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(row, part));
    const actual = row[key] instanceof Date ? row[key].getTime() : row[key];
    if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
      return Object.entries(value).every(([op, expected]) => {
        expected = expected instanceof Date ? expected.getTime() : expected;
        return op === '$lt' ? actual < expected : op === '$gt' ? actual > expected : false;
      });
    }
    return String(actual) === String(value instanceof Date ? value.getTime() : value);
  });
}
function query(value) {
  return { lean() { return this; }, maxTimeMS() { return this; }, option() { return this; }, select() { return this; }, sort(order) {
    if (Array.isArray(value)) value.sort((a, b) => {
      for (const [key, direction] of Object.entries(order)) {
        if (a[key] < b[key]) return -direction;
        if (a[key] > b[key]) return direction;
      }
      return 0;
    });
    return this;
  }, limit(count) { if (Array.isArray(value)) value = value.slice(0, count); return this; },
    populate(options) {
      if (options.path === 'author') {
        const populate = row => row && row.author ? { ...row, author: users.filter(user => matches(user, options.match)).find(user => user._id === String(row.author)) || null } : row;
        value = Array.isArray(value) ? value.map(populate) : populate(value);
      }
      return this;
    }, exec: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}
function patch(model, name, fn) { const original = model[name]; restores.push(() => { model[name] = original; }); model[name] = fn; }
test.beforeEach(() => {
  restores = [];
  users = [
    { _id: id(1), username: 'alice', email: 'alice@a.example.test', hubId: id(10), membershipStatus: 'active', membershipVerified: true, verificationMethod: 'email', emailVerificationMethod: 'email', emailVerifiedAt: new Date(), membershipVersion: 1, college: 'A' },
    { _id: id(2), username: 'bob', email: 'bob@b.example.test', hubId: id(20), membershipStatus: 'active', membershipVerified: true, verificationMethod: 'email', emailVerificationMethod: 'email', emailVerifiedAt: new Date(), membershipVersion: 1, college: 'B' },
    { _id: id(3), username: 'unknown', email: 'unknown@example.test', hubId: null, membershipStatus: 'unassigned', membershipVersion: 0 },
    { _id: id(4), username: 'legacy', email: 'legacy@example.test', college: 'A' },
    { _id: id(5), username: 'peer', email: 'peer@a.example.test', hubId: id(10), membershipStatus: 'active', membershipVerified: true, verificationMethod: 'email', emailVerificationMethod: 'email', emailVerifiedAt: new Date(), membershipVersion: 1 },
  ];
  hubs = [{ _id: id(10), hubId: id(10), collegeId: id(100), status: 'active' }, { _id: id(20), hubId: id(20), collegeId: id(200), status: 'active' }];
  users.forEach(user => { user.auraPoints = 0; });
  colleges = [{ _id: id(100), status: 'active' }, { _id: id(200), status: 'active' }];
  posts = [{ _id: id(30), hubId: id(10), likes: [] }, { _id: id(40), hubId: id(20), likes: [] }, { _id: id(50), likes: [] }];
  for (const post of posts) { post.save = async () => post; post.populate = async () => post; }
  posts.forEach(post => { post.createdAt = new Date('2026-09-29T00:00:00Z'); });
  // Mock joined canonical rows for the existing route isolation tests. Real Mongo
  // balance joins, legacy exclusion and rank beyond page one are covered separately.
  patch(require('../../services/core/models/AuraBalance'), 'findOne', () => query(null));
  patch(require('../../services/core/models/DailyActivity'), 'find', () => query([]));
  patch(User, 'aggregate', pipeline => {
    const scope = pipeline[0].$match;
    const ordered = users.filter(user => matches(user, scope)).sort((a, b) => b.auraPoints - a.auraPoints || a._id.localeCompare(b._id)).map((user, i) => ({ _id: user._id, username: user.username, auraPoints: user.auraPoints, rank: i + 1 }));
    const facet = pipeline.at(-1).$facet;
    return query([{ items: ordered.filter(row => matches(row, facet.items[0].$match)).slice(0, facet.items[2].$limit), own: ordered.filter(row => matches(row, facet.own[0].$match)).map(({ rank, auraPoints }) => ({ rank, auraPoints })) }]);
  });
  patch(User, 'findById', value => query(users.find(user => user._id === String(value)) || null));
  patch(User, 'findOne', filter => query(users.find(user => matches(user, filter)) || null));
  patch(User, 'find', filter => query(users.filter(user => matches(user, filter))));
  patch(User, 'countDocuments', filter => Promise.resolve(users.filter(user => matches(user, filter)).length));
  patch(Channel, 'find', filter => query([
    { _id: id(60), hubId: id(10), slug: 'dsa', title: 'DSA', kind: 'subject', archivedAt: null, nextMessageSeq: 9 },
    { _id: id(70), hubId: id(20), slug: 'dsa', title: 'Foreign', kind: 'subject', archivedAt: null },
  ].filter(row => matches(row, filter))));
  patch(User, 'findByIdAndUpdate', (value, update) => { const user = users.find(item => item._id === String(value)); Object.assign(user, update.$set); return query(user); });
  patch(Hub, 'findOne', filter => query(hubs.find(hub => matches(hub, filter)) || null));
  patch(College, 'exists', filter => query(colleges.find(college => matches(college, filter)) || null));
  patch(Post, 'find', filter => query(posts.filter(post => matches(post, filter))));
  patch(Post, 'findOne', filter => query(posts.find(post => matches(post, filter)) || null));
  patch(Post, 'findOneAndUpdate', (filter, update) => {
    const post = posts.find(row => matches(row, filter));
    if (post) {
      if (update.$addToSet && !post.likes.includes(update.$addToSet.likes)) post.likes.push(update.$addToSet.likes);
      if (update.$pull) post.likes = post.likes.filter(value => value !== update.$pull.likes);
    }
    return query(post || null);
  });
});
test.afterEach(() => restores.reverse().forEach(restore => restore()));
async function withApi(work) {
  const server = createApp({ connection: { readyState: 1 } }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const request = async (path, user, method = 'GET', body, token) => {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api' + path, {
      method, headers: { ...(user ? { Authorization: 'Bearer ' + (token || generateToken(user)) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  try { await work(request); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('G1: anonymous callers cannot read tenant leaderboard', () => withApi(async request => {
  assert.equal((await request('/users/leaderboard')).status, 401);
  assert.equal((await request('/posts')).status, 401);
}));
test('G1: module handoff requires current active Hub membership', () => withApi(async request => {
  for (const user of [users[2], users[3]]) {
    assert.equal((await request('/auth/module-grants', user, 'POST', { module: 'arcade', state: 'fixture', returnPath: '/arcade' })).status, 403);
  }
}));
test('G1: invalid pagination must fail closed without returning tenant rows', () => withApi(async request => {
  assert.equal((await request('/posts?cursor=forged', users[0])).status, 400);
  assert.equal((await request('/posts?limit=51', users[0])).status, 400);
  assert.equal((await request('/users/leaderboard?cursor=forged', users[0])).status, 400);
}));
test('G1: scoped pages remain stable across ties and reject other-Hub/resource cursors', () => withApi(async request => {
  const date = new Date('2026-09-29T00:00:00Z');
  posts.unshift({ _id: id(29), hubId: id(20), createdAt: new Date('2026-09-30'), likes: [] });
  posts.push({ _id: id(31), hubId: id(10), createdAt: date, likes: [] });
  const first = await request('/posts?limit=1', users[0]);
  assert.deepEqual(first.data.items.map(row => row._id), [id(30)]);
  assert.ok(first.data.nextCursor);
  const next = await request('/posts?limit=1&cursor=' + first.data.nextCursor, users[0]);
  assert.deepEqual(next.data.items.map(row => row._id), [id(31)]);
  assert.equal(next.data.nextCursor, null);
  assert.equal((await request('/posts?cursor=' + first.data.nextCursor, users[1])).status, 400);
  assert.equal((await request('/users/leaderboard?cursor=' + first.data.nextCursor, users[0])).status, 400);
  const rank = await request('/users/leaderboard?limit=1', users[4]);
  assert.equal(rank.data.ownRank.rank, 2);
  assert.equal(rank.data.items[0].username, 'alice');
  const rankNext = await request('/users/leaderboard?cursor=' + rank.data.nextCursor, users[4]);
  assert.deepEqual(rankNext.data.items.map(row => [row.username, row.rank]), [['peer', 2]]);
  assert.equal((await request('/users/leaderboard?cursor=' + rank.data.nextCursor, users[1])).status, 400);
}));
test('G1: own rank counts only this Hub even outside the first fifty', () => withApi(async request => {
  for (let index = 0; index < 55; index++) users.push({ _id: id(500 + index), username: 'rank' + index, hubId: id(10), membershipStatus: 'active', auraPoints: 10 });
  users[1].auraPoints = 999;
  const response = await request('/users/leaderboard?limit=50', users[0]);
  assert.equal(response.data.items.length, 50);
  assert.equal(response.data.ownRank.rank, 56);
  assert.ok(response.data.items.every(row => row.username !== 'bob'));
}));
test('G1: themes/channels are scoped, allowlisted DTOs; labels never change membership', () => withApi(async request => {
  const { config } = require('../../services/core/config/collegeRegistry');
  hubs[0].themeTokens = { ...config.defaultTheme }; hubs[0].themeVersion = 2;
  hubs[0].name = '<script>literal name</script>'; hubs[0].logoUrl = 'https://unapproved.example/logo.svg';
  users[0].college = 'B iiit iit'; hubs[0].verifiedEmailDomains = ['private.example.test'];
  assert.equal((await request('/hubs/' + id(20) + '/theme', users[0])).status, 403);
  assert.equal((await request('/hubs/' + id(20) + '/channels', users[0])).status, 403);
  assert.equal((await request('/me/hub', users[2])).status, 403);
  const theme = await request('/me/hub', users[0]);
  assert.equal(theme.data.hubId, id(10)); assert.equal(theme.data.themeVersion, 2);
  assert.equal(theme.data.logoUrl, null);
  assert.equal(Object.hasOwn(theme.data, 'verifiedEmailDomains'), false);
  assert.deepEqual(theme.data.tokens, config.defaultTheme);
  hubs[0].themeTokens = { ...config.defaultTheme, accent: 'url(javascript:bad)', extra: 'injection' };
  assert.deepEqual((await request('/hubs/' + id(10) + '/theme', users[0])).data.tokens, config.defaultTheme);
  const channels = await request('/hubs/' + id(10) + '/channels', users[0]);
  assert.deepEqual(channels.data.items.map(row => row._id), [id(60)]);
  assert.equal(Object.hasOwn(channels.data.items[0], 'nextMessageSeq'), false);
}));
test('G1: retries are idempotent and foreign unlikes cannot mutate a post', () => withApi(async request => {
  const url = '/posts/' + id(30) + '/like';
  await request(url, users[0], 'PUT'); await request(url, users[0], 'PUT');
  assert.deepEqual(posts[0].likes, [id(1)]);
  assert.equal((await request(url, users[1], 'DELETE')).status, 404);
  assert.deepEqual(posts[0].likes, [id(1)]);
  await request(url, users[0], 'DELETE'); await request(url, users[0], 'DELETE');
  assert.deepEqual(posts[0].likes, []);
}));
test('G1: author population cannot expose a foreign or unassigned profile', () => withApi(async request => {
  posts[0].author = users[1]._id;
  assert.equal((await request('/posts', users[0])).data.items[0].author, null);
  posts[0].author = users[3]._id;
  assert.equal((await request('/posts', users[0])).data.items[0].author, null);
  assert.equal((await request('/posts/' + id(30) + '/like', users[0], 'PUT')).data.author, null);
}));
test('G1: other-Hub and missing-Hub posts never appear, including a forged query Hub', () => withApi(async request => {
  const response = await request('/posts?hubId=' + id(20), users[0]);
  assert.equal(response.status, 200);
  assert.deepEqual(response.data.items.map(post => post._id), [id(30)]);
}));
test('G1: profiles and rankings hide foreign and missing-Hub users', () => withApi(async request => {
  assert.equal((await request('/users/bob', users[0])).status, 404);
  assert.equal((await request('/users/legacy', users[0])).status, 404);
  const response = await request('/users/leaderboard', users[0]);
  assert.deepEqual(response.data.items.map(user => user.username), ['alice', 'peer']);
  assert.ok(response.data.items.every(user => !Object.hasOwn(user, 'email')));
}));
test('G1: foreign and missing-Hub likes are denied; own-Hub like works', () => withApi(async request => {
  for (const postId of [id(40), id(50)]) assert.equal((await request('/posts/' + postId + '/like', users[0], 'PUT', {})).status, 404);
  assert.equal((await request('/posts/' + id(30) + '/like', users[0], 'PUT', {})).status, 200);
  assert.deepEqual(posts[1].likes, []);
}));
test('G1: unknown and legacy identities are onboarding-only', () => withApi(async request => {
  for (const user of [users[2], users[3]]) {
    assert.equal((await request('/posts', user)).status, 403);
    assert.equal((await request('/users/leaderboard', user)).status, 403);
    assert.equal((await request('/me', user)).status, 200);
    assert.deepEqual(await getUserHubs(user), []);
  }
}));
test('G1: /me is current self and identity/membership/reward changes are forbidden', () => withApi(async request => {
  const self = await request('/me?userId=' + id(2), users[0]);
  assert.equal(self.data._id, id(1));
  assert.deepEqual(self.data.hubs, [{ hubId: id(10), membershipVersion: 1 }]);
  for (const body of [{ hubId: id(20) }, { membershipVerified: true }, { membershipStatus: 'active' }, { email: 'bob@b.example.test' }, { college: 'B' }, { auraPoints: 100 }]) {
    assert.equal((await request('/me', users[0], 'PATCH', body)).status, 400);
  }
  assert.equal((await request('/me/assignment/retry', users[2], 'POST', { hubId: id(20) })).status, 400);
}));
test('G1: same-Hub private ownership is still enforced', () => withApi(async request => {
  assert.equal((await request('/users/peer', users[0], 'PUT', { bio: 'foreign write' })).status, 403);
  assert.equal((await request('/users/alice', users[0], 'PUT', { bio: 'own write' })).status, 200);
  assert.equal(users[0].bio, 'own write');
}));
test('G1: authorization ignores display labels, rejects explicit foreign Hub and empty scope', async () => {
  users[0].college = 'B'; users[0].themeTokens = { accent: '#123456' };
  assert.equal((await requireHubAccess(users[0])).hubId, id(10));
  await assert.rejects(requireHubAccess(users[0], id(20)), { status: 403, code: 'HUB_FORBIDDEN' });
  assert.throws(() => scopedFilter({}, {}), { code: 'HUB_REQUIRED' });
  assert.equal(scopedFilter({ hubId: id(10) }, { hubId: id(20) }).hubId, id(10));
});
test('G1: disabled user, Hub or registry immediately removes access', async () => {
  users[0].membershipStatus = 'disabled'; await assert.rejects(requireHubAccess(users[0]), { code: 'HUB_REQUIRED' });
  users[0].membershipStatus = 'active'; hubs[0].status = 'disabled'; await assert.rejects(requireHubAccess(users[0]), { code: 'HUB_REQUIRED' });
  hubs[0].status = 'active'; colleges[0].status = 'disabled'; await assert.rejects(requireHubAccess(users[0]), { code: 'HUB_REQUIRED' });
});
test('G1: stale membership tokens are denied and onboarding tokens contain no Hub', () => withApi(async request => {
  const token = generateToken(users[0]); users[0].membershipVersion += 1;
  assert.equal((await request('/me', users[0], 'GET', undefined, token)).status, 401);
  const claims = verifyToken(generateToken(users[2]));
  assert.equal(claims.hubId, null); assert.deepEqual(claims.scope, ['core:onboarding']);
}));
test('G1: domains normalize exactly; subdomains and suffix lookalikes remain distinct', () => {
  assert.equal(normalizeDomain(' A.Example.Test '), 'a.example.test');
  assert.notEqual(normalizeDomain('sub.a.example.test'), normalizeDomain('a.example.test'));
  assert.notEqual(normalizeDomain('a.example.test.evil.test'), normalizeDomain('a.example.test'));
  assert.equal(normalizeDomain('b\u00fccher.example'), 'xn--bcher-kva.example');
  assert.throws(() => normalizeDomain('a.example.test:443'));
  assert.throws(() => normalizeDomain('a%2eexample.test'));
  assert.throws(() => normalizeDomain('a.example.test/anything'));
});

test('G1: active registry requires confirmed domains and rejects duplicates/unsafe themes', async () => {
  const base = { name: 'Fixture', slug: 'fixture', timezone: 'Asia/Kolkata', status: 'active' };
  await assert.rejects(new College({ ...base, domains: [{ normalizedDomain: 'a.example.test' }] }).validate());
  const domain = { normalizedDomain: 'a.example.test', verifiedAt: new Date(), evidenceRef: 'guard fixture' };
  await assert.rejects(new College({ ...base, domains: [domain, { ...domain, normalizedDomain: 'A.EXAMPLE.TEST' }] }).validate());
  await assert.rejects(new College({ ...base, domains: [domain], themeTokens: { accent: 'url(javascript:bad)' } }).validate());
});
test('G1: OAuth-only identities validate without a password; password identities require one', async () => {
  await new User({ username: 'googlefixture', email: 'g@a.example.test', googleSubject: 'guard-google-sub' }).validate();
  await assert.rejects(new User({ username: 'passwordfixture', email: 'p@a.example.test' }).validate());
});
test('G1: untrusted Google identity claims cannot enter membership assignment', async () => {
  const { OAuth2Client } = require('google-auth-library');
  const original = OAuth2Client.prototype.verifyIdToken;
  const valid = { iss: 'https://accounts.google.com', aud: 'guard-google-client', sub: 'guard-sub', email: 'g@a.example.test', email_verified: true, exp: Math.floor(Date.now() / 1000) + 60 };
  try {
    await withApi(async request => {
      for (const change of [{ iss: 'https://evil.test' }, { aud: 'foreign' }, { exp: 1 }, { email_verified: false }, { sub: '' }]) {
        OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => ({ ...valid, ...change }) });
        assert.equal((await request('/google/auth', undefined, 'POST', { credential: 'isolated-fixture' })).status, 401);
      }
    });
  } finally { OAuth2Client.prototype.verifyIdToken = original; }
});

test('G1: post creation ignores a browser-supplied foreign Hub', () => withApi(async request => {
  let saved;
  patch(Post, 'create', async data => { saved = data; return { ...data, populate: async () => {} }; });
  const response = await request('/posts', users[0], 'POST', { content: 'Own Hub content', hubId: id(20) });
  assert.equal(response.status, 201);
  assert.equal(saved.hubId, id(10));
  assert.equal(saved.author, id(1));
}));
