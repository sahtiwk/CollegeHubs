const { createHash } = require('node:crypto');
const { definition } = require('@collegehubs/contracts/arcade-daily.cjs');
function published(at) {
  const info = definition(at);
  const seed = createHash('sha256').update(info.challengeId + ':' + info.contentVersion).digest('hex');
  let sequence = 0;
  const digest = () => createHash('sha256').update(seed + ':' + sequence++).digest();
  const integer = (min, max) => { if (max === undefined) { max = min; min = 0; } return min + digest().readUInt32BE(0) % (max - min); };
  const id = () => digest().toString('hex').slice(0, 32);
  const challenge = info.gameId === 'spotbug' ? require('../validators/spotBug').challenge(integer, id) : require('../validators/sorting').challenge(integer);
  return { ...info, seed, challenge };
}
async function publish(Model, at) {
  const info = definition(at);
  const old = await Model.findOne({ challengeDay: info.challengeDay }).select('+seed +challenge');
  if (old) return old;
  try { return await Model.create(published(at)); }
  catch (error) { if (error.code !== 11000) throw error; return Model.findOne({ challengeDay: info.challengeDay }).select('+seed +challenge'); }
}
module.exports = { published, publish };
