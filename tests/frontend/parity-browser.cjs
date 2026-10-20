// TP10.2 local navigation audit. No human usability or performance claims.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base='http://localhost:5182',output='.local/tp102';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 const report={browser:process.env.BROWSER_CHANNEL||'chrome',checks:[],routes:[],failures:[],participants:0};
 const interactionsOnly=process.env.CHECK_INTERACTIONS_ONLY==='true';
 if(interactionsOnly){
  const prior=JSON.parse(fs.readFileSync(output+'/report-'+report.browser+'.json'));
  assert.equal(prior.failures.length,0);assert.ok(prior.routes.length>90);
  report.routes=prior.routes;report.routeAuditReused=true;
 }
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  let expectedCrash=false;
  page.on('pageerror',error=>{if(!expectedCrash)report.failures.push({kind:'pageerror',message:error.message});});
  async function audit(path,width){
   if(interactionsOnly)return;
   await page.setViewportSize({width,height:900});await page.goto(base+path);await page.waitForLoadState('networkidle');
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,main:!!document.querySelector('main'),text:document.querySelector('main')?.textContent?.trim().length||0}));
   report.routes.push({path,width,...state});
   if(state.overflow||!state.main||!state.text)report.failures.push({path,width,...state});
  }
  for(const path of ['/','/login','/register','/about','/verify-email','/missing-page'])for(const width of [360,768,1280])await audit(path,width);
  async function login(email){
   await page.goto(base+'/login');await page.getByLabel('College email').fill(email);await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');
   await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByRole('region',{name:'Your first steps',exact:true}).waitFor();
  }
  await login('preview@cvr.ac.in');
  const channels=await page.getByRole('link',{name:'Open conversation'}).first().getAttribute('href');
  const paths=['/dashboard','/progress','/leaderboard','/contests',channels,channels+'/study','/study-rooms/'+'a'.repeat(24),
   '/learn','/learn/onboarding','/learn/preferences','/learn/history','/learn/nodes/00000000-0000-4000-8000-000000000001','/learn/quiz/00000000-0000-4000-8000-000000000001','/learn/missing',
   '/arcade','/arcade/daily','/arcade/numberguess','/arcade/mathamplitude','/arcade/sorting','/arcade/spotbug','/arcade/missing',
   '/interview','/interview/new','/interview/history',...['interviews','sessions','results'].map(kind=>'/interview/'+kind+'/'+'a'.repeat(24)),'/interview/missing','/verify-email'];
  for(const path of paths)for(const width of [360,768,1280])await audit(path,width);
  await page.goto(base+'/dashboard');await page.waitForLoadState('networkidle');
  const first=page.getByRole('region',{name:'Your first steps',exact:true});
  assert.equal(await page.getByRole('dialog').count(),0,'no unsolicited onboarding modal');
  await first.getByLabel('What would be useful next?').selectOption('interview');
  await first.getByRole('button',{name:'Hide first steps'}).click();await page.reload();await page.getByRole('button',{name:'Show first steps'}).click();
  assert.equal(await first.getByLabel('What would be useful next?').inputValue(),'interview');
  await first.getByRole('button',{name:'Open profile',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Open profile');
  await page.getByRole('link',{name:'Skip to content',exact:true}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'main-content');
  await first.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/checklist-desktop.png'});
  await page.setViewportSize({width:360,height:900});
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  for(let i=0;i<20;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('dialog')));}
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Menu');
  await first.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/checklist-mobile.png'});
  // Large text reflow, separate from browser UI zoom.
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'large-text horizontal overflow');
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await first.getByRole('button',{name:'Hide first steps'}).click();
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Sign out',exact:true}).click();
  await login('preview@sky.example.test');
  assert.equal(await first.getByLabel('What would be useful next?').inputValue(),'','new identity does not inherit choice/dismissal');
  await page.waitForFunction(()=>document.querySelector('.hub-name')?.textContent.includes('Sky'));
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:output+'/sky-desktop.png'});
  // Explicit failure fixtures: Core UI and checklist remain usable.
  await page.route('**/api/me/module-progress',route=>route.fulfill({status:503,json:{error:'Fixture unavailable'}}));
  await page.getByRole('button',{name:'Refresh progress'}).click();
  await page.getByText('Progress not confirmed yet',{exact:true}).first().waitFor();
  assert.equal(await first.getByText('Saved completion',{exact:true}).count(),1,'only saved profile is confirmed');
  await page.getByRole('link',{name:'Open conversation'}).first().waitFor();
  expectedCrash=true;
  await page.evaluate(async()=>{
   const {default:React}=await import('/node_modules/.vite/deps/react.js');
   const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
   // Use Vite's exact dependency URL so the fixture and boundary share Router context.
   const boundarySource=await(await fetch('/src/components/PageBoundary.jsx')).text();
   const {MemoryRouter}=await import(boundarySource.match(/from "([^"]+react-router-dom[^"]*)"/)[1]);
   const {default:Boundary}=await import('/src/components/PageBoundary.jsx');
   const host=document.createElement('div');host.id='boundary-fixture';document.body.append(host);
   window.boundaryRoot=createRoot(host);
   const Crash=()=>{throw Error('Expected boundary rehearsal');};
   window.recoverBoundary=()=>window.boundaryRoot.render(React.createElement(MemoryRouter,null,React.createElement(Boundary,{resetKey:'recovered'},React.createElement('p',null,'Recovered boundary fixture'))));
   window.boundaryRoot.render(React.createElement(MemoryRouter,null,React.createElement(Boundary,{resetKey:'failed'},React.createElement(Crash))));
  });
  await page.locator('#boundary-fixture').getByRole('button',{name:'Reload page'}).waitFor();
  await page.evaluate(()=>window.recoverBoundary());
  await page.getByText('Recovered boundary fixture',{exact:true}).waitFor();
  await page.evaluate(()=>{window.boundaryRoot.unmount();document.getElementById('boundary-fixture').remove();});
  expectedCrash=false;
  report.checks.push('optional checklist persistence and identity isolation','profile and drawer keyboard focus','skip link','200% text reflow','two Hub identities','optional-read failure isolation','reduced-motion route audit','render-error boundary and route recovery');
  fs.writeFileSync(output+'/report-'+report.browser+'.json',JSON.stringify(report,null,2));
  assert.deepEqual(report.failures,[]);
  console.log('TP10.2 parity passed:',report.routes.length,'route/viewport checks;',report.checks.join('; '));
 }finally{fs.writeFileSync(output+'/report-'+report.browser+'.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
