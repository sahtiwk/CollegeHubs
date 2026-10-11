const express=require('express');const {fail}=require('./errors');
function createApp({connection,models,config,fetcher=fetch}){
  const app=express(); const store=require('./auth/sessionService').createSessionStore(models,config,fetcher);
  const games=require('./services/gameService').createGameService(connection,models.GameSession);const events=require('./services/coreEvents').createCoreEvents(models.GameSession,config,fetcher);
  app.use(express.json({limit:'16kb'}));app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.get('/health/live',(_req,res)=>res.json({status:'live'}));
  const ready=async(_req,res)=>{try{if(connection.readyState!==1)throw Error();await connection.db.command({ping:1},{maxTimeMS:2000});res.json({status:'ready'});}catch{res.status(503).json({error:{code:'ARCADE_DB_UNAVAILABLE',retryable:true}});}};
  app.get(['/health/ready','/api/arcade/health/ready'],ready);
  const buckets=new Map();
  app.use('/api/arcade',(req,res,next)=>{
    try{
      if(connection.readyState!==1)throw fail(503,'ARCADE_DB_UNAVAILABLE');
      if(Object.keys(req.query).length)throw fail(400,'QUERY_NOT_ALLOWED');
      const integration=req.path.startsWith('/integration/');
      if(req.get('Origin')&&req.get('Origin')!==config.origin)throw fail(403,'ORIGIN_FORBIDDEN');
      if(!integration&&!['GET','HEAD'].includes(req.method)&&req.get('Origin')!==config.origin)throw fail(403,'ORIGIN_FORBIDDEN');
      const now=Date.now();for(const [key,v]of buckets)if(v.until<=now)buckets.delete(key);
      const key=(req.ip||'unknown')+':'+(req.path.startsWith('/auth/')?'auth':'api'),value=buckets.get(key)||{count:0,until:now+60000};const limit=req.path.startsWith('/auth/')?60:300;
      if(value.count>=limit||buckets.size>=10000&&!buckets.has(key)){res.set('Retry-After','60');throw fail(429,'RATE_LIMIT');}value.count++;buckets.set(key,value);next();
    }catch(error){next(error);}
  });
  app.use('/api/arcade',require('./auth/sessionRoutes').sessionRoutes(config,store));
  app.get('/api/arcade/integration/summary', require('./routes/summary')(models.GameSession, config));
  app.use('/api/arcade/integration',require('./routes/integration').integrationRoutes(models.GameSession,events,config));
  app.use('/api/arcade',require('./routes/gameSessions').gameRoutes(store,games,events));
  app.use((_req,res)=>res.status(404).json({error:{code:'ARCADE_ROUTE_NOT_FOUND',retryable:false}}));
  app.use((err,req,res,next)=>{const status=err.type==='entity.too.large'?413:err.type==='entity.parse.failed'?400:err.status||503;res.status(status).json({error:{code:err.type==='entity.too.large'?'BODY_TOO_LARGE':err.type==='entity.parse.failed'?'INVALID_JSON':err.status?err.code:'ARCADE_UNAVAILABLE',message:err.status?err.message:'Arcade is temporarily unavailable. Retry shortly.',retryable:[429,503].includes(status)}});});
  return app;
}
module.exports={createApp};
