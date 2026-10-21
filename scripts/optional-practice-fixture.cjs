// Disposable local UI acceptance server; never reads deployment credentials.
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const mongoose=require('mongoose'),express=require('express'),{randomUUID}=require('node:crypto'),{spawn}=require('node:child_process');
const {hash,opaque}=require('@collegehubs/contracts/module-session.cjs');
(async()=>{
 const mongo=await MongoMemoryReplSet.create({replSet:{count:1}}),connection=await mongoose.createConnection(mongo.getUri(),{dbName:'collegehubs_demo_optional'}).asPromise();
 const models={...require('../services/interview/src/models/ModuleSession')(connection),...Object.fromEntries(['Interview','Resume','Session','AiControl'].map(n=>[n,require('../services/interview/src/models/'+n+(n==='AiControl'?'':'.model'))(connection)]))};
 for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 const scope={userId:'a'.repeat(24),hubId:'b'.repeat(24)},handle=opaque(),expires=new Date(Date.now()+3600000),questionId=randomUUID();
 await models.ModuleSession.create({sessionHash:hash(handle),user_id:scope.userId,hub_id:scope.hubId,principal:{sub:scope.userId,hubId:scope.hubId,exp:Math.floor(+expires/1000)},theme:{},expires_at:new Date(Math.floor(+expires/1000)*1000),csrfHash:hash(hash('csrf:'+handle))});
 const row=await models.Session.create({...scope,interviewId:new mongoose.Types.ObjectId(),providerId:'local',providerModel:'Qwen/Qwen2.5-1.5B-Instruct',practiceMode:true,questions:[{id:questionId,questionText:'How would you test an input validation function?',category:'technical',difficulty:'easy',expectedKeywords:['boundary']}],answers:[{questionId,answer:'I would test empty input, a valid value and the maximum length boundary.',revision:1}]});
 const origin='http://127.0.0.1:5198',app=express();
 app.get('/api/interview/test-setup',(_req,res)=>{res.cookie('ch_interview_session',handle,{httpOnly:true,sameSite:'strict',path:'/api/interview'});res.json({id:row.id,question:row.questions[0],answer:row.answers[0],csrf:hash('csrf:'+handle)});});
 app.use(require('../services/interview/src/app').createApp({connection,models,config:{origin,core:'http://127.0.0.1:1'},ai:require('../services/interview/src/services/ai.service').createAiService({env:{INTERVIEW_AI_PROVIDER:'local',LOCAL_INFERENCE_ENABLED:'true',INTERVIEW_STREAMING_ENABLED:'true'}})}));
 const server=app.listen(5199,'127.0.0.1');
 const web=spawn(process.execPath,['node_modules/vite/bin/vite.js','apps/web','--config','apps/web/vite.config.js','--host','127.0.0.1','--port','5198','--strictPort'],{cwd:process.cwd(),env:{...process.env,INTERVIEW_API_ORIGIN:'http://127.0.0.1:5199'},stdio:'inherit',windowsHide:true});
 // Keep the diagnostic entry separate from production.
 async function close(){web.kill();server.close();await connection.close();await mongo.stop();process.exit();}
 process.on('SIGINT',close);process.on('SIGTERM',close);
})().catch(e=>{console.error(e);process.exitCode=1;});
