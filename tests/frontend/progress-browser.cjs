// Run against the disposable p32 fixture with CORE_SESSION_ENABLED=true.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.BROWSER_BASE_URL||'http://localhost:5182';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(15000);
  await page.goto(base+'/progress');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/progress');
  await page.getByRole('heading',{name:'Your achievements'}).waitFor();
  await page.locator('.achievement').first().waitFor();assert.equal(await page.locator('.achievement').count(),4);
  await page.evaluate(async()=>{const {default:api,getSessionUser}=await import('/src/api.js');const channels=(await api.get('/hubs/'+getSessionUser().hubId+'/channels')).data.items;await api.post('/channels/'+channels[0]._id+'/messages',{clientMessageId:crypto.randomUUID(),type:'code',language:'javascript',text:'const contribution = '+Date.now()+';'});});
  await page.getByRole('button',{name:'Refresh badges',exact:true}).click();
  await page.locator('.achievement.earned').filter({hasText:'First Contribution'}).waitFor();
  await page.getByRole('button',{name:'Refresh Aura',exact:true}).click();await page.locator('.aura-title').getByText('Seed',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Refresh history',exact:true}).click();await page.getByRole('heading',{name:'Recorded rewards'}).waitFor();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'docs/screenshots/tp5.1-progress-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'docs/screenshots/tp5.1-progress-mobile.png',fullPage:true});
  // Explicit UI-only fixtures exercise pagination and terminal zero/partial display.
  await page.route('**/api/me/aura',async route=>{const response=await route.fetch();const data=await response.json();await route.fulfill({json:{...data,pending:1}});});
  await page.getByRole('button',{name:'Refresh Aura',exact:true}).click();
  await page.getByText('1 saved study completion pending. Refresh after processing.',{exact:true}).waitFor();
  let fail=true;
  await page.route('**/api/me/aura/history?**',route=>{
   if(fail)return route.fulfill({status:503,json:{error:{message:'Fixture history outage'}}});
   const next=new URL(route.request().url()).searchParams.has('cursor');
   return route.fulfill({json:{items:[{eventId:next?'fixture-partial':'fixture-zero',type:'code.shared',awardedAura:next?2:0,dayKey:'2026-10-19',reason:next?'partial_source_cap':'source_cap'}],nextCursor:next?null:'fixture-cursor'}});
  });
  await page.getByRole('button',{name:'Refresh history',exact:true}).click();await page.getByRole('button',{name:'Retry history',exact:true}).waitFor();
  fail=false;await page.getByRole('button',{name:'Retry history',exact:true}).click();await page.getByRole('button',{name:'Older rewards',exact:true}).click();
  const history=page.locator('section').filter({has:page.getByRole('heading',{name:'Your reward history',exact:true})}).last();
  await history.getByText('+2',{exact:true}).waitFor();assert.equal(await history.getByText('+0',{exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Older rewards',exact:true}).count(),0);
  const anon=await browser.newContext();const response=await anon.request.get(base+'/api/me/aura/history');assert.equal(response.status(),401);
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Leaderboard'}).click();
  await page.getByRole('table').getByText('Seed',{exact:true}).first().waitFor();
  console.log('PASS: protected Progress return intent, real contribution badge, four criteria, canonical titles, mobile overflow, history failure/retry/pagination and zero/partial UI fixtures');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
