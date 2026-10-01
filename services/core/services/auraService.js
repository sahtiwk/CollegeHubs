// Legacy provider-derived rewards are retired. Core ledger scoring is a later phase.
// Keep explicit failures for any old caller; never return invented zero stats or write a balance.
async function unavailable() {
  throw Object.assign(new Error('External statistics and Aura refresh are unavailable'), {
    code: 'EXTERNAL_STATS_UNAVAILABLE', status: 503,
  });
}

module.exports = {
  fetchLeetCodeStats: unavailable,
  fetchCodeforcesStats: unavailable,
  fetchGitHubStats: unavailable,
  updateUserAura: unavailable,
};
