// Disposable fixture only: run via p32-fixture's study-browser command.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = 'http://localhost:5182';
(async () => {
 const uri = new URL(process.env.GUARD_MONGO_URI);
 assert.ok(['127.0.0.1','localhost'].includes(uri.hostname));
 assert.equal(uri.pathname, '/collegehubs_demo_p32');
 await mongoose.connect(uri.toString());
 const browser = await chromium.launch({headless:true});
 try {
  const hostContext = await browser.newContext({viewport:{width:1280,height:900}});
  const peerContext = await browser.newContext({viewport:{width:390,height:844}});
  // Wall-clock offsets must not alter the monotonic room timer.
  await hostContext.addInitScript(() => { const now = Date.now; Date.now = () => now() + 120000; });
  await peerContext.addInitScript(() => { const now = Date.now; Date.now = () => now() - 120000; });
  const host = await hostContext.newPage(), peer = await peerContext.newPage();
  for (const [page,email] of [[host,'preview@cvr.ac.in'],[peer,'peer@cvr.ac.in']]) {
   page.setDefaultTimeout(15000); await page.goto(base+'/login');
   await page.getByLabel('College email').fill(email);
   await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');
   await page.getByRole('button',{name:'Sign in',exact:true}).click();
   await page.getByRole('heading',{name:'Make room for your next idea.'}).waitFor();
  }
  const create = () => host.evaluate(async () => {
   const {default:api,getSessionUser} = await import('/src/api.js');
   const channels = (await api.get('/hubs/'+getSessionUser().hubId+'/channels')).data.items;
   const problems = (await api.get('/study-rooms/problems')).data.items;
   return (await api.post('/study-rooms',{channelId:channels[0]._id,problemId:problems[0]._id,durationMinutes:5,clientRoomId:crypto.randomUUID()})).data.room;
  });
  const cancelled = await create();
  await host.goto(base+'/study-rooms/'+cancelled._id);
  await host.getByRole('button',{name:'Cancel waiting room',exact:true}).click();
  await host.getByRole('heading',{name:'This circle ended before it began.'}).waitFor();
  await host.reload(); await host.getByRole('heading',{name:'This circle ended before it began.'}).waitFor();
  assert.equal(await host.getByRole('textbox',{name:'Your solution',exact:true}).count(),0);
  const room = await create(), path = '/study-rooms/'+room._id;
  await peer.evaluate(async path => { await (await import('/src/api.js')).default.post(path+'/join',{}); },path);
  await host.goto(base+path); await peer.goto(base+path);
  assert.equal(await peer.getByRole('button',{name:'Cancel waiting room'}).count(),0);
  await host.screenshot({path:'docs/screenshots/tp4.2-waiting-desktop.png',fullPage:true});
  await host.getByRole('button',{name:'Start 5-minute session',exact:true}).click();
  await peer.getByRole('button',{name:'Sync now',exact:true}).click();
  await peer.waitForFunction(() => !document.querySelector('textarea[aria-label="Your solution"]').readOnly);
  const times = await Promise.all([host,peer].map(page=>page.getByRole('timer').textContent()));
  assert.ok(times.every(time => /^0[45]:\d\d$/.test(time)),times.join(','));
  const source = 'const idea = "<script>literal</script>";\n'+'// long line '.repeat(100);
  await peer.getByRole('textbox',{name:'Your solution',exact:true}).fill(source);
  // Keep snapshot repair from acknowledging the lost response before the retry is tested.
  await peerContext.setOffline(true);
  await peer.getByRole('button',{name:'Save draft',exact:true}).click();
  await peer.getByRole('button',{name:'Retry same save',exact:true}).waitFor();
  console.log('Study browser: holding the peer offline for 30 seconds');
  await new Promise(resolve => setTimeout(resolve,30000));
  assert.equal(await peer.getByRole('textbox',{name:'Your solution',exact:true}).inputValue(),source);
  await peerContext.setOffline(false);
  await peer.getByRole('button',{name:'Retry same save',exact:true}).click();
  await peer.getByText('Saved revision 1.',{exact:true}).waitFor();
  await peer.reload();
  await peer.getByText('Saved revision 1.',{exact:true}).waitFor();
  assert.equal(await peer.getByRole('textbox',{name:'Your solution',exact:true}).inputValue(),source);
  await peer.screenshot({path:'docs/screenshots/tp4.2-editor-mobile.png',fullPage:true});
  await peer.getByRole('textbox',{name:'Your solution',exact:true}).fill(source+'\n// local-only edit');
  // Fixture-only deadline acceleration, scoped to this test's new room.
  await mongoose.connection.collection('studyrooms').updateOne({_id:new mongoose.Types.ObjectId(room._id)},{$set:{endAt:new Date(0)}});
  await peer.getByRole('button',{name:'Sync now',exact:true}).click();
  await peer.getByRole('heading',{name:'See how others thought it through.'}).waitFor();
  await peer.waitForFunction(() => document.querySelector('textarea[aria-label="Your solution"]').readOnly);
  assert.equal(await peer.getByRole('textbox',{name:'Your solution',exact:true}).inputValue(),source+'\n// local-only edit');
  await host.getByRole('button',{name:'Sync now',exact:true}).click();
  await host.getByRole('heading',{name:'See how others thought it through.'}).waitFor();
  await host.locator('.study-solution').filter({hasText:'cvr-peer'}).locator('code').waitFor();
  assert.equal(await host.locator('.study-solution').filter({hasText:'cvr-peer'}).locator('code').textContent(),source);
  assert.equal(await peer.locator('.study-solution:visible').count(),1);
  await peer.getByLabel('Solution to read').selectOption({label:'cvr-preview'});
  await peer.getByRole('textbox',{name:'Review this solution'}).fill('Try writing down the invariant before coding.');
  await peer.getByRole('button',{name:'Publish review',exact:true}).click();
  await peer.getByText('Your review is saved.',{exact:true}).waitFor();
  assert.ok(await peer.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await peer.screenshot({path:'docs/screenshots/tp4.2-review-mobile.png',fullPage:true});
  await host.screenshot({path:'docs/screenshots/tp4.2-review-desktop.png',fullPage:true});
  const rows = await mongoose.connection.collection('studysolutions').find({roomId:new mongoose.Types.ObjectId(room._id)}).toArray();
  assert.ok(rows.find(row=>row.source===source)?.sealedAt);
  console.log('PASS: HTTP cancellation, retained records, peer permissions, +/-120s clock skew, 30s offline retry/reload, expiry preserves local edits and sealed source, mobile comparison and permanent review');
 } finally { await browser.close(); await mongoose.disconnect(); }
})().catch(error => { console.error(error); process.exitCode=1; });
