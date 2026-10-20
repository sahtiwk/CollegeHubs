const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({reducedMotion:'reduce'}),requests=[],errors=[];
 page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5195/');
 await page.getByRole('heading',{level:1}).waitFor();
 for(const width of [360,768,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:'.local/tp32/landing-'+width+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByRole('tab',{name:'Channels',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Study',exact:true}).getAttribute('aria-selected'),'true');
 await page.getByRole('button',{name:'Compare two sample approaches'}).click();await page.getByText('Keep the largest so far',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:/Searching/}).click();await page.getByText('Find a value by checking items one at a time, then compare faster approaches.').waitFor();
 await page.getByRole('tab',{name:'Interview',exact:true}).click();await page.getByLabel('Try a few opening words').fill('Private local sample');await page.getByRole('button',{name:'Show reflection prompts'}).click();
 await page.getByRole('tab',{name:'Arcade',exact:true}).click();for(const pair of ['7 & 2','7 & 5','7 & 1','5 & 1','2 & 1'])await page.getByRole('button',{name:'Swap '+pair,exact:true}).click();await page.getByText('In order. Nicely reasoned.').waitFor();
 await page.getByRole('tab',{name:'Interview',exact:true}).click();assert.equal(await page.getByLabel('Try a few opening words').inputValue(),'');
 assert.equal(await page.getByRole('button',{name:'Try optional background'}).isDisabled(),true);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 await page.getByRole('tab',{name:'Learn',exact:true}).click();assert.equal(await page.getByRole('link',{name:'Start learning'}).getAttribute('href'),'/register?returnTo=%2Flearn');
 await page.evaluate(()=>localStorage.setItem('ch_session_boundary','in:sample-hint'));await page.reload();assert.equal(await page.getByRole('link',{name:'Continue',exact:true}).getAttribute('href'),'/dashboard');assert.deepEqual(requests,[]);
 await page.goto('http://127.0.0.1:5195/not-a-real-page');await page.getByRole('heading',{name:'This page isn’t here.'}).waitFor();assert.deepEqual(requests,[]);
 await page.route('**/api/**',route=>route.fulfill({status:401,json:{error:'Authentication required'}}));
 await page.goto('http://127.0.0.1:5195/learn');await page.waitForURL('**/login?returnTo=%2Flearn');
 await page.getByRole('link',{name:'Create an account',exact:true}).click();assert.ok(page.url().includes('returnTo=%2Flearn'));
 await page.goto('http://127.0.0.1:5195/');await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await page.getByRole('button',{name:'Try optional background'}).click();await page.locator('[data-effect]').waitFor();
 assert.equal(await page.getByRole('heading',{level:1}).isVisible(),true);
 console.log('PASS landing: 360/768/1280 layouts, five previews, keyboard tabs, reduced motion, intent links, returning entry, unknown route, zero API requests');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
