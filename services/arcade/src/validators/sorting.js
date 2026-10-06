const { randomInt } = require('node:crypto');
const { fail } = require('../errors');
const { ordered } = require('./ordered');
function challenge() {
  const values = new Set(); while (values.size < 6) values.add(randomInt(1, 100));
  const array = [...values];
  if (array.every((value, i) => !i || array[i - 1] < value)) [array[0], array[1]] = [array[1], array[0]];
  return { initialArray: array };
}
function initial(array) { return { array: [...array], pass: 0, index: 0, needsSwap: false, comparisons: 0, swaps: 0, traceComplete: false }; }
function nextPair(state) {
  state.index++;
  if (state.index >= state.array.length - 1 - state.pass) { state.pass++; state.index = 0; }
  if (state.pass >= state.array.length - 1) state.traceComplete = true;
}
function transition(game, input, now) {
  if (!['compare', 'swap', 'complexity'].includes(input?.type)) throw fail(400, 'INVALID_ACTION');
  const fields = input.type === 'complexity' ? ['type', 'choice'] : ['type', 'left', 'right'];
  if (input.type !== 'complexity' && (!Number.isSafeInteger(input.left) || !Number.isSafeInteger(input.right))) throw fail(400, 'INVALID_PAIR');
  if (input.type === 'complexity' && !['linear', 'linearithmic', 'quadratic'].includes(input.choice)) throw fail(400, 'INVALID_COMPLEXITY');
  const replay = ordered(game, input, fields, 31, now); if (replay) return replay;
  const state = { ...game.sortingState, array: [...game.sortingState.array] };
  if (input.type === 'complexity') {
    if (!state.traceComplete) throw fail(409, 'TRACE_INCOMPLETE', 'Finish the comparison and swap trace first.');
    if (input.choice !== 'quadratic') throw fail(400, 'COMPLEXITY_INCORRECT', 'Reconsider how the number of comparisons grows with array size.');
    const sorted = [...game.challenge.initialArray].sort((a,b) => a-b);
    if (state.array.some((value,i) => value !== sorted[i])) throw fail(409, 'SORT_INCOMPLETE');
    return { step: { ...input, status: 'won', hint: 'correct' }, sortingState: state };
  }
  if (state.traceComplete || input.left !== state.index || input.right !== state.index + 1) throw fail(409, 'PAIR_ORDER', 'Use the highlighted adjacent pair.');
  if (input.type === 'compare') {
    if (state.needsSwap) throw fail(409, 'SWAP_REQUIRED', 'Swap the compared pair before continuing.');
    state.comparisons++; state.needsSwap = state.array[input.left] > state.array[input.right];
    if (!state.needsSwap) nextPair(state);
  } else {
    if (!state.needsSwap) throw fail(409, 'COMPARE_REQUIRED', 'Compare this pair before swapping.');
    [state.array[input.left], state.array[input.right]] = [state.array[input.right], state.array[input.left]];
    state.swaps++; state.needsSwap = false; nextPair(state);
  }
  return { step: { ...input, status: 'active', hint: input.type === 'swap' ? 'swapped' : state.needsSwap ? 'swap_required' : 'ordered' }, sortingState: state };
}
module.exports = { challenge, initial, transition };
