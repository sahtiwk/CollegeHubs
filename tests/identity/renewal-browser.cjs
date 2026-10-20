// Run against scripts/p32-fixture.cjs with CORE_SESSION_ENABLED=true.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.BROWSER_BASE_URL || 'http://localhost:5182';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(), page = await context.newPage();
    let renewals = 0;
    context.on('request', request => { if (request.url().endsWith('/api/auth/refresh')) renewals++; });
    await page.goto(base + '/login');
    await page.getByLabel('College email').fill('preview@cvr.ac.in');
    await page.getByLabel('Password', { exact: true }).fill('Preview-only-32!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => !url.pathname.startsWith('/login'));
    const snapshot = p => p.evaluate(async () => { const api = await import('/src/api.js'); return { key: api.getSessionKey(), user: api.getSessionUser(), token: !!api.getAccessToken(), storage: { ...localStorage } }; });
    const original = await snapshot(page); assert.ok(original.token);
    for (const key of ['socialstream_token', 'socialstream_user', 'user']) assert.equal(original.storage[key], undefined);
    await page.reload(); await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    assert.equal((await snapshot(page)).key, original.key);
    const second = await context.newPage(); await second.goto(base + '/dashboard');
    await second.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    const before = renewals;
    await Promise.all([page, second].map(p => p.evaluate(async () => { const api = await import('/src/api.js'); await Promise.all(Array.from({ length: 8 }, () => api.renewSession(true))); })));
    assert.equal(renewals - before, 2, 'one renewal per tab, serialized through browser lock');
    assert.equal((await snapshot(page)).key, original.key);
    const channel = await page.evaluate(async () => { const { default: api, getSessionUser } = await import('/src/api.js'); const { data } = await api.get('/hubs/' + getSessionUser().hubId + '/channels'); return data; });
    const channelId = channel.items?.[0]?._id;
    assert.ok(channelId, JSON.stringify(channel));
    await page.goto(base + '/channels/' + channelId);
    const text = page.getByRole('textbox', { name: 'Message', exact: true });
    await text.fill('Recover this private draft after sign-in');
    await page.evaluate(async () => { const api = await import('/src/api.js'); await api.renewSession(true); });
    assert.equal(await text.inputValue(), 'Recover this private draft after sign-in');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(/login/);
    await second.waitForURL(/login/);
    assert.equal((await snapshot(second)).token, false);
    await page.getByLabel('College email').fill('preview@cvr.ac.in');
    await page.getByLabel('Password', { exact: true }).fill('Preview-only-32!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => !url.pathname.startsWith('/login'));
    await page.goto(base + '/channels/' + channelId);
    assert.equal(await text.inputValue(), 'Recover this private draft after sign-in');
    // A 401 write renews authority but never silently replays a mutation.
    const attempts = [];
    await page.route('**/api/channels/' + channelId + '/messages', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 1) return route.fulfill({ status: 401, json: { error: 'Expired test access' } });
      return route.continue();
    });
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await page.getByRole('button', { name: 'Retry same message', exact: true }).waitFor();
    assert.equal(attempts.length, 1);
    await page.getByRole('button', { name: 'Retry same message', exact: true }).click();
    await page.getByText('Saved to your channel.', { exact: true }).waitFor();
    assert.deepEqual(attempts[1], attempts[0]);

    const peerContext = await browser.newContext(), peer = await peerContext.newPage();
    await peer.goto(base + '/login');
    await peer.evaluate(async () => { await (await import('/src/api.js')).signIn('/auth/login', { email: 'peer@cvr.ac.in', password: 'Preview-only-32!' }); });
    const room = await page.evaluate(async channelId => {
      const { default: api } = await import('/src/api.js');
      const { data: problems } = await api.get('/study-rooms/problems');
      return (await api.post('/study-rooms', { channelId, problemId: problems.items[0]._id, durationMinutes: 5, clientRoomId: crypto.randomUUID() })).data;
    }, channelId);
    const roomId = room.room._id;
    await peer.evaluate(async id => { await (await import('/src/api.js')).default.post('/study-rooms/' + id + '/join', {}); }, roomId);
    await page.evaluate(async id => { await (await import('/src/api.js')).default.post('/study-rooms/' + id + '/start', {}); }, roomId);
    await page.goto(base + '/study-rooms/' + roomId);
    const source = page.getByRole('textbox', { name: 'Your solution', exact: true });
    await source.fill('const retained = 22;');
    await page.evaluate(async () => { await (await import('/src/api.js')).renewSession(true); });
    assert.equal(await source.inputValue(), 'const retained = 22;');
    const saves = [];
    await page.route('**/api/study-rooms/' + roomId + '/draft', async route => {
      saves.push(route.request().postDataJSON());
      if (saves.length === 1) return route.fulfill({ status: 401, json: { error: 'Expired test access' } });
      return route.continue();
    });
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByRole('button', { name: 'Retry same save', exact: true }).waitFor();
    assert.equal(saves.length, 1);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(/login/);
    await page.getByLabel('College email').fill('preview@cvr.ac.in');
    await page.getByLabel('Password', { exact: true }).fill('Preview-only-32!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => !url.pathname.startsWith('/login'));
    await page.goto(base + '/study-rooms/' + roomId);
    assert.equal(await source.inputValue(), 'const retained = 22;');
    await page.getByRole('button', { name: 'Retry same save', exact: true }).click();
    await page.getByText('Saved revision 1.', { exact: true }).waitFor();
    assert.deepEqual(saves[1], saves[0]);
    // Core token renewal must not abort an in-flight module handoff.
    const moduleResult = await page.evaluate(async () => {
      const api = await import('/src/api.js');
      const arcade = await import('/src/features/arcade/api.ts');
      const user = api.getSessionUser();
      const [session] = await Promise.all([arcade.ensureArcadeSession(user), api.renewSession(true)]);
      return { id: session.userId, expected: user._id };
    });
    assert.equal(moduleResult.id, moduleResult.expected);
    // Late optional data from the previous account must never reach its caller.
    let release, started;
    const began = new Promise(resolve => { started = resolve; });
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/api/me/module-progress', async route => { started(); await held; await route.fulfill({ status: 200, json: { items: [{ private: 'old-account' }] } }); });
    const late = page.evaluate(async () => {
      try { await (await import('/src/api.js')).default.get('/me/module-progress'); return 'leaked'; }
      catch { return 'discarded'; }
    });
    await began;
    await page.evaluate(async () => { await (await import('/src/api.js')).signIn('/auth/login', { email: 'peer@cvr.ac.in', password: 'Preview-only-32!' }); });
    release(); assert.equal(await late, 'discarded');
    await page.unroute('**/api/me/module-progress');
    await page.goto(base + '/channels/' + channelId);
    assert.equal(await text.inputValue(), '', 'another account cannot restore the previous account draft');
    await peerContext.close();
    console.log('PASS: memory-only bootstrap, two-tab renewal, retained message draft, cross-tab logout and reauthentication');
    console.log('PASS: message retry identity and Study revision/text survive renewal and reauthentication; writes are not auto-replayed');
    console.log('PASS: module handoff survives renewal; old-account optional responses and drafts are isolated');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
