// Real disposable login/link/unlink. Verified/statistics views below are explicitly UI-only fixtures.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(15000);
  const base=process.env.BROWSER_BASE_URL||'http://localhost:5182';await page.goto(base+'/progress');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/progress');
  const section=page.getByRole('region',{name:'External progress'});await section.getByLabel('Codeforces handle').fill('fixture-owner');await section.getByRole('button',{name:'Link for ownership review'}).click();await section.getByText('Awaiting ownership review',{exact:false}).waitFor();
  assert.match(await section.locator('code').innerText(),/^ch-[A-Za-z0-9_-]{22}$/);assert.equal(await section.getByRole('button',{name:'Update Codeforces statistics'}).count(),0);await section.getByText('Recorded external Aura: 0.',{exact:false}).waitFor();
  await page.screenshot({path:'docs/screenshots/tp6.2-ownership-desktop.png',fullPage:true});
  await section.getByRole('button',{name:'Unlink Codeforces'}).click();await section.getByRole('button',{name:'Link for ownership review'}).waitFor();assert.equal(await section.locator('code').count(),0);
  const capabilities=[{provider:'codeforces',name:'Codeforces',enabled:true,bonusEnabled:false,reason:'Ownership required.'},{provider:'leetcode',name:'LeetCode',enabled:false,reason:'Permitted API access unavailable.'},{provider:'clist',name:'Clist',enabled:false,reason:'API credentials unavailable.'}];
  await page.route('**/api/me/external-accounts',r=>r.fulfill({json:{capabilities,items:[{id:'a'.repeat(24),provider:'codeforces',handle:'fixture-owner',status:'verified',bindingVersion:1,appliedBonus:0,lastError:'PROVIDER_UNAVAILABLE',snapshot:{rating:1234,fetchedAt:'2026-10-01T00:00:00Z',sourceUrl:'https://codeforces.com/profile/fixture-owner',stale:true}}]}}));
  await section.getByRole('button',{name:'Refresh linked accounts'}).click();await section.getByText('Stale — showing the last saved snapshot.',{exact:false}).waitFor();await section.getByText('1234',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});await section.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await section.screenshot({path:'docs/screenshots/tp6.2-external-mobile.png'});
  console.log('PASS: real pending link/proof/zero bonus/unlink; UI fixtures for verified stale statistics and disabled providers; mobile overflow');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
