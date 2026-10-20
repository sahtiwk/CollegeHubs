// UI-only result fixtures; authentication and module handoffs use the disposable p32 services.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
  const base=process.env.BROWSER_BASE_URL||'http://localhost:5182';
  await page.goto(base+'/progress');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/progress');
  let status='pending';const id='a'.repeat(24),quiz='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  await page.route('**/api/arcade/sessions/'+id,r=>r.fulfill({json:{game:{id,gameId:'numberguess',rulesVersion:'numberguess-v1',status:'won',createdAt:new Date().toISOString(),expiresAt:new Date().toISOString(),serverNow:new Date().toISOString(),actions:[],deliveryStatus:status,receipt:status==='settled'?{awardedAura:5,reason:'awarded'}:null}}}));
  await page.goto(base+'/arcade/numberguess/'+id);await page.getByText('Result saved; Aura pending.',{exact:false}).waitFor();
  status='settled';await page.getByRole('button',{name:'Reload saved game'}).click();await page.getByText('Aura recorded: +5',{exact:false}).waitFor();
  status='attention';await page.getByRole('button',{name:'Reload saved game'}).click();await page.getByText('Your result is saved. Reward delivery needs operator review;',{exact:false}).waitFor();
  await page.screenshot({path:'docs/screenshots/tp5.2-arcade-review-mobile.png',fullPage:true});
  await page.route('**/api/interview/sessions/'+id,r=>r.fulfill({json:{session:{id,jobTitle:'Recovery fixture',status:'completed',questions:[],answers:[],deliveryStatus:status,report:{score:80,summary:'Saved practice report.',answeredCount:5,answers:[]}}}}));
  await page.goto(base+'/interview/results/'+id);await page.getByText('Report saved. Reward delivery needs operator review;',{exact:false}).waitFor();
  await page.route('**/api/learn/quiz/attempts/'+quiz,r=>r.fulfill({json:{id:quiz,nodeId:'fixture',mode:'checkpoint',status:'finalized',result:{passed:true,correctCount:5,itemCount:5,threshold:0.6,theta:1,heuristic:'Practice estimate',review:[]},rewards:[{eventId:'fixture',status}]}}));
  await page.goto(base+'/learn/quiz/'+quiz);await page.getByText('Your result is saved. Reward delivery needs operator review.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Refresh award confirmation'}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'docs/screenshots/tp5.2-learn-review-mobile.png',fullPage:true});
  console.log('PASS: pending → settled, all three operator-review views, mobile overflow');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
