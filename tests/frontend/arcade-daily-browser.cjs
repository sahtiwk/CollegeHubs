// Local disposable fixture only. Private answers stay in this Node test harness.
const assert = require('node:assert/strict'), mongoose = require('mongoose');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  const db = await mongoose.createConnection(process.env.GUARD_MONGO_URI, { dbName: 'collegehubs_demo_arcade' }).asPromise();
  const core = db.useDb('collegehubs_demo_p32'), games = db.collection('gamesessions');
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}), page=await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto('http://localhost:5182/arcade');await page.getByLabel('College email').fill('preview@cvr.ac.in');await page.getByLabel('Password',{exact:true}).fill('Preview-only-32!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('link',{name:'Explore today’s challenge'}).waitFor();
    assert.equal(await page.locator('.arcade-catalogue > article').count(),4);
    assert.equal(await page.getByText('Snake · Unavailable',{exact:true}).isVisible(),false);
    await page.screenshot({path:'.local/tp72-catalogue-mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:900});
    await page.getByRole('link',{name:'Explore today’s challenge'}).waitFor();
    await page.screenshot({path:'.local/tp72-catalogue-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('link',{name:'Explore today’s challenge'}).click();
    await page.getByRole('button',{name:'Start daily challenge',exact:true}).click();
    await page.waitForURL(/\/daily\/[a-f0-9]{24}$/);
    const dailyUrl=page.url(), dailyId=new mongoose.Types.ObjectId(dailyUrl.split('/').pop());
    const tab=await context.newPage();await tab.goto('http://localhost:5182/arcade/daily');await tab.getByRole('link',{name:'Open your daily attempt'}).click();await tab.waitForURL(dailyUrl);await tab.close();
    async function solve() {
      const id=new mongoose.Types.ObjectId(page.url().split('/').pop());
      for(let i=0;i<50;i++) {
        const game=await games.findOne({_id:id});if(game.status!=='active')return game;
        await page.getByRole('button',{name:'Reload saved game'}).waitFor();
        if(game.gameId==='spotbug') {
          const q=game.challenge.questions[game.actions.length];const option=page.getByRole('radio',{name:q.choices.find(c=>c.id===q.answer).text,exact:true});await option.focus();await page.keyboard.press('Space');
          await page.getByRole('button',{name:'Submit choice',exact:true}).click();
          await page.getByText(`Question ${game.actions.length+1}: Correct.`,{exact:true}).waitFor();
        } else if(game.gameId==='sorting') {
          const s=game.sortingState;
          if(s.traceComplete){await page.getByRole('radio',{name:'O(n²) - quadratic',exact:true}).check();await page.getByRole('button',{name:'Check complexity'}).click();}
          else await page.getByRole('button',{name:s.needsSwap?'Swap highlighted pair':'Compare highlighted pair',exact:true}).click();
        } else if(game.gameId==='numberguess') {
          await page.getByLabel('Your guess',{exact:true}).fill(String(game.target));await page.getByRole('button',{name:'Guess',exact:true}).click();
        } else {
          if(game.mathState.correctCount>=5){const finish=page.getByRole('button',{name:'Finish round',exact:true});await finish.waitFor();await finish.click({timeout:40000});}
          else {const q=game.challenge.questions[game.mathState.questionIndex];await page.getByLabel('Your answer',{exact:true}).fill(String(q.answer));await page.getByRole('button',{name:'Check answer',exact:true}).click();}
        }
        // Wait for persisted transition, rather than fixed animation delays.
        for(let n=0;n<100;n++){const next=await games.findOne({_id:id});if(next.actions.length>game.actions.length||next.status!=='active')break;await new Promise(r=>setTimeout(r,50));}
      }
      throw Error('Game did not finish');
    }
    await page.locator('.arcade-game fieldset').waitFor({state:'visible'}).catch(()=>{});
    await page.screenshot({path:'.local/tp72-daily-active.png',fullPage:true});
    const daily=await solve();assert.equal(daily.status,'won');assert.equal(daily.event.type,'arcade.daily_completed');
    for(let i=0;i<40;i++){const g=await games.findOne({_id:dailyId});if(g.deliveryStatus==='settled')break;await new Promise(r=>setTimeout(r,100));}
    await page.getByRole('button',{name:'Reload saved game'}).click();await page.getByText('Aura recorded: +15 (awarded).',{exact:true}).waitFor();
    await page.screenshot({path:'.local/tp72-daily-receipt.png',fullPage:true});
    assert.equal(await core.collection('auraevents').countDocuments({sourceId:String(dailyId),canonical:true}),1);
    const titles={numberguess:'NumberGuess',mathamplitude:'MathAmplitude',sorting:'Sorting Complexity',spotbug:'Spot the Bug'};
    for(const [gameId,title] of Object.entries(titles)) {
      await page.goto('http://localhost:5182/arcade/'+gameId);await page.getByRole('button',{name:'Start '+title,exact:true}).click();await page.waitForURL(new RegExp('/'+gameId+'/[a-f0-9]{24}$'));
      assert.equal((await solve()).status,'won');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const receipt=await core.collection('auraevents').findOne({eventId:daily.event.eventId});assert.equal(receipt.awardedAura,15);assert.equal(receipt.ruleVersion,'arcade-v4-daily-v1');
    assert.equal(await core.collection('dailyactivities').countDocuments({userId:new mongoose.Types.ObjectId(daily.userId)}),1);
    console.log('TP7.2: catalogue, two tabs, daily +15 receipt, all four ranked games, mobile and reduced motion passed.');
  } finally {await browser.close();await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
