function config(env=process.env) {
  for(const name of ['CODEFORCES_STATS_ENABLED','EXTERNAL_BONUS_ENABLED'])if(env[name]!==undefined&&!['true','false',''].includes(env[name]))throw Error('Invalid external provider feature flag');
  const codeforces=env.CODEFORCES_STATS_ENABLED==='true',bonus=codeforces&&env.EXTERNAL_BONUS_ENABLED==='true';
  if(env.EXTERNAL_BONUS_ENABLED==='true'&&!codeforces)throw Error('External bonus requires the Codeforces statistics adapter');
  return {codeforces,bonus};
}
function capabilities(){const flags=config();return [
  {provider:'codeforces',name:'Codeforces',enabled:flags.codeforces,bonusEnabled:flags.bonus,sourceUrl:'https://codeforces.com',reason:flags.codeforces?'Ownership review required before statistics refresh.':'Statistics linking is disabled by this installation. Contest schedules are independent.'},
  {provider:'leetcode',name:'LeetCode',enabled:false,bonusEnabled:false,sourceUrl:'https://leetcode.com',reason:'Permitted statistics/contest API access and ownership proof are not established. No scraping or self-reported scores.'},
  {provider:'clist',name:'Clist',enabled:false,bonusEnabled:false,sourceUrl:'https://clist.by',reason:'API credentials and free-account eligibility have not been verified. Additional contest coverage is unavailable.'}
];}
module.exports={config,capabilities};
