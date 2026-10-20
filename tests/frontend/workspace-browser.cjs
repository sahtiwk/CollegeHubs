// Run against scripts/p32-fixture.cjs with CORE_SESSION_ENABLED=true.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.BROWSER_BASE_URL || 'http://localhost:5182';
(async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  await page.route('**/api/me/module-progress**', route => route.fulfill({ status: 503, json: { error: 'Optional service offline' } }));
  await page.goto(base + '/login');
  await page.getByLabel('College email').fill('preview@cvr.ac.in');
  await page.getByLabel('Password', { exact: true }).fill('Preview-only-32!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Make room for your next idea.' }).waitFor();
  const channel = page.getByRole('link', { name: 'Open conversation' }).first();
  await channel.waitFor();
  const channelPath = await channel.getAttribute('href');
  await page.screenshot({ path: 'docs/screenshots/tp4.1-home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByRole('dialog').waitFor(); await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Edit profile');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  for(let i=0;i<15;i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog'))); }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Menu');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'docs/screenshots/tp4.1-home-mobile.png', fullPage: true });
  await page.goto(base + channelPath);
  const message = page.getByRole('textbox', { name: 'Message', exact: true });
  await message.fill('TP41 lost response ' + Date.now());
  const sent = await message.inputValue(), attempts = [];
  await page.route('**/api' + channelPath + '/messages', async route => {
   if (route.request().method() !== 'POST') return route.continue();
   attempts.push(route.request().postDataJSON());
   if(attempts.length === 1) { await route.fetch(); return route.abort('failed'); }
   return route.continue();
  });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Retry same message', exact: true }).click();
  await page.getByText('Saved to your channel.', { exact: true }).waitFor();
  assert.deepEqual(attempts[0], attempts[1]);
  const matches = await page.evaluate(async ({channelPath,sent}) => {
   const { default: api } = await import('/src/api.js');
   return (await api.get(channelPath + '/messages', {params:{q:sent}})).data.items.length;
  }, {channelPath,sent}); assert.equal(matches,1);
  await page.getByLabel('Search saved messages').fill('no-match-' + Date.now());
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText('No matching messages.', { exact: true }).waitFor();
  await page.route('**/api' + channelPath + '/messages?**', route => route.fulfill({status:503,json:{error:{message:'Search temporarily unavailable'}}}));
  await page.getByLabel('Search saved messages').fill('different search');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Retry search' }).waitFor();
  assert.equal(await page.getByText('No matching messages.', {exact:true}).count(),0);
  await page.screenshot({path:'docs/screenshots/tp4.1-channel-mobile.png',fullPage:true});
  // Mount the actual shared component, also used by SubmissionComparison.
  await page.evaluate(async () => {
   const { default: React } = await import('/node_modules/.vite/deps/react.js');
   const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
   const { default: CodeBlock } = await import('/src/components/CodeBlock.jsx');
   const host = document.createElement('section'); host.id = 'code-check'; document.querySelector('main').append(host);
   window.codeRoot = createRoot(host); window.renderCode = (text,language) => window.codeRoot.render(React.createElement(CodeBlock,{text,language}));
  });
  const samples = { javascript:'const x = "<script>alert(1)</script>";',typescript:'const x: number = 2;',python:'def foo():\n    return "<img src=x onerror=alert(1)>"',json:'{"x": "<b>"}',html:'<script>window.pwned = true</script><img src=x onerror="alert(1)">',css:'body { color: red; }',java:'class Main { int x = 2; }',cpp:'int main() { return 0; }',sql:'SELECT name FROM users WHERE id = 2;'};
  for(const [language,source] of Object.entries(samples)) { console.log('Checking',language);
   await page.evaluate(({source,language}) => window.renderCode(source,language),{source,language});
   await page.waitForFunction(source => document.querySelector('#code-check code')?.textContent === source,source);
   await page.waitForFunction(() => document.querySelector('#code-check code span'), null, {timeout:10000});
   assert.equal(await page.locator('#code-check code').textContent(),source);
  }
  assert.equal(await page.evaluate(() => window.pwned),undefined);
  assert.equal(await page.locator('#code-check script, #code-check img').count(),0);
  for(const [source,language] of [['literal <b>&\n🙂','unknown'],['x'.repeat(32769),'javascript']]) {
   await page.evaluate(({source,language}) => window.renderCode(source,language),{source,language});
   await page.waitForFunction(source => document.querySelector('#code-check code')?.textContent === source,source);
   assert.equal(await page.locator('#code-check code span').count(),0);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => { window.Worker = class { constructor() { throw new Error('Worker unavailable'); } }; window.renderCode('const fallback = "safe";','javascript'); });
  await page.waitForFunction(() => document.querySelector('#code-check code')?.textContent === 'const fallback = "safe";');
  assert.equal(await page.locator('#code-check code span').count(),0);
  console.log('PASS: optional-service failure, desktop/mobile home, profile/drawer focus, lost-response idempotent retry, literal search empty/error, nine grammars, escaping, size/worker fallback and contained scrolling');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });



