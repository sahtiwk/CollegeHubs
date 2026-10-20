// Disposable fixture only: read private test answers outside the browser; never ship them.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  const connection = await mongoose.createConnection(process.env.GUARD_MONGO_URI, { dbName: 'collegehubs_demo_arcade' }).asPromise();
  const core = connection.useDb('collegehubs_demo_p32');
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://localhost:5182/arcade/spotbug');
    await page.getByLabel('College email').fill('preview@cvr.ac.in');
    await page.getByLabel('Password', { exact: true }).fill('Preview-only-32!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Start Spot the Bug', exact: true }).click();
    await page.waitForURL(/\/arcade\/spotbug\/[a-f0-9]{24}$/);
    const id = new mongoose.Types.ObjectId(page.url().split('/').pop());
    const saved = await connection.collection('gamesessions').findOne({ _id: id });
    for (const [index, q] of saved.challenge.questions.entries()) {
      const option = page.getByRole('radio', { name: q.choices.find(c => c.id === q.answer).text, exact: true });
      await option.focus(); await page.keyboard.press('Space');
      const submit = page.getByRole('button', { name: 'Submit choice', exact: true });
      await submit.focus(); await page.keyboard.press('Enter');
      await page.getByText(`Question ${index + 1}: Correct.`, { exact: true }).waitFor();
      if (index === 1) { await page.reload(); await page.getByText('Question 2: Correct.', { exact: true }).waitFor(); }
    }
    await page.getByRole('heading', { name: 'Bugs spotted!' }).waitFor();
    await page.getByText('Result saved; Aura pending. Reload later to check the receipt.', { exact: true }).waitFor();
    for (let i = 0; i < 20; i++) {
      const doc = await connection.collection('gamesessions').findOne({ _id: id });
      if (doc.deliveryStatus === 'settled') break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    await page.getByRole('button', { name: 'Reload saved game' }).click();
    await page.getByText('Aura recorded: +5 (awarded).', { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const final = await connection.collection('gamesessions').findOne({ _id: id });
    const ledger = await core.collection('auraevents').findOne({ eventId: final.event.eventId });
    assert.equal(ledger.awardedAura, 5); assert.equal(ledger.ruleVersion, 'arcade-v4-daily-v1');
    assert.equal(await core.collection('auraevents').countDocuments({ eventId: final.event.eventId }), 1);
    await page.screenshot({ path: '.local/tp71-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('heading', { name: 'Bugs spotted!' }).waitFor();
    await page.getByText('Aura recorded: +5 (awarded).', { exact: true }).waitFor();
    await page.screenshot({ path: '.local/tp71-desktop.png', fullPage: true });
    console.log('TP7.1 mobile keyboard, reload, pending and real Core +5 receipt passed.');
  } finally { await browser.close(); await connection.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
