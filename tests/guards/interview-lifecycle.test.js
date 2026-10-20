const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {pageQuery}=require('../../services/interview/src/services/historyPage');
test('TP9.2 history cursors reject malformed, oversized and unknown query fields',()=>{
 for(const query of [{cursor:'x'},{cursor:'x'.repeat(161)},{cursor:[]},{userId:'foreign'},{cursor:Buffer.from(JSON.stringify(['bad','a'.repeat(24)])).toString('base64url')}])assert.throws(()=>pageQuery(query),{code:'INVALID_CURSOR'});
});
test('TP9.2 expiry, deletion during generation, report preservation and owned cursor pagination',{skip:!process.env.GUARD_MONGO_URI},async()=>{
 const mongoose=require('mongoose');mongoose.set('autoCreate',false).set('autoIndex',false);
 const connection=await mongoose.createConnection(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_tp92_'+randomUUID().replaceAll('-','')}).asPromise();
 try{
  const models=Object.fromEntries(['Interview','Resume','Session','AiControl'].map(n=>[n,require('../../services/interview/src/models/'+n+(n==='AiControl'?'':'.model'))(connection)]));
  for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
  const scope={userId:'a'.repeat(24),hubId:'b'.repeat(24)},identity={user_id:scope.userId,hub_id:scope.hubId,principal:{exp:Math.floor(Date.now()/1000)+3600,jti:randomUUID()}};
  const {resumeRetention,liveResume}=require('../../services/interview/src/services/resumeRetention'),retention=resumeRetention(connection,models);
  let release,started;const began=new Promise(r=>started=r);
  const ai={provider:'groq',model:'openai/gpt-oss-20b',rewardable:true,requireReady(){},generate:()=>{started();return new Promise(r=>release=r);}};
  const service=require('../../services/interview/src/services/practiceService').createPracticeService(connection,models,ai,{trigger(){}});
  const resume=await models.Resume.create({...scope,contentHash:'synthetic',extractedText:'Synthetic resume'});
  const draft=await service.create(identity,{resumeId:resume.id,jobTitle:'Test role',jobDescription:'Synthetic role',questionTypes:['technical']});
  const pending=service.generate(identity,draft.id,{});await began;
  await retention.remove(scope,resume._id,new Date());
  release({questions:Array.from({length:5},(_,i)=>({questionText:'Explain example '+i,category:'technical',difficulty:'easy',expectedKeywords:['example']}))});
  await assert.rejects(pending,{code:'GENERATION_INTERRUPTED'});
  const saved=await models.Interview.findById(draft.id);assert.equal(saved.questions.length,0);assert.equal(saved.resumeUnavailable,true);assert.equal(await models.Resume.countDocuments(),0);
  const expiring=await models.Resume.create({...scope,contentHash:'expires-in-flight',extractedText:'Synthetic text'});
  const second=await service.create(identity,{resumeId:expiring.id,jobTitle:'Expiry race',jobDescription:'Synthetic role',questionTypes:['technical']});
  const expiryBegan=new Promise(r=>started=r),expiryPending=service.generate(identity,second.id,{});await expiryBegan;
  await models.Resume.updateOne({_id:expiring._id},{$set:{expiresAt:new Date(0)}});
  release({questions:Array.from({length:5},(_,i)=>({questionText:'Explain expiry example '+i,category:'technical',difficulty:'easy',expectedKeywords:['example']}))});
  await assert.rejects(expiryPending,{code:'RESUME_UNAVAILABLE'});
  assert.equal((await models.Interview.findById(second.id)).questions.length,0);assert.equal(await retention.cleanup(),1);
  const expired=await models.Resume.create({...scope,contentHash:'expired',extractedText:'Expired private text',expiresAt:new Date(0)});
  await assert.rejects(service.create(identity,{resumeId:expired.id,jobTitle:'No',jobDescription:'Expired resume',questionTypes:['technical']}),{code:'NOT_FOUND'});
  // Legacy rows without expiry use createdAt + 30 days, never a new read-time expiry.
  const oldId=new mongoose.Types.ObjectId();await models.Resume.collection.insertOne({...scope,_id:oldId,contentHash:'legacy',extractedText:'Legacy private text',createdAt:new Date(0)});
  assert.equal(await models.Resume.countDocuments({...scope,...liveResume()}),0);
  const report={score:0,summary:'A genuine zero score',answers:[],rubricVersion:'v1'};
  await models.Session.create({...scope,interviewId:new mongoose.Types.ObjectId(),status:'completed',report,event:{eventId:'immutable'},deliveryStatus:'settled'});
  assert.equal(await retention.cleanup(),2);assert.equal(await models.Resume.countDocuments(),0);
  const retained=await models.Session.findOne(scope);assert.equal(retained.report.score,0);assert.equal(retained.event.eventId,'immutable');
  const createdAt=new Date('2026-01-01T00:00:00Z');
  await models.Session.insertMany(Array.from({length:45},(_,i)=>({...scope,interviewId:new mongoose.Types.ObjectId(),createdAt,jobTitle:'Saved '+i})));
  await models.Session.create({...scope,userId:'c'.repeat(24),interviewId:new mongoose.Types.ObjectId(),jobTitle:'Foreign'});
  let cursor,ids=[];do{const page=await service.history(identity,cursor?{cursor}:{});assert.ok(page.items.length<=20);assert.ok(page.items.every(r=>r.jobTitle!=='Foreign'));ids.push(...page.items.map(r=>r.id));cursor=page.nextCursor;}while(cursor);
  assert.equal(ids.length,46);assert.equal(new Set(ids).size,46);
  assert.equal((await service.history({...identity,hub_id:'d'.repeat(24)},{})).items.length,0);
 }finally{await connection.dropDatabase();await connection.close();}
});
