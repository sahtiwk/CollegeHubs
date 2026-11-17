const assert = require('node:assert/strict');
const test = require('node:test');
const practice = require('../../services/arcade/src/validators/practice');
const catalogue = require('../../packages/contracts/arcade-games.json');
const rules = require('../../services/core/config/auraRules.arcade.v5.json');
const start = Date.parse('2026-11-15T10:00:00.000Z');

function game(gameId, practiceState = practice.initial(gameId)) {
  return { gameId, practiceState, status: 'active', expiresAt: new Date(start + 600_000), actions: [] };
}
function play(round, input, offset = 0) {
  const result = practice.transition(round, { ...input, seq: round.actions.length + 1 }, new Date(start + offset));
  round.actions.push(result.step);
  round.status = result.step.status;
  round.practiceState = result.practiceState;
}
test('all ten ranked catalogue entries carry matching Aura rules with a shared cap', () => {
  const ranked = catalogue.filter(entry => entry.status === 'ranked');
  assert.equal(ranked.length, 10);
  assert.deepEqual(rules.games, Object.fromEntries(ranked.map(game => [game.id, game.rulesVersion])));
  assert.equal(rules.types['arcade.game_completed'].weight, 5);
  assert.equal(rules.types['arcade.game_completed'].sourceCap, 30);
  assert.equal(rules.types['arcade.daily_completed'].sourceCap, 30);
});

test('snake saves movement, rejects changed replays, and only wins on the fifth fruit', () => {
  const round = game('snake', { body: [40, 39, 38], fruit: 41, collected: 4 });
  const input = { type: 'move', choice: 'right' };
  play(round, input);
  assert.equal(round.status, 'won');
  assert.deepEqual(round.practiceState.body, [41, 40, 39, 38]);
  assert.equal(practice.transition(round, { ...input, seq: 1 }, new Date(start)).replay, true);
  assert.throws(() => practice.transition(round, { ...input, seq: 1, choice: 'up' }, new Date(start)), { code: 'ACTION_CONFLICT' });

  const wall = game('snake', { body: [0, 1, 2], fruit: 35, collected: 0 });
  play(wall, { type: 'move', choice: 'left' });
  assert.equal(wall.status, 'lost');
});

test('memory reveals only flipped or matched cards and six pairs qualify', () => {
  const deck = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
  const round = game('memory', { deck, open: [], matched: [], attempts: 0 });
  assert.deepEqual(practice.publicState(round).cards, Array(12).fill(null));
  play(round, { type: 'flip', cell: 0 });
  play(round, { type: 'flip', cell: 1 });
  assert.deepEqual(practice.publicState(round).open, [0, 1]);
  for (let i = 0; i < 6; i++) {
    play(round, { type: 'flip', cell: i });
    play(round, { type: 'flip', cell: i + 6 });
  }
  assert.equal(round.status, 'won');
  assert.equal(practice.publicState(round).attempts, 7);
});

test('minesweeper protects the first move, hides mines and checks flags', () => {
  const round = game('minesweeper');
  // Mongoose can omit an empty object from a freshly saved round.
  delete round.practiceState.revealed;
  assert.deepEqual(practice.publicState(round).revealed, {});
  play(round, { type: 'flag', cell: 0 });
  assert.throws(() => play(round, { type: 'reveal', cell: 0 }), { code: 'INVALID_ACTION' });
  play(round, { type: 'flag', cell: 0 });
  play(round, { type: 'reveal', cell: 0 });
  assert.equal(round.practiceState.mines.length, 6);
  assert.equal(round.practiceState.mines.includes(0), false);
  assert.deepEqual(practice.publicState(round).mines, []);
  play(round, { type: 'reveal', cell: round.practiceState.mines[0] });
  assert.equal(round.status, 'lost');
});

test('pong resolves wall bounces on the server and only five returns win', () => {
  const ball = { lane: 1, direction: -1, steps: 4 };
  const round = game('pong', { ...practice.initial('pong'), returns: 4, ball });
  play(round, { type: 'return', cell: 3 });
  assert.equal(round.status, 'won');
  assert.equal(practice.publicState(round).ball, null);
  const miss = game('pong', { ...practice.initial('pong'), misses: 2, ball });
  play(miss, { type: 'return', cell: 2 });
  assert.equal(miss.status, 'lost');
});

test('crossword crossings agree and solutions only become public when entered correctly', () => {
  for (let puzzle = 0; puzzle < 15; puzzle++) {
    const round = game('crossword');
    const [down, ...across] = round.practiceState.entries;
    assert.ok(across.every(entry => entry.word[down.column - entry.column] === down.word[entry.row]));
    assert.ok(practice.publicState(round).entries.every(entry => entry.answer === null && !('word' in entry)));
    for (const entry of [down, ...across]) play(round, { type: 'solve', questionId: entry.id, choice: entry.word });
    assert.equal(round.status, 'won');
  }
});

test('breathing enforces elapsed time and deadline with the server clock', () => {
  const round = game('breathing');
  assert.throws(() => play(round, { type: 'finish' }), { code: 'EXERCISE_INCOMPLETE' });
  play(round, { type: 'begin' });
  assert.throws(() => play(round, { type: 'finish' }, 29999), { code: 'EXERCISE_INCOMPLETE' });
  play(round, { type: 'finish' }, 30000);
  assert.equal(round.status, 'won');

  const expired = game('breathing');
  assert.throws(() => play(expired, { type: 'begin' }, 570000), { code: 'GAME_CLOSED' });
});
