const assert=require('node:assert/strict'),mongoose=require('mongoose');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {pdfFixture}=require('../../scripts/pdf-fixture.cjs');
(async()=>{
 assert.ok(/^mongodb:\/\/127\.0\.0\.1:/.test(process.env.GUARD_MONGO_URI||''));
 const core=await mongoose.createConnection(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_p32'}).asPromise();
 const db=core.useDb('collegehubs_demo_interview'),browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const user=await core.collection('users').findOne({email:'preview@cvr.ac.in'});assert.ok(user);
  const scope={userId:String(user._id),hubId:String(user.hubId)};
  await db.collection('sessions').insertMany(Array.from({length:25},(_,i)=>({...scope,interviewId:new mongoose.Types.ObjectId(),jobTitle:'Earlier practice '+(i+1),status:'completed',createdAt:new Date(2026,0,1),report:{score:i===0?0:80,summary:'Synthetic saved report',answers:[],providerId:'groq',providerModel:'openai/gpt-oss-20b'},questions:[],answers:[],deliveryStatus:'settled',receipt:{awardedAura:0,reason:'fixture'}})));
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(20000);
  await page.goto('http://localhost:5182/interview/history');
  await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Start ungraded practice',exact:true}).waitFor();
  const saved=page.getByRole('region',{name:'Saved sessions',exact:true});
  await saved.locator('article').first().waitFor();assert.equal(await saved.locator('article').count(),20);
  await page.getByRole('button',{name:'Load older sessions',exact:true}).click();await saved.locator('article').nth(24).waitFor();assert.equal(await saved.locator('article').count(),25);
  await page.locator('.interview-page header').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'.local/tp92-history-desktop.png',fullPage:false});
  assert.equal(await page.evaluate(async()=>(await fetch('/api/interview/sessions?cursor=bad')).status),400);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Start ungraded practice',exact:true}).click();await page.waitForURL('**/interview/sessions/*');
  await page.getByLabel('Your answer',{exact:true}).fill('Saved example: explain the decision, test assumptions and name a tradeoff.');
  await page.getByRole('button',{name:'Save and continue',exact:true}).click();await page.getByRole('heading',{name:'Question 2 of 5'}).waitFor();
  await page.reload();await page.getByLabel('Your answer',{exact:true}).waitFor();assert.match(await page.getByLabel('Your answer',{exact:true}).inputValue(),/Saved example/);
  await page.screenshot({path:'.local/tp92-answer-mobile.png',fullPage:true});
  for(let i=0;i<5;i++){await page.getByLabel('Your answer',{exact:true}).fill('Saved example: explain the decision, test assumptions and name a tradeoff.');await page.getByRole('button',{name:i<4?'Save and continue':'Save answer',exact:true}).click();if(i<4)await page.getByRole('heading',{name:`Question ${i+2} of 5`,exact:true}).waitFor();}
  await page.getByRole('button',{name:'Finish ungraded self-review',exact:true}).click();await page.waitForURL('**/interview/results/*');await page.getByText('Ungraded practice saved · zero Aura.',{exact:true}).waitFor();assert.equal(await page.getByRole('meter').count(),0);await page.screenshot({path:'.local/tp92-report-mobile.png',fullPage:true});
  await page.goto('http://localhost:5182/interview/resumes');await page.locator('#resume-file').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:pdfFixture('Synthetic resume for expiry acceptance')});await page.getByRole('button',{name:'Upload resume',exact:true}).click();await page.getByText('Ready: synthetic.pdf.',{exact:true}).waitFor();await page.getByText(/^Text expires \d/).waitFor();await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/tp92-resumes-mobile.png',fullPage:true});
  const resume=await db.collection('resumes').findOne(scope);assert.ok(resume.expiresAt>new Date());
  await db.collection('resumes').updateOne({_id:resume._id},{$set:{expiresAt:new Date(0)}});
  assert.equal(await page.evaluate(async id=>(await fetch('/api/interview/resumes/'+id)).status,String(resume._id)),410);
  await page.reload();await page.getByText('No resumes yet. Upload a text-based PDF to get started.',{exact:true}).waitFor();
  assert.equal(await db.collection('resumes').countDocuments(scope),0);
  const zero=await db.collection('sessions').findOne({...scope,'report.score':0});await page.goto('http://localhost:5182/interview/results/'+zero._id);await page.getByRole('meter',{name:'Overall practice score'}).waitFor();assert.equal(await page.getByRole('meter',{name:'Overall practice score'}).getAttribute('value'),'0');
  const anon=await browser.newContext();const response=await anon.request.get('http://localhost:5182/api/interview/sessions');assert.equal(response.status(),401);await anon.close();
  console.log('TP9.2 browser passed: 25-row history through gateway, reload recovery, mobile self-review, 30-day expiry, private text removal, genuine zero report, anonymous denial.');
 }finally{await browser.close();await core.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
