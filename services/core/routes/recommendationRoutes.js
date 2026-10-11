const {authenticate}=require('../middleware/auth');
const {authenticateService,failure}=require('../services/moduleTokenService');
module.exports=config=>{
  const router=require('express').Router(),service=require('../services/recommendationService').createRecommendationService(require('../services/weakSkillsReadService').createWeakSkillsReader(config));
  const buckets=new Map();
  function limit(key){const now=Date.now();for(const [k,b]of buckets)if(b.until<=now)buckets.delete(k);const b=buckets.get(key)||{count:0,until:now+60000};if(b.count>=10||buckets.size>=10000&&!buckets.has(key))throw failure(429,'RECOMMENDATION_RATE_LIMIT','Wait a minute before trying again.');b.count++;buckets.set(key,b);}
  const wrap=fn=>async(req,res)=>{try{if(!config.enabled.includes('learn')||!config.enabled.includes('interview'))throw failure(503,'SUGGESTIONS_UNAVAILABLE','Suggestions unavailable.');if(Object.keys(req.query).length)throw failure(400,'INVALID_QUERY','Query overrides are not accepted.');await fn(req,res);}catch(e){res.status(e.status||503).json({error:{code:e.code||'SUGGESTIONS_UNAVAILABLE',message:e.status?e.message:'Learn suggestions are unavailable. You can continue without them.'}});}};
  router.get('/me/weak-skills',authenticate,wrap(async(req,res)=>{limit('read:'+req.auth.sub);res.json(await service.suggestions(req.auth));}));
  router.post('/me/interview-recommendation',authenticate,wrap(async(req,res)=>{if(req.get('Origin')!==config.origin)throw failure(403,'ORIGIN_FORBIDDEN','Origin not allowed.');limit('issue:'+req.auth.sub);res.status(201).json(await service.issue(req.auth,req.body));}));
  router.post('/auth/interview-recommendations/consume',wrap(async(req,res)=>{if(req.get('Origin')||req.get('Cookie'))throw failure(403,'SERVICE_ONLY','Server request required.');const credential=await authenticateService(req.get('Authorization'));limit('consume:'+credential.keyId);res.json(await service.consume(credential,req.body));}));
  return router;
};
