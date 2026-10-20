// Run against the isolated production design-lab build on port 5193.
// Set PLAYWRIGHT_MODULE to an installed playwright package if not in root modules.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out='.local/tp31';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const report={checks:[],performance:[]};
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(), requests=[],errors=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5193/design-lab.html');
  await page.getByRole('heading',{name:'Your campus. Your next breakthrough.'}).waitFor();
  assert.ok(!requests.some(u=>/shaderEngine|fonts.googleapis|telemetry/.test(u)));
  for(const theme of ['cvr','sky','bright']) {
   await page.locator('#fixture').selectOption(theme);
   assert.equal(await page.locator('.ui-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  }
  await page.locator('#fixture').selectOption('cvr');
  await page.getByRole('tab',{name:'02 Study'}).click();
  await page.getByRole('heading',{name:'Better, together.'}).waitFor();
  await page.getByRole('button',{name:'Preview a session'}).click();
  assert.equal(await page.locator('#sample-steps li').count(),3);
  await page.getByRole('tab',{name:'02 Study'}).focus();await page.keyboard.press('ArrowRight');
  await page.getByRole('heading',{name:'Find your own rhythm.'}).waitFor();
  assert.equal(await page.locator('#sample-steps').count(),0);
  await page.keyboard.press('Home');
  await page.getByRole('heading',{name:'Big ideas. Small steps.'}).waitFor();
  report.checks.push('sample tabs support click/arrow/Home navigation and expandable preview');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:out+'/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Open navigation'}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('dialog').isVisible(),true);
  await page.locator('#navigation-mode').focus();await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button',{name:'Close dialog'}).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#navigation-mode').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Open navigation'}).evaluate(e=>e===document.activeElement),true);
  await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('link',{name:'Learn',exact:true}).click();
  assert.equal(await page.getByRole('dialog').isVisible(),false);
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
   await page.screenshot({path:`${out}/mobile-${width}.png`,fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByLabel('Try the optional shader').check();await page.waitForTimeout(300);
  assert.equal(await page.locator('.shader-backdrop canvas').count(),0);
  assert.ok(!requests.some(u=>/shaderEngine/.test(u)));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByLabel('Turn decorative motion off').check();await page.reload();
  assert.equal(await page.getByLabel('Turn decorative motion off').isChecked(),true);
  await page.getByLabel('Try the optional shader').check();await page.waitForTimeout(300);
  assert.equal(await page.locator('.shader-backdrop canvas').count(),0);
  assert.deepEqual(errors,[]);
  report.checks.push('3 theme fixtures retain neutral surfaces','keyboard open/trap/select/Escape/return focus','navigation closes drawer','390/320px no horizontal overflow','reduced motion no GPU/import','persisted motion-off no GPU/import','static no external requests');
  await context.close();
  // Null adapter: genuine capability refusal, no GPU or import.
  const absent=await browser.newContext();await absent.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:{requestAdapter:async()=>null},configurable:true}));
  const fallback=await absent.newPage();await fallback.goto('http://127.0.0.1:5193/design-lab.html');await fallback.getByLabel('Try the optional shader').check();await fallback.evaluate(()=>scrollTo(0,0));
  await fallback.waitForFunction(()=>document.querySelector('.shader-backdrop').dataset.effect==='fallback');
  assert.equal(await fallback.locator('.shader-backdrop canvas').count(),0);report.checks.push('null adapter retains HTML/CSS fallback');await absent.close();
  // Isolated fault injection exercises wrapper lifecycle without claiming real GPU rendering.
  for(const fault of ['none','import']) {
   const ctx=await browser.newContext();
   await ctx.addInitScript(()=>{
    window.gpuCalls={pause:0,resume:0,destroy:0,deviceDestroy:0};
    Object.defineProperty(navigator,'gpu',{value:{requestAdapter:async()=>({features:[],requestDevice:async()=>({lost:new Promise(resolve=>window.loseDevice=resolve),destroy(){window.gpuCalls.deviceDestroy++;}})})},configurable:true});
   });
   await ctx.route('**/shaderEngine-*.js',route=>fault==='import'?route.abort():route.fulfill({contentType:'application/javascript',body:'export async function mountShader(){ return {getFailureReason:()=>null, pause(){window.gpuCalls.pause++},resume(){window.gpuCalls.resume++},destroy(){window.gpuCalls.destroy++}} }'}));
   const p=await ctx.newPage();await p.goto('http://127.0.0.1:5193/design-lab.html');await p.getByLabel('Try the optional shader').check();await p.evaluate(()=>scrollTo(0,0));
   await p.waitForFunction(expected=>document.querySelector('.shader-backdrop').dataset.effect===expected,fault==='import'?'fallback':'enhanced');
   if(fault==='none'){
    await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForFunction(()=>window.gpuCalls.pause>0);
    await p.evaluate(()=>scrollTo(0,0));await p.waitForFunction(()=>window.gpuCalls.resume>0);
    await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.ok((await p.evaluate(()=>window.gpuCalls.pause))>=2);
    await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'));window.loseDevice({reason:'test'});});
    await p.waitForFunction(()=>document.querySelector('.shader-backdrop').dataset.effect==='fallback');
    assert.equal(await p.locator('canvas').count(),0);assert.ok((await p.evaluate(()=>window.gpuCalls.destroy))>0);
   } else {assert.equal(await p.locator('canvas').count(),0);assert.ok((await p.evaluate(()=>window.gpuCalls.deviceDestroy))>0);}
   await ctx.close();
  }
  report.checks.push('injected import failure disposes device','injected renderer pauses offscreen/hidden and resumes','injected device loss removes canvas/disposes resources');
  // Cold-cache browser measurement; CPU/network simulation, not a physical low-end claim.
  for(const enhanced of [false,true]) {
   const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
   const p=await ctx.newPage(), network=[];p.on('request',r=>network.push(r.url()));
   await p.addInitScript(()=>{window.labMetrics={longTasks:[],lcp:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.labMetrics.longTasks.push(e.duration);}).observe({type:'longtask',buffered:true});new PerformanceObserver(l=>{window.labMetrics.lcp=l.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
   const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
   await p.goto('http://127.0.0.1:5193/design-lab.html');
   let activationMs=0;
   if(enhanced){await p.getByLabel('Try the optional shader').check();await p.evaluate(()=>scrollTo(0,0));const start=Date.now();await p.waitForFunction(()=>['enhanced','fallback'].includes(document.querySelector('.shader-backdrop').dataset.effect),{},{timeout:60000});activationMs=Date.now()-start;}
   await p.waitForTimeout(2500);
   const metrics=await p.evaluate(async()=>{const frames=[];let last=performance.now();await new Promise(resolve=>{const frame=now=>{frames.push(now-last);last=now;if(frames.length<60)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});return {...window.labMetrics,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,status:document.querySelector('.shader-backdrop').dataset.effect,canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),frameP95:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)],resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').at(-1),bytes:r.transferSize}))};});
   assert.ok(!network.some(u=>/telemetry|fonts.googleapis|shaders.com/.test(u)));
   report.performance.push({enhanced,activationMs,...metrics});
   if(enhanced && metrics.status==='enhanced'){
    await p.getByLabel('Turn decorative motion off').check();await p.waitForTimeout(100);assert.equal(await p.locator('canvas').count(),0);report.checks.push('live GPU removed on motion-off');
   }
   await ctx.close();
  }
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
