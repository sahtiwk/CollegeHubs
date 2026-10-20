const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { definition } = require('../../packages/contracts/arcade-daily.cjs');
const { published } = require('../../services/arcade/src/services/dailyChallenge');
test('TP7.2 daily publication is deterministic across midnight and version boundaries', () => {
  const before = new Date('2026-10-20T18:29:59.999Z'), after = new Date(+before + 1);
  assert.equal(definition(before).challengeDay, '2026-10-20');
  assert.equal(definition(after).challengeDay, '2026-10-21');
  assert.equal(+definition(before).closesAt, +after);
  assert.notEqual(definition(before).gameId, definition(after).gameId);
  assert.deepEqual(published(before), published(new Date('2026-10-20T00:00:00Z')));
  assert.notEqual(published(before).seed, published(after).seed);
  assert.equal(definition(after).challengeId, 'daily-v1:2026-10-21');
});
test('TP7.2 two tabs share one daily attempt, ownership and expiry hold, only daily fact seals', {skip:!process.env.GUARD_MONGO_URI}, async () => {
  const mongoose = require('mongoose');
  assert.ok(['127.0.0.1','localhost'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  const dbName = 'collegehubs_demo_daily_' + randomUUID().replaceAll('-','');
  const connection = await mongoose.createConnection(process.env.GUARD_MONGO_URI,{dbName}).asPromise();
  try {
    const Game = require('../../services/arcade/src/models/GameSession')(connection);
    const Daily = require('../../services/arcade/src/models/DailyChallenge')(connection);
    await Promise.all([Game.init(),Daily.init()]);
    const service = require('../../services/arcade/src/services/gameService').createGameService(connection,Game);
    const owner = { user_id:'daily-owner',hub_id:'daily-hub',principal:{exp:Math.floor(Date.now()/1000)+900,jti:randomUUID()} };
    const state = await service.daily(owner), input = {challengeId:state.challenge.challengeId};
    assert.equal(state.challenge.seed,undefined); assert.equal(state.challenge.challenge,undefined);
    await assert.rejects(service.createDaily(owner,{challengeId:'daily-v1:2000-01-01'}),{code:'DAILY_CHANGED'});
    const [a,b] = await Promise.all([service.createDaily(owner,input),service.createDaily(owner,input)]);
    assert.equal(a.id,b.id); assert.equal(await Game.countDocuments(),1);
    await assert.rejects(service.read({...owner,user_id:'foreign'},a.id),{status:404});
    await assert.rejects(service.createDaily({...owner,hub_id:'foreign'},input),{status:409});
    await assert.rejects(service.action({...owner,hub_id:'foreign'},a.id,{}),{status:404});
    let game = a;
    while(game.status==='active') {
      const privateGame = await Game.findById(a.id).select('+challenge');
      const s = game.sorting, q = privateGame.challenge.questions?.[game.actions.length];
      const action = game.gameId==='spotbug' ? {questionId:q.id,choice:q.answer} : s.traceComplete ? {type:'complexity',choice:'quadratic'} : {type:s.needsSwap?'swap':'compare',left:s.index,right:s.index+1};
      const input = {seq:game.actions.length+1,...action};
      const results = await Promise.all([service.action(owner,a.id,input),service.action(owner,a.id,input)]);
      assert.deepEqual(results[0].transition,results[1].transition);game=results[0].game;
    }
    const final = await Game.findById(a.id);
    assert.equal(final.status,'won');assert.equal(final.event.type,'arcade.daily_completed');assert.equal(final.event.metadata.gameId,undefined);
    assert.equal(final.event.metadata.challengeDay,state.challenge.challengeDay);
    assert.equal((await service.createDaily(owner,input)).id,a.id);
    assert.equal(service.dto(final,new Date(state.challenge.closesAt)).daily.stale,true);
    const expOwner = {...owner,user_id:'expiry-owner'}, exp = await service.createDaily(expOwner,input);
    await Game.collection.updateOne({_id:new mongoose.Types.ObjectId(exp.id)},{$set:{expiresAt:new Date(0)}});
    const doc = await Game.findById(exp.id).select('+challenge');
    const action = exp.gameId==='spotbug' ? {questionId:doc.challenge.questions[0].id,choice:'a'} : {type:'compare',left:0,right:1};
    await assert.rejects(service.action(expOwner,exp.id,{seq:1,...action}),{status:409});
    assert.equal((await Game.findById(exp.id)).event,null);
    assert.equal((await service.createDaily(expOwner,input)).id,exp.id);
  } finally {if(connection.name===dbName)await connection.dropDatabase();await connection.close();}
});
