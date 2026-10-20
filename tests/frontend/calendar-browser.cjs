// Disposable fixture only. Reviewed provenance below is synthetic test evidence, not a real college notice.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const uri=new URL(process.env.GUARD_MONGO_URI);assert.ok(['127.0.0.1','localhost'].includes(uri.hostname));assert.equal(uri.pathname,'/collegehubs_demo_p32');
 const mongoose=require('mongoose');mongoose.set('autoCreate',false).set('autoIndex',false);await mongoose.connect(uri.toString());
 try{await require('../../services/core/services/scheduleService').seedCalendar([
  {key:'tp61-reviewed-fixture',hubSlug:'cvr',channelSlugs:['dsa'],title:'Synthetic reviewed event — UI test',startsAt:'2026-10-12T12:00:00Z',endsAt:'2026-10-12T13:00:00Z',provenance:'official_reviewed',sourceUrl:'https://example.test/academic-notice',sourceRef:'Synthetic circular 01 · test evidence only',version:1,timezone:'Asia/Kolkata',reviewedAt:'2026-10-01T00:00:00Z'},
  ...Array.from({length:25},(_,i)=>({key:'tp61-page-fixture-'+i,hubSlug:'cvr',channelSlugs:['dsa'],title:'Sample pagination fixture '+i,startsAt:'2026-10-20T10:00:00Z',endsAt:'2026-10-20T11:00:00Z',provenance:'seeded_fixture'}))
 ]);}finally{await mongoose.disconnect();}
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
  const base=process.env.BROWSER_BASE_URL||'http://localhost:5182';await page.goto(base+'/contests');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/contests');
  const calendar=page.getByRole('region',{name:'Academic calendar',exact:true});
  await calendar.getByLabel('Calendar month').fill('2026-10');await calendar.getByText('Synthetic reviewed event — UI test',{exact:true}).waitFor();
  await calendar.getByRole('button',{name:'Load more events'}).click();await calendar.getByText('Sample pagination fixture 24',{exact:true}).waitFor();assert.equal(await calendar.locator('.schedule-events>li').count(),27);
  await calendar.getByRole('button',{name:'Calendar',exact:true}).click();await calendar.getByRole('button',{name:'2026-10-12, 2 loaded events',exact:true}).click();assert.equal(await calendar.locator('.schedule-events>li').count(),2);
  const downloadPromise=page.waitForEvent('download');await calendar.getByRole('button',{name:'Download month (.ics)'}).click();const download=await downloadPromise;fs.mkdirSync('.local',{recursive:true});await download.saveAs('.local/tp61-calendar.ics');
  const ICAL=(await import('ical.js')).default;const events=new ICAL.Component(ICAL.parse(fs.readFileSync('.local/tp61-calendar.ics','utf8'))).getAllSubcomponents('vevent');assert.equal(events.length,27);
  await page.screenshot({path:'docs/screenshots/tp6.1-calendar-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'docs/screenshots/tp6.1-calendar-mobile.png',fullPage:true});
  await calendar.getByLabel('Calendar month').fill('2026-11');await calendar.getByText('No events in this month.',{exact:false}).waitFor();assert.equal(await calendar.locator('.schedule-events>li').count(),0);
  await calendar.getByLabel('Calendar month').fill('2026-10');await calendar.getByText('Synthetic reviewed event — UI test',{exact:true}).waitFor();
  await page.route('**/api/hubs/*/calendar?**',r=>r.fulfill({status:503,json:{error:{message:'Fixture outage'}}}));await calendar.getByRole('button',{name:'Refresh calendar'}).click();await calendar.getByRole('alert').waitFor();await calendar.getByText('Synthetic reviewed event — UI test',{exact:true}).waitFor();
  console.log('PASS: real reviewed-fixture import, pagination, day filtering, ICS download/parser import, month isolation, mobile layout, last-good outage view');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
