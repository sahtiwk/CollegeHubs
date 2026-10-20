// Disposable local fixture only. Answer keys are read by Node, never sent to the browser.
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const url=new URL(process.env.GUARD_LEARN_DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.ok(url.pathname.includes('demo'));
 const pool=new Pool({connectionString:url.toString()}),browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(20000);
 page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
 await page.goto('http://localhost:5182/learn/onboarding');await page.getByLabel('College email').fill(process.env.FRESH_LEARN_BROWSER==='true'?'peer@cvr.ac.in':'preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.waitForURL('**/learn/onboarding').catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
 async function enroll(domain){await page.goto('http://localhost:5182/learn/onboarding');await page.locator('input[name=domain][value='+domain+']').check();await page.getByRole('button',{name:'Save & open my learning'}).click();await page.waitForURL('**/learn');await page.locator('.learn-version').waitFor();}
 if(process.env.FRESH_LEARN_BROWSER==='true'){
  for(const domain of ['dsa','web','ml','backend','devops']){await enroll(domain);assert.match(await page.locator('.learn-version').innerText(),/3 required topics.*0 completed.*foundations-v1/);}
  await page.getByRole('button',{name:'Show accessible list',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/tp81-fresh-list-mobile.png',fullPage:true});console.log('TP8.1 fresh browser passed: five enrollments, three topics each, zero inherited completions, accessible list.');return;
 }
 await enroll('dsa');assert.match(await page.locator('.learn-version').innerText(),/2 required topics/);
 const ownHub=(await pool.query('SELECT hub_id FROM enrollment ORDER BY updated_at DESC LIMIT 1')).rows[0].hub_id;
 async function node(domain,version){return(await pool.query('SELECT id FROM skill_node WHERE domain=$1 AND version=$2 AND hub_id=$3 ORDER BY position LIMIT 1',[domain,version,ownHub])).rows[0].id;}
 async function pass(id){await page.goto('http://localhost:5182/learn/nodes/'+id);await page.getByRole('button',{name:'Start checkpoint',exact:true}).click();await page.waitForURL('**/quiz/*');const attempt=page.url().split('/').pop();const qs=(await pool.query('SELECT questions FROM quiz_attempt WHERE id=$1',[attempt])).rows[0].questions;for(const q of qs){await page.getByRole('radio',{name:q.options.find(o=>o.id===q.correct).text,exact:true}).check();await page.getByRole('button',{name:'Save answer & continue',exact:true}).click();}await page.getByRole('button',{name:'Finalize assessment',exact:true}).click();await page.getByText('You’ve completed this topic.',{exact:true}).waitFor();return attempt;}
 const oldNode=await node('dsa','demo-v1'),oldAttempt=await pass(oldNode);
 const {migrate}=await import('../../services/learn/src/db/migrations/runner.ts');await migrate(pool,{dryRun:false});assert.equal((await fetch('http://localhost:5184/health/ready')).status,200);
 await page.goto('http://localhost:5182/learn');await page.getByRole('button',{name:'Upgrade this path and keep my history'}).waitFor();await page.screenshot({path:'.local/tp81-upgrade-mobile.png',fullPage:true});await page.getByRole('button',{name:'Upgrade this path and keep my history'}).click();await page.getByText(/3 required topics/).waitFor();assert.match(await page.locator('.learn-version').innerText(),/1 completed/);
 await page.goto('http://localhost:5182/learn/quiz/'+oldAttempt);await page.getByText('You’ve completed this topic.',{exact:true}).waitFor();
 await page.goto('http://localhost:5182/learn/nodes/'+oldNode);await page.getByText(/Archived path/).waitFor();assert.equal(await page.getByRole('button',{name:'Start checkpoint',exact:true}).count(),0);
 await page.goto('http://localhost:5182/learn/onboarding');await page.locator('input[value=devops]').waitFor();assert.equal(await page.locator('input[name=domain]').count(),5);await page.screenshot({path:'.local/tp81-onboarding-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const d of ['web','ml','backend','devops']){await enroll(d);assert.match(await page.locator('.learn-version').innerText(),/3 required topics/);await page.goto('http://localhost:5182/learn/nodes/'+await node(d,'foundations-v1'));await page.getByRole('button',{name:'Start checkpoint',exact:true}).waitFor();}
 const freshAttempt=await pass(await node('ml','foundations-v1'));
 for(let i=0;i<50;i++){const r=(await pool.query('SELECT status FROM learn_event WHERE attempt_id=$1',[freshAttempt])).rows;if(r.length===2&&r.every(x=>x.status==='settled'))break;await new Promise(r=>setTimeout(r,200));}
 await page.reload();await page.getByText('15 Aura confirmed · awarded',{exact:true}).waitFor();await page.getByText('5 Aura confirmed · awarded',{exact:true}).waitFor();await page.screenshot({path:'.local/tp81-receipt-mobile.png',fullPage:true});
 await page.goto('http://localhost:5182/learn');await page.locator('.learn-version').waitFor();await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.local/tp81-dashboard-desktop.png',fullPage:true});
 console.log('TP8.1 browser passed: retained upgrade/history, five paths/readings, mobile overflow, reduced motion, new +5/+15 receipts.');
 }finally{await browser.close();await pool.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
