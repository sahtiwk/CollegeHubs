const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bug = require('../../services/arcade/src/validators/spotBug');
const bank = require('../../services/arcade/src/data/bug-puzzles.v1.json');
test('TP7.1 content validation rejects duplicate, unbounded and invalid answers', () => {
  assert.equal(bug.validateBank(bank), true);
  for (const mutate of [b => b.puzzles[1].id = b.puzzles[0].id, b => b.puzzles[0].answer = 'z', b => b.puzzles[0].code = 'x'.repeat(2001), b => b.puzzles[0].choices[1].id = 'a', b => b.review = null]) {
    const b = structuredClone(bank); mutate(b); assert.throws(() => bug.validateBank(b));
  }
});
test('TP7.1 ordered answers, expiry, forged totals, feedback boundaries and pass threshold', () => {
  for (const correctTotal of [0,3,4,5]) {
    const game = { challenge: bug.challenge(), actions: [], status: 'active', expiresAt: new Date(Date.now() + 60000) };
    assert.equal(new Set(game.challenge.questions.map(q => q.code)).size, 5);
    const initial = JSON.stringify(bug.publicState(game, new Date()));
    assert.ok(!initial.includes('explanation":') && !initial.includes('"answer"'));
    for (const q of game.challenge.questions) assert.ok(!initial.includes(q.explanation));
    for (let i = 0; i < 5; i++) {
      const q = game.challenge.questions[i], input = { seq: i + 1, questionId: q.id, choice: i < correctTotal ? q.answer : q.choices.find(c => c.id !== q.answer).id };
      assert.throws(() => bug.transition(game, { ...input, score: 5 }, new Date()), { status: 400 });
      assert.throws(() => bug.transition(game, { ...input, questionId: 'foreign' }, new Date()), { status: 400 });
      assert.throws(() => bug.transition(game, { ...input, choice: {} }, new Date()), { status: 400 });
      if (i < 4) assert.throws(() => bug.transition(game, { ...input, seq: i + 2 }, new Date()), { status: 409 });
      assert.throws(() => bug.transition(game, input, game.expiresAt), { status: 409 });
      const { step } = bug.transition(game, input, new Date()); game.actions.push(step); game.status = step.status;
      assert.deepEqual(bug.transition(game, input, game.expiresAt).step, step);
      assert.throws(() => bug.transition(game, { ...input, choice: 'z' }, new Date()), { status: 409 });
      const state = bug.publicState(game, new Date()); assert.equal(state.feedback.length, i + 1);
      assert.equal(state.feedback[i].explanation, q.explanation);
    }
    assert.equal(game.status, correctTotal >= 4 ? 'won' : 'lost');
    assert.equal(bug.publicState(game, new Date()).currentQuestion, null);
  }
});
test('TP7.1 database ownership, immutable snapshot, concurrent replay and single completion fact', { skip: !process.env.GUARD_MONGO_URI }, async () => {
  const mongoose = require('mongoose');
  const dbName = 'collegehubs_demo_spotbug_' + randomUUID().replaceAll('-', '');
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  const connection = await mongoose.createConnection(process.env.GUARD_MONGO_URI, { dbName }).asPromise();
  try {
    const Game = require('../../services/arcade/src/models/GameSession')(connection); await Game.init();
    const service = require('../../services/arcade/src/services/gameService').createGameService(connection, Game);
    const owner = { user_id: 'owner', hub_id: 'hub', principal: { exp: Math.floor(Date.now()/1000) + 600, jti: randomUUID() } };
    const input = { clientSessionId: randomUUID(), gameId: 'spotbug' }, start = await service.create(owner, input);
    assert.equal((await service.create(owner, input)).id, start.id);
    assert.equal(start.challenge, undefined); assert.equal(start.bug.currentQuestion.answer, undefined);
    for (const other of [{ ...owner, user_id: 'other' }, { ...owner, hub_id: 'other' }]) {
      await assert.rejects(service.read(other, start.id), { status: 404 });
      await assert.rejects(service.action(other, start.id, {}), { status: 404 });
    }
    const saved = await Game.findById(start.id).select('+challenge');
    await Game.updateOne({ _id: start.id }, { $set: { challenge: { passThreshold: 0 }, rulesVersion: 'numberguess-v1' } });
    assert.deepEqual((await Game.findById(start.id).select('+challenge')).challenge, saved.challenge);
    for (const [i, q] of saved.challenge.questions.entries()) {
      const action = { seq: i + 1, questionId: q.id, choice: q.answer };
      const results = await Promise.all([service.action(owner, start.id, action), service.action(owner, start.id, action)]);
      assert.deepEqual(results[0].transition, results[1].transition);
    }
    const final = await Game.findById(start.id); assert.equal(final.actions.length, 5); assert.equal(final.status, 'won'); assert.equal(final.deliveryStatus, 'pending');
    assert.equal(final.event.metadata.gameId, 'spotbug'); assert.equal(final.event.metadata.rulesVersion, 'spotbug-v1');
    const event = final.event;
    await service.complete(owner, start.id, {}); assert.deepEqual((await Game.findById(start.id)).event, event);
    assert.equal((await service.activity(owner)).items[0].bug.currentQuestion, null);
  } finally { if (connection.name === dbName) await connection.dropDatabase(); await connection.close(); }
});
