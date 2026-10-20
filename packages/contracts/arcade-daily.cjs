const { dayKey } = require('./day-policy.cjs');
const rulesVersion = 'daily-v1';
function definition(at) {
  const day = dayKey(at);
  const start = new Date(day + 'T00:00:00+05:30');
  const index = Math.floor(+start / 86400000);
  const gameId = index % 2 === 0 ? 'spotbug' : 'sorting';
  return { challengeId: 'daily-v1:' + day, challengeDay: day, rulesVersion, gameId,
    contentVersion: gameId === 'spotbug' ? 'bug-puzzles-v1' : 'sorting-v1',
    closesAt: new Date(+start + 86400000) };
}
module.exports = { definition, rulesVersion };
