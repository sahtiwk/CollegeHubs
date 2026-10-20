// Local disposable acceptance: real delegated summaries; explicit fault injection for stale/unavailable UI.
const assert=require('node:assert/strict'),mongoose=require('mongoose'),{Pool}=require('pg'),{randomUUID}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const sqlUrl=new URL(process.env.GUARD_LEARN_DATABASE_URL);
 assert.ok(sqlUrl.hostname==='127.0.0.1'&&sqlUrl.pathname.startsWith('/collegehubs_demo_learn_'));
 assert.ok(/^mongodb:\/\/127\.0\.0\.1:/.test(process.env.GUARD_MONGO_URI||''));
 const sql=new Pool({connectionString:sqlUrl.toString()}),db=await mongoose.createConnection(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_p32'}).asPromise();
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  await(await import('../../services/learn/src/db/migrations/runner.ts')).migrate(sql,{dryRun:false});
  const user=await db.collection('users').findOne({email:'preview@cvr.ac.in'}),owner={hubId:String(user.hubId),userId:String(user._id)};
  const learn=(await import('../../services/learn/src/services/learnerService.ts')).learnerService(sql);
  for(const domain of ['dsa','web','ml','backend','devops']){
   await learn.initialize(owner,domain);
   const id=(await sql.query("SELECT node_id FROM learner_node_state WHERE hub_id=$1 AND user_id=$2 AND domain=$3 AND status='unlocked' LIMIT 1",[owner.hubId,owner.userId,domain])).rows[0].node_id;
   const at=new Date();
   await sql.query("INSERT INTO quiz_attempt(hub_id,user_id,id,request_id,node_id,domain,version,mode,status,questions,result,finalized_at) VALUES($1,$2,$3,$4,$5,$6,'foundations-v1','checkpoint','finalized',$7,$8,$9)",[owner.hubId,owner.userId,randomUUID(),randomUUID(),id,domain,JSON.stringify(Array(5).fill({id:'fixture'})),JSON.stringify({ratio:.4}),at]);
   await sql.query('UPDATE learner_node_state SET assessed_at=$1,theta=-.6 WHERE hub_id=$2 AND user_id=$3 AND node_id=$4',[at,owner.hubId,owner.userId,id]);
  }
  const node=(await sql.query("SELECT node_id FROM learner_node_state WHERE hub_id=$1 AND user_id=$2 AND status='unlocked' ORDER BY domain LIMIT 1",[owner.hubId,owner.userId])).rows[0].node_id;
  const attempt=await(await import('../../services/learn/src/services/attemptService.ts')).attemptService(sql).create(owner,node,'checkpoint',randomUUID());
  await sql.query("INSERT INTO learn_event(hub_id,user_id,attempt_id,event_id,payload,next_attempt_at) VALUES($1,$2,$3,$4,'{}',now()+interval '1 day')",[owner.hubId,owner.userId,attempt.id,'browser-fixture:'+randomUUID()]);
  const game=await db.useDb('collegehubs_demo_arcade').collection('gamesessions').insertOne({...owner,gameId:'numberguess',status:'won',deliveryStatus:'pending',nextAttemptAt:new Date(Date.now()+86400000),createdAt:new Date()});
  const interview=await db.useDb('collegehubs_demo_interview').collection('sessions').insertOne({...owner,status:'completed',deliveryStatus:'pending',nextAttemptAt:new Date(Date.now()+86400000),createdAt:new Date(),questions:[],answers:[],report:{score:80,summary:'Synthetic completed fixture',answers:[]}});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(20000);
  await page.goto('http://localhost:5182/dashboard');
  await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const progress=page.getByRole('region',{name:'Your module progress',exact:true});
  await progress.getByRole('link',{name:'Resume saved assessment'}).waitFor();
  const topics=await page.evaluate(async()=>{const {default:api}=await import('/src/api.js');return (await api.get('/me/weak-skills')).data.items;});
  assert.deepEqual(topics.map(t=>t.domain).sort(),['backend','devops','dsa','ml','web']);
  assert.equal(await progress.locator('progress').count(),5);
  assert.equal(await progress.getByText('1 result awaiting Aura processing.',{exact:true}).count(),3);
  assert.equal(await progress.getByRole('link',{name:'Resume saved assessment'}).getAttribute('href'),'/learn/quiz/'+attempt.id);
  assert.equal(await progress.getByRole('link',{name:'Open saved game'}).getAttribute('href'),'/arcade/numberguess/'+game.insertedId);
  assert.equal(await progress.getByRole('link',{name:'Read your latest report'}).getAttribute('href'),'/interview/results/'+interview.insertedId);
  await progress.scrollIntoViewIfNeeded();await page.screenshot({path:'.local/tp101-progress-desktop.png',fullPage:false});
  await progress.getByRole('link',{name:'Resume saved assessment'}).click();await page.waitForURL('**/learn/quiz/'+attempt.id);await page.getByRole('button',{name:'Save answer & continue'}).waitFor();
  await page.goto('http://localhost:5182/progress');await progress.getByRole('link',{name:'Resume saved assessment'}).waitFor();
  await page.setViewportSize({width:390,height:844});await progress.scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'.local/tp101-progress-mobile.png',fullPage:false});
  await page.route('**/api/me/module-progress',async route=>{
   const response=await route.fetch(),data=await response.json();
   data.modules.learn.status='stale';data.modules.arcade={status:'unavailable',asOf:null};
   await route.fulfill({json:data});
  });
  await progress.getByRole('button',{name:'Refresh progress'}).click();
  await progress.getByText('Saved snapshot',{exact:true}).waitFor();await progress.getByText('Unavailable',{exact:true}).waitFor();
  assert.equal(await progress.getByRole('link',{name:'Resume saved assessment'}).count(),0);
  assert.equal(await progress.getByRole('link',{name:'Open saved game'}).count(),0);
  await page.getByRole('region',{name:'Your Aura',exact:true}).waitFor();
  console.log('TP10.1 browser passed: five real paths, owned saved assessment, three pending counts, saved game/report links, Dashboard and Progress, mobile overflow, stale/unavailable isolation.');
 }finally{await browser.close();await sql.end();await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
