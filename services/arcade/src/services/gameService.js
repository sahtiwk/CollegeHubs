const { randomInt } = require('node:crypto');
const { fail, exact } = require('../errors');
const numberGuess = require('../validators/numberGuess');
const math = require('../validators/math');
const sorting = require('../validators/sorting');
const spotBug = require('../validators/spotBug');
const catalogue = require('@collegehubs/contracts/arcade-games.json');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const transactionOptions = { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 };
function createGameService(connection, Game) {
  const Daily = require("../models/DailyChallenge")(connection);
  const now = async () => (await connection.db.command({ hello: 1 })).localTime;
  const scope = row => ({ userId: row.user_id, hubId: row.hub_id });
  function dto(game, at = new Date()) {
    const deadlinePassed = +game.expiresAt <= +at;
    const result = {
      id: String(game._id), gameId: game.gameId, rulesVersion: game.rulesVersion,
      status: game.status === 'active' && deadlinePassed ? game.gameId === 'mathamplitude' ? 'awaiting_completion' : 'expired' : game.status,
      createdAt: game.createdAt, expiresAt: game.expiresAt, serverNow: at,
      actions: game.actions.map(a => Object.fromEntries(['seq','guess','hint','status','type','questionId','answer','correct','left','right','choice'].filter(key => a[key] !== undefined).map(key => [key,a[key]]))),
      daily: game.daily ? { ...game.daily, stale: game.daily.challengeDay !== require("@collegehubs/contracts/day-policy.cjs").dayKey(at) } : null,
      completedAt: game.completedAt || null, deliveryStatus: game.deliveryStatus,
      receipt: game.receipt ? { eventId: game.receipt.eventId, awardedAura: game.receipt.awardedAura, reason: game.receipt.reason, dayKey: game.receipt.dayKey } : null,
    };
    if (game.gameId === 'mathamplitude') {
      const q = game.status === 'active' && !deadlinePassed ? game.challenge?.questions[game.mathState.questionIndex] : null;
      result.math = { correctCount: game.mathState.correctCount, questionIndex: game.mathState.questionIndex,
        currentQuestion: q ? { id: q.id, num1: q.num1, num2: q.num2, operation: q.operation } : null,
        canFinish: game.status === 'active' && +at - +game.createdAt >= 30000, deadlinePassed };
    }
    if (game.gameId === 'spotbug') result.bug = spotBug.publicState(game, at);
    if (game.gameId === 'sorting') result.sorting = game.sortingState;
    return result;
  }
  async function owned(row, id, session = null) {
    if (!/^[a-f0-9]{24}$/.test(id || '')) throw fail(404, 'GAME_NOT_FOUND', 'This saved game is unavailable.');
    const game = await Game.findOne({ _id: id, ...scope(row) }).select('+target +challenge').session(session);
    if (!game) throw fail(404, 'GAME_NOT_FOUND', 'This saved game is unavailable.');
    return game;
  }
  const replayCreate = (game, input) => {
    if (game.gameId !== input.gameId) throw fail(409, 'GAME_CREATION_CONFLICT', 'This creation request already belongs to another game.');
    return dto(game);
  };
  async function create(row, input) {
    const definition = catalogue.find(game => game.id === input?.gameId && game.status === 'ranked');
    if (!exact(input, ['clientSessionId','gameId']) || !definition || !uuid.test(input.clientSessionId || '')) throw fail(400, 'INVALID_GAME');
    const existing = await Game.findOne({ ...scope(row), clientSessionId: input.clientSessionId }).select('+challenge');
    if (existing) return replayCreate(existing, input);
    if (process.env.ARCADE_GAMES_ENABLED === 'false') throw fail(503, 'ARCADE_GAMES_DISABLED', 'New games are temporarily disabled.');
    const at = await now(); if (row.principal.exp * 1000 <= +at) throw fail(401, 'ARCADE_SESSION_REQUIRED');
    if (await Game.countDocuments({ ...scope(row), status: 'active', expiresAt: { $gt: at } }) >= 5) throw fail(429, 'ACTIVE_GAME_LIMIT', 'Finish an active game or wait for its expiry.');
    let privateFields;
    if (input.gameId === 'spotbug') privateFields = { challenge: spotBug.challenge() };
    if (input.gameId === 'numberguess') privateFields = { target: randomInt(1,101) };
    if (input.gameId === 'mathamplitude') privateFields = { challenge: math.challenge(), mathState: { questionIndex: 0, correctCount: 0 } };
    if (input.gameId === 'sorting') { const challenge = sorting.challenge(); privateFields = { challenge, sortingState: sorting.initial(challenge.initialArray) }; }
    try {
      return dto(await Game.create({ ...scope(row), ...input, ...privateFields, rulesVersion: definition.rulesVersion, createdAt: at, expiresAt: new Date(+at + definition.durationSeconds * 1000) }), at);
    } catch (error) {
      if (error.code !== 11000) throw error;
      return replayCreate(await Game.findOne({ ...scope(row), clientSessionId: input.clientSessionId }).select('+challenge'), input);
    }
  }
  function seal(game, row, at) {
    game.completedAt = at;
    if (game.status !== 'won') return;
    const end = game.gameId === 'mathamplitude' ? Math.min(+at, +game.expiresAt) : +at;
    game.event = { schemaVersion: 1, eventId: `arcade:${game._id}:completed:v1`, userId: row.user_id, hubId: row.hub_id, source: 'arcade', type: 'arcade.game_completed', value: 1, occurredAt: at.toISOString(),
      metadata: { sourceId: String(game._id), accessJti: row.principal.jti, domainVersion: 'v1', gameId: game.gameId, rulesVersion: game.rulesVersion, outcome: 'success', serverDurationSeconds: Math.max(0, Math.floor((end - +game.createdAt)/1000)) } };
    if (game.daily) {
      game.event.type = 'arcade.daily_completed';
      game.event.metadata = { sourceId: String(game._id), accessJti: row.principal.jti, domainVersion: 'v1', challengeId: game.daily.challengeId, challengeDay: game.daily.challengeDay, rulesVersion: game.daily.rulesVersion, outcome: 'success', serverDurationSeconds: Math.max(0, Math.floor((+at - +game.createdAt)/1000)) };
    }
    game.deliveryStatus = 'pending';
  }
  async function action(row, id, input) {
    return connection.transaction(async session => {
      const game = await owned(row,id,session), at = await now();
      if (row.principal.exp * 1000 <= +at) throw fail(401, 'ARCADE_SESSION_REQUIRED');
      const result = game.gameId === 'numberguess' ? { step: numberGuess.transition(game,input,at) }
        : game.gameId === 'mathamplitude' ? math.transition(game,input,at) : game.gameId === 'spotbug' ? spotBug.transition(game,input,at) : sorting.transition(game,input,at);
      if (input.seq <= game.actions.length) return { transition: result.step, game: dto(game,at) };
      game.actions.push(result.step); game.status = result.step.status;
      if (result.mathState) game.mathState = result.mathState;
      if (result.sortingState) game.sortingState = result.sortingState;
      if (game.status !== 'active') seal(game,row,at);
      await game.save({ session }); return { transition: result.step, game: dto(game,at) };
    }, transactionOptions);
  }
  async function read(row,id) { return dto(await owned(row,id),await now()); }
  async function activity(row) { return { items: (await Game.find(scope(row)).sort({createdAt:-1,_id:-1}).limit(20)).map(game => dto(game)) }; }
  async function complete(row,id,input) {
    if (!exact(input,[])) throw fail(400, 'INVALID_COMPLETION');
    return connection.transaction(async session => {
      const game = await owned(row,id,session), at = await now();
      if (row.principal.exp * 1000 <= +at) throw fail(401, 'ARCADE_SESSION_REQUIRED');
      if (['won','lost'].includes(game.status)) return dto(game,at);
      if (game.gameId !== 'mathamplitude') throw fail(409, 'GAME_NOT_COMPLETE');
      game.status = math.finish(game,at); seal(game,row,at); await game.save({session}); return dto(game,at);
    }, transactionOptions);
  }
  async function daily(row) {
    const at = await now(), published = await require('./dailyChallenge').publish(Daily, at);
    const existing = await Game.findOne({ userId: row.user_id, 'daily.challengeDay': published.challengeDay }).select('+challenge');
    if (existing && existing.hubId !== row.hub_id) throw fail(409, 'DAILY_ALREADY_ATTEMPTED', 'Your daily attempt belongs to your previous college membership.');
    return { challenge: { challengeId: published.challengeId, challengeDay: published.challengeDay, rulesVersion: published.rulesVersion, contentVersion: published.contentVersion, gameId: published.gameId, closesAt: published.closesAt }, game: existing ? dto(existing, at) : null, enabled: process.env.ARCADE_GAMES_ENABLED !== 'false' };
  }
  async function createDaily(row, input) {
    if (!exact(input, ['challengeId']) || typeof input.challengeId !== 'string') throw fail(400, 'INVALID_DAILY');
    const current = await daily(row);
    if (input.challengeId !== current.challenge.challengeId) throw fail(409, 'DAILY_CHANGED', 'A new daily challenge is available. Reload to see it.');
    if (current.game) return current.game;
    if (!current.enabled) throw fail(503, 'ARCADE_GAMES_DISABLED');
    const at = await now();
    if (row.principal.exp * 1000 <= +at) throw fail(401, 'ARCADE_SESSION_REQUIRED');
    if (require('@collegehubs/contracts/arcade-daily.cjs').definition(at).challengeId !== input.challengeId) throw fail(409, 'DAILY_CHANGED');
    const published = await Daily.findOne({ challengeId: input.challengeId }).select('+challenge');
    const definition = catalogue.find(g => g.id === published.gameId);
    const privateFields = { challenge: published.challenge, ...(published.gameId === 'sorting' ? { sortingState: sorting.initial(published.challenge.initialArray) } : {}) };
    try {
      return dto(await Game.create({ ...scope(row), clientSessionId: 'daily:' + published.challengeDay, gameId: published.gameId, rulesVersion: definition.rulesVersion, ...privateFields, daily: current.challenge, createdAt: at, expiresAt: new Date(Math.min(+at + definition.durationSeconds * 1000, +published.closesAt)) }), at);
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Recover the attempted day even if midnight passed during the competing write.
      const existing = await Game.findOne({ userId: row.user_id, 'daily.challengeDay': current.challenge.challengeDay }).select('+challenge');
      if (!existing || existing.hubId !== row.hub_id) throw fail(409, 'DAILY_ALREADY_ATTEMPTED');
      return dto(existing, await now());
    }
  }
  return { create,action,read,activity,complete,owned,dto,daily,createDaily };
}
module.exports = { createGameService };
