const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const {Pool}=require('pg'),url=new URL(process.env.GUARD_LEARN_DATABASE_URL);
 assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname.startsWith('/collegehubs_demo_'));
 const pool=new Pool({connectionString:url.toString()});
 try{await(await import('../../services/learn/src/db/migrations/runner.ts')).migrate(pool,{dryRun:false});}finally{await pool.end();}
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(20000);
 await page.goto('http://localhost:5182/interview/history');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Start ungraded practice',exact:true}).waitFor();
 const capabilities=await page.evaluate(async()=>await(await fetch('/api/interview/capabilities')).json());assert.equal(capabilities.aiAvailable,false);
 await page.getByRole('button',{name:'Start ungraded practice',exact:true}).click();await page.waitForURL('**/interview/sessions/*');
 for(let i=0;i<5;i++){await page.getByLabel('Your answer',{exact:true}).fill('I would explain an example, test invalid inputs, and compare a simple implementation with its tradeoffs.');await page.getByRole('button',{name:i<4?'Save and continue':'Save answer',exact:true}).click();if(i<4)await page.getByRole('heading',{name:`Question ${i+2} of 5`,exact:true}).waitFor();}
 await page.getByRole('button',{name:'Finish ungraded self-review',exact:true}).click();await page.waitForURL('**/interview/results/*');await page.getByText('Ungraded practice saved · zero Aura.',{exact:true}).waitFor();assert.equal(await page.getByRole('meter').count(),0);await page.screenshot({path:'.local/tp91-self-review-mobile.png',fullPage:true});await page.reload();await page.getByText('Ungraded practice saved · zero Aura.',{exact:true}).waitFor();
 await page.goto('http://localhost:5182/learn/onboarding');await page.locator('input[name=domain][value=dsa]').check();await page.getByRole('button',{name:'Save & open my learning'}).click();await page.waitForURL('**/learn');await page.getByRole('button',{name:'Show accessible list',exact:true}).click();await page.getByRole('button',{name:'Arrays & indexed collections',exact:true}).click();await page.getByRole('link',{name:'Open resources & assessments →',exact:true}).click();await page.getByRole('button',{name:'How should I approach this?',exact:true}).first().click();await page.getByText(/Template guidance · no AI call/).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/tp91-tutor-mobile.png',fullPage:true});
 console.log('TP9.1 browser: provider-disabled curated practice, saved ungraded report without meters or Aura, and seed contextual tutor passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
