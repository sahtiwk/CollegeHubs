const { randomInt } = require('node:crypto');
const { fail } = require('../errors');
const { ordered } = require('./ordered');

const SIZE = 6;
const MINE_COUNT = 6;
const MOVE = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const WIDTH = 9;
const PONG_LANES = 7;
const BREATH_SECONDS = 30;
const RANGE = n => Array.from({ length: n }, (_, index) => index);
const status = (state, outcome = 'active') => ({ state, outcome });
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value < max;
const requestError = message => fail(400, 'INVALID_ACTION', message);

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const swap = randomInt(i + 1);
    [result[i], result[swap]] = [result[swap], result[i]];
  }
  return result;
}
function snakeFruit(body) {
  const free = RANGE(WIDTH * WIDTH).filter(cell => !body.includes(cell));
  return free[randomInt(free.length)];
}
function snake(state, input) {
  const [head] = state.body;
  const [dr, dc] = MOVE[input.choice];
  const row = Math.floor(head / WIDTH) + dr, column = head % WIDTH + dc;
  const next = row * WIDTH + column;
  const grows = next === state.fruit;
  const occupied = grows ? state.body : state.body.slice(0, -1);
  if (!integer(row, WIDTH) || !integer(column, WIDTH) || occupied.includes(next) || next === state.body[1]) return status(state, 'lost');
  const body = [next, ...occupied], collected = state.collected + Number(grows);
  return status({ body, collected, fruit: collected === 5 ? null : grows ? snakeFruit(body) : state.fruit }, collected === 5 ? 'won' : 'active');
}

function memory(state, input) {
  const { cell } = input;
  if (state.matched.includes(cell) || state.open.length === 1 && state.open[0] === cell) throw requestError('Choose a different face-down card.');
  if (state.open.length !== 1) return status({ ...state, open: [cell] });
  const pair = [state.open[0], cell];
  const matched = state.deck[pair[0]] === state.deck[cell] ? [...state.matched, ...pair] : state.matched;
  return status({ ...state, matched, open: pair, attempts: state.attempts + 1 }, matched.length === 12 ? 'won' : 'active');
}

function neighbours(cell) {
  const row = Math.floor(cell / SIZE), column = cell % SIZE;
  const adjacent = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if ((dr || dc) && integer(row + dr, SIZE) && integer(column + dc, SIZE)) adjacent.push((row + dr) * SIZE + column + dc);
    }
  }
  return adjacent;
}
function minesweeper(state, input) {
  const { cell } = input;
  if (Object.hasOwn(state.revealed ?? {}, cell)) throw requestError('That square is already revealed.');
  if (input.type === 'flag') {
    const flags = state.flags.includes(cell) ? state.flags.filter(flag => flag !== cell) : [...state.flags, cell];
    if (flags.length > MINE_COUNT) throw requestError('All six flags are in use.');
    return status({ ...state, flags });
  }
  if (state.flags.includes(cell)) throw requestError('Remove the flag before revealing this square.');
  const mines = state.mines ?? shuffle(RANGE(SIZE * SIZE).filter(index => index !== cell)).slice(0, MINE_COUNT);
  if (mines.includes(cell)) return status({ ...state, mines, hit: cell }, 'lost');
  const revealed = { ...state.revealed };
  const queue = [cell];
  while (queue.length) {
    const next = queue.pop();
    if (Object.hasOwn(revealed, next) || state.flags.includes(next)) continue;
    const near = neighbours(next);
    const count = near.filter(index => mines.includes(index)).length;
    revealed[next] = count;
    if (count === 0) queue.push(...near);
  }
  return status({ ...state, mines, revealed }, Object.keys(revealed).length === SIZE * SIZE - MINE_COUNT ? 'won' : 'active');
}

function serve() {
  return { lane: randomInt(PONG_LANES), direction: randomInt(2) ? 1 : -1, steps: randomInt(2, 10) };
}
function pong(state, input) {
  let { lane, direction, steps } = state.ball;
  for (let i = 0; i < steps; i++) {
    if (!integer(lane + direction, PONG_LANES)) direction *= -1;
    lane += direction;
  }
  const returned = input.cell === lane;
  const returns = state.returns + Number(returned), misses = state.misses + Number(!returned);
  return status({ ball: serve(), returns, misses, last: { lane, paddle: input.cell } }, returns === 5 ? 'won' : misses === 3 ? 'lost' : 'active');
}

