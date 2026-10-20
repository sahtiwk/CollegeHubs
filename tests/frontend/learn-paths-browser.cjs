// Disposable local fixture; private keys are read only by this Node harness.
const assert=require('node:assert/strict'),{Pool}=require('pg');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const url=new URL(process.env.GUARD_LEARN_DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname.includes('demo'));
 const pool=new Pool({connectionString:url.toString()}),browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 await(await import('../../services/learn/src/db/migrations/runner.ts')).migrate(pool,{dryRun:false});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(20000);
 await page.goto('http://localhost:5182/learn/onboarding');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/learn/onboarding');
 await page.locator('input[name=domain][value=dsa]').waitFor().catch(async e=>{console.log(page.url(),await page.locator('body').innerText());throw e;});
 let hub,user;
 async function assess(node,pass=true){await page.goto('http://localhost:5182/learn/nodes/'+node.id);await page.getByRole('button',{name:'Start checkpoint',exact:true}).click();await page.waitForURL('**/quiz/*');const id=page.url().split('/').pop();const q=(await pool.query('SELECT questions FROM quiz_attempt WHERE id=$1',[id])).rows[0].questions;for(const item of q){await page.getByRole('radio',{name:item.options.find(o=>pass?o.id===item.correct:o.id!==item.correct).text,exact:true}).check();await page.getByRole('button',{name:'Save answer & continue',exact:true}).click();}await page.getByRole('button',{name:'Finalize assessment',exact:true}).click();await page.getByRole('heading',{name:pass?'You’ve completed this topic.':'Keep practicing. You can try again.',exact:true}).waitFor();return id;}
 for(const domain of ['dsa','web','ml','backend','devops']){
  await page.goto('http://localhost:5182/learn/onboarding');await page.locator('input[name=domain][value='+domain+']').check();await page.getByRole('button',{name:'Save & open my learning'}).click();await page.waitForURL('**/learn');await page.locator('.learn-version').waitFor();
  if(!hub){const e=(await pool.query('SELECT hub_id,user_id FROM enrollment ORDER BY updated_at DESC LIMIT 1')).rows[0];hub=e.hub_id;user=e.user_id;}
  const nodes=(await pool.query("SELECT id,label FROM skill_node WHERE hub_id=$1 AND domain=$2 AND version='foundations-v1' ORDER BY position",[hub,domain])).rows;
  if(domain==='dsa'){
   await page.getByRole('button',{name:'Show accessible list',exact:true}).click();const opener=page.getByRole('button',{name:nodes[0].label,exact:true});await opener.focus();await page.keyboard.press('Enter');await page.getByRole('region',{name:'Selected topic'}).waitFor();assert.equal(await page.locator(':focus').textContent(),nodes[0].label);await page.keyboard.press('Escape');assert.equal(await opener.evaluate(e=>document.activeElement===e),true);
   const failure=await assess(nodes[0],false);await page.getByRole('heading',{name:'Review, then try again.',exact:true}).waitFor();await page.screenshot({path:'.local/tp82-remediation-mobile.png',fullPage:true});await page.getByRole('button',{name:'I’ve reviewed these steps',exact:true}).click();await page.getByText(/Review marked done/).waitFor();assert.equal((await pool.query('SELECT count(*)::int n FROM learn_event WHERE attempt_id=$1',[failure])).rows[0].n,0);
  }
  let last;for(const node of nodes)last=await assess(node);
  await page.getByRole('region',{name:'Path complete',exact:true}).waitFor();
  for(let i=0;i<60;i++){const rows=(await pool.query('SELECT status FROM learn_event WHERE attempt_id=$1',[last])).rows;if(rows.length===3&&rows.every(r=>r.status==='settled'))break;await new Promise(r=>setTimeout(r,200));}
  await page.reload();await page.getByRole('region',{name:'Path complete',exact:true}).waitFor();const pathEvent=(await pool.query("SELECT receipt,status FROM learn_event WHERE attempt_id=$1 AND payload->>'type'='learn.path_completed'",[last])).rows[0];assert.equal(pathEvent.status,'settled');assert.ok(pathEvent.receipt.awardedAura<=30);
  if(domain==='dsa'){assert.equal(pathEvent.receipt.awardedAura,30);await page.getByText('30 Aura confirmed · awarded',{exact:true}).waitFor();await page.screenshot({path:'.local/tp82-path-receipt-mobile.png',fullPage:true});}
 }
 assert.equal((await pool.query('SELECT count(*)::int n FROM path_completion WHERE user_id=$1',[user])).rows[0].n,5);
 await page.goto('http://localhost:5182/learn');await page.getByRole('heading',{name:'You’ve finished this path.',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/tp82-progress-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.local/tp82-progress-desktop.png',fullPage:true});
 console.log('TP8.2 browser passed: all five full paths, failed checkpoint/review/recovery, keyboard focus/Escape, +30 path receipt and bounded shared-cap confirmations.');
 }finally{await browser.close();await pool.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
