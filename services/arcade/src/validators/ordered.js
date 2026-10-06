const { fail, exact } = require('../errors');
function ordered(game, input, fields, limit, now, deadline = true) {
  if (!exact(input, ['seq', ...fields]) || !Number.isSafeInteger(input.seq) || input.seq < 1 || input.seq > limit) throw fail(400, 'INVALID_ACTION');
  const previous = game.actions.find(row => row.seq === input.seq);
  if (previous) {
    if (fields.some(key => previous[key] !== input[key])) throw fail(409, 'ACTION_CONFLICT', 'This action already has different input.');
    return { step: previous.toObject ? previous.toObject() : previous, replay: true };
  }
  if (game.status !== 'active' || deadline && +game.expiresAt <= +now) throw fail(409, 'GAME_CLOSED', 'This round has ended.');
  if (input.seq !== game.actions.length + 1) throw fail(409, 'ACTION_ORDER', 'Reload your saved round before continuing.');
  return null;
}
module.exports = { ordered };