const CROSSWORDS = [
  ['DATABASES', 'Collections of structured records', [
    [0, 'NODE', 'An element in a linked list or tree'],
    [2, 'BYTE', 'Eight bits'],
    [4, 'DEBUG', 'Find and fix a fault in a program'],
    [6, 'CSS', 'The language used to style web pages'],
    [8, 'JSON', 'A text format for objects and arrays'],
  ]],
  ['KEYBOARD', 'Hardware with keys for typing', [
    [0, 'STACK', 'A last-in, first-out collection'],
    [2, 'BYTE', 'Eight bits'],
    [4, 'LOOP', 'A construct that repeats instructions'],
    [6, 'ARRAY', 'An indexed collection'],
  ]],
  ['FUNCTION', 'A callable block of code', [
    [0, 'DIFF', 'A representation of changes between files'],
    [2, 'NODE', 'An element in a linked list or tree'],
    [4, 'BIT', 'A binary digit'],
    [6, 'LOOP', 'A construct that repeats instructions'],
  ]],
];
function crosswordInitial() {
  const [word, clue, rows] = CROSSWORDS[randomInt(CROSSWORDS.length)];
  const spine = Math.max(...rows.map(([row, answer]) => answer.indexOf(word[row])));
  const entries = [{ id: '1D', row: 0, column: spine, direction: 'down', word, clue }];
  rows.forEach(([row, answer, clue], index) => entries.push({
    id: (index + 1) + 'A', row, column: spine - answer.indexOf(word[row]), direction: 'across', word: answer, clue,
  }));
  return { entries, solved: [], attempts: 0, last: null };
}
function crossword(state, input) {
  const entry = state.entries.find(item => item.id === input.questionId);
  if (!entry || state.solved.includes(entry.id) || input.choice.length !== entry.word.length) throw requestError('Choose an unsolved clue and enter a word of the indicated length.');
  const correct = input.choice === entry.word;
  const solved = correct ? [...state.solved, entry.id] : state.solved;
  return status({ ...state, solved, attempts: state.attempts + 1, last: { id: entry.id, correct } }, solved.length === state.entries.length ? 'won' : 'active');
}

function breathing(state, input, now) {
  if (input.type === 'begin') {
    if (state.startedAt !== null) throw requestError('This breathing session has already started.');
    if (+now + BREATH_SECONDS * 1000 >= +state.expiresAt) throw fail(409, 'GAME_CLOSED', 'Start a new round to allow time for the full exercise.');
    return status({ ...state, startedAt: +now });
  }
  if (state.startedAt === null || +now - state.startedAt < BREATH_SECONDS * 1000) throw fail(400, 'EXERCISE_INCOMPLETE', 'Finish all three breathing cycles before submitting.');
  return status(state, 'won');
}

const games = {
  snake: {
    limit: 120, input: { move: ['choice'] }, valid: input => typeof input.choice === 'string' && Object.hasOwn(MOVE, input.choice),
    initial: () => { const body = [40, 39, 38]; return { body, collected: 0, fruit: snakeFruit(body) }; },
    play: snake, visible: state => ({ ...state, width: WIDTH }),
  },
  memory: {
    limit: 40, input: { flip: ['cell'] }, valid: input => integer(input.cell, 12),
    initial: () => ({ deck: shuffle([...RANGE(6), ...RANGE(6)]), open: [], matched: [], attempts: 0 }),
    play: memory,
    visible: ({ deck, open, matched, attempts }) => ({
      open, matched, attempts, cards: deck.map((value, cell) => open.includes(cell) || matched.includes(cell) ? value : null),
    }),
  },
  minesweeper: {
    limit: 100, input: { reveal: ['cell'], flag: ['cell'] }, valid: input => integer(input.cell, SIZE * SIZE),
    initial: () => ({ mines: null, revealed: {}, flags: [], hit: null }), play: minesweeper,
    visible: ({ mines, revealed = {}, flags, hit }) => ({ size: SIZE, mineCount: MINE_COUNT, revealed, flags, hit, mines: hit === null ? [] : mines }),
  },
  pong: {
    limit: 7, input: { return: ['cell'] }, valid: input => integer(input.cell, PONG_LANES),
    initial: () => ({ ball: serve(), returns: 0, misses: 0, last: null }), play: pong,
    visible: (state, outcome) => ({ ...state, ball: outcome === 'active' ? state.ball : null, lanes: PONG_LANES }),
  },
  crossword: {
    limit: 18, input: { solve: ['questionId', 'choice'] },
    valid: input => typeof input.questionId === 'string' && /^[1-6][AD]$/.test(input.questionId) && typeof input.choice === 'string' && /^[A-Z]{2,12}$/.test(input.choice),
    initial: crosswordInitial, play: crossword,
    visible: ({ entries, solved, attempts, last }) => ({
      entries: entries.map(({ word, ...entry }) => ({ ...entry, length: word.length, answer: solved.includes(entry.id) ? word : null })),
      attempts, last,
    }),
  },
  breathing: {
    limit: 2, input: { begin: [], finish: [] }, valid: () => true,
    initial: () => ({ startedAt: null }), play: breathing,
    visible: ({ startedAt }) => ({ startedAt, seconds: BREATH_SECONDS }),
  },
};
const hasGame = id => Object.hasOwn(games, id);
function transition(game, input, now) {
  const rule = games[game.gameId];
  const fields = typeof input?.type === 'string' && Object.hasOwn(rule.input, input.type) ? rule.input[input.type] : null;
  if (!fields || !rule.valid(input)) throw requestError('This action is invalid for the round.');
  const replay = ordered(game, input, ['type', ...fields], rule.limit, now);
  if (replay) return replay;
  const { state, outcome } = rule.play({ ...game.practiceState, ...(game.gameId === 'breathing' ? { expiresAt: game.expiresAt } : {}) }, input, now);
  return { step: { ...input, status: outcome === 'active' && input.seq === rule.limit ? 'lost' : outcome }, practiceState: state };
}
function publicState(game) {
  return games[game.gameId].visible(game.practiceState, game.status);
}
module.exports = { hasGame, initial: id => games[id].initial(), transition, publicState };
