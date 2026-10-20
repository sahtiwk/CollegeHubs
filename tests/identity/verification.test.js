const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
process.env.JWT_SECRET='disposable-tp11-test-secret';
process.env.ALLOWED_ORIGINS='http://127.0.0.1:5173';
process.env.NODE_ENV='test';
process.env.ENABLE_MODULES='';
delete process.env.LEGACY_MEMBERSHIP_NOTICE_UNTIL;
process.env.VERIFICATION_MAIL_MODE='capture';
test('G1/G2: mailbox possession, atomic consumption, retry budgets and retained cutover', {timeout:120000}, async t=>{
 const repl=await MongoMemoryReplSet.create({replSet:{count:1}});let server;
 try{
  process.env.MONGO_URI=repl.getUri('collegehubs_demo_identity');await mongoose.connect(process.env.MONGO_URI);
  const User=require('../../services/core/models/User'), Challenge=require('../../services/core/models/VerificationChallenge');
  const {seedColleges}=require('../../services/core/services/hubProvisioning');
  await seedColleges();await Promise.all([User.init(),Challenge.init()]);
  const {createApp}=require('../../services/core/app');server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  async function call(path,token,body){const res=await fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
  async function register(name,domain='cvr.ac.in'){const r=await call('/auth/register',null,{username:name,email:name+'@'+domain,password:'Disposable-identity-11!'});assert.equal(r.status,201);assert.equal(r.body.user.membershipStatus,'unassigned');assert.equal(r.body.user.hubId,null);return r.body;}
  async function request(account){const r=await call('/auth/verification/request',account.token,{});assert.equal(r.status,202);assert.ok(!JSON.stringify(r.body).includes('tokenHash'));const mail=JSON.parse(await require('node:fs/promises').readFile(require('node:path').resolve('.local/verification-mail',account.user._id+'.json'),'utf8')); delete mail.email; delete mail.link;assert.ok(mail.token);assert.ok(!JSON.stringify(r.body).includes(mail.token));return mail;}
  const a=await register('identity_a');assert.equal((await call('/me/hub',a.token)).status,403);
  assert.equal((await call('/me/assignment/retry',a.token,{})).body.user.hubId,null);
  assert.equal((await call('/auth/module-grants',a.token,{module:'learn',state:'x'.repeat(43),returnPath:'/learn'})).status,403);
  const mail=await request(a);const stored=await Challenge.findById(mail.challengeId).lean();assert.notEqual(stored.tokenHash,mail.token);assert.ok(!JSON.stringify(stored).includes(mail.token));
  assert.equal((await call('/auth/verification/request',a.token,{})).status,429);
  const other=await register('identity_other');assert.equal((await call('/auth/verification/consume',other.token,mail)).status,400);
  const consumed=await Promise.all(Array.from({length:6},()=>call('/auth/verification/consume',a.token,mail)));
  assert.equal(consumed.filter(r=>r.status===200).length,1);const member=consumed.find(r=>r.status===200).body;assert.equal(member.user.membershipVerified,true);assert.equal(member.user.verificationMethod,'email');assert.equal((await call('/me/hub',member.token)).status,200);assert.equal((await call('/me',a.token)).status,401);
  assert.equal((await call('/auth/verification/consume',member.token,mail)).status,400);
  const unknown=await register('identity_unknown','unknown.example.test'), unknownMail=await request(unknown);const unknownResult=await call('/auth/verification/consume',unknown.token,unknownMail);assert.equal(unknownResult.status,200);assert.equal(unknownResult.body.user.hubId,null);assert.equal(unknownResult.body.user.identity.emailVerified,true);
  const expired=await request(other);await Challenge.updateOne({_id:expired.challengeId},{$set:{expiresAt:new Date(0)}});assert.equal((await call('/auth/verification/consume',other.token,expired)).status,400);
  await User.updateOne({_id:other.user._id},{$set:{'verificationRate.lastRequestedAt':new Date(0)}});const replacement=await request(other);
  for(let i=0;i<5;i++)assert.equal((await call('/auth/verification/consume',other.token,{...replacement,token:'x'.repeat(43)})).status,400);
  assert.equal((await call('/auth/verification/consume',other.token,replacement)).status,400);assert.equal((await User.findById(other.user._id)).membershipVerified,false);
  process.env.VERIFICATION_MAIL_MODE='unavailable';const unavailable=await register('identity_unavailable');assert.equal((await call('/auth/verification/request',unavailable.token,{})).status,503);assert.equal(await Challenge.countDocuments({userId:unavailable.user._id}),0);process.env.VERIFICATION_MAIL_MODE='capture';
  await t.test('resend races, hourly budget and mail failure fail closed',async()=>{
   const account=await register('identity_rate');
   const responses=await Promise.all(Array.from({length:5},()=>call('/auth/verification/request',account.token,{})));
   assert.equal(responses.filter(r=>r.status===202).length,1);assert.equal(responses.filter(r=>r.status===429).length,4);
   const first=JSON.parse(await require('node:fs/promises').readFile(require('node:path').resolve('.local/verification-mail',account.user._id+'.json'),'utf8'));delete first.email; delete first.link;
   await User.updateOne({_id:account.user._id},{$set:{'verificationRate.lastRequestedAt':new Date(0)}});const second=await request(account);
   assert.equal((await call('/auth/verification/consume',account.token,first)).status,400);
   await User.updateOne({_id:account.user._id},{$set:{'verificationRate.lastRequestedAt':new Date(0),'verificationRate.count':5}});
   assert.equal((await call('/auth/verification/request',account.token,{})).status,429);
   const transport=require('../../services/core/services/verificationMail'), original=transport.deliver;
   transport.deliver=async()=>{throw Error('Injected delivery failure');};
   try{assert.equal((await call('/auth/verification/request',unavailable.token,{})).status,503);}finally{transport.deliver=original;}
   const failed=await Challenge.findOne({userId:unavailable.user._id});assert.equal(failed.delivery,'failed');assert.equal((await User.findById(unavailable.user._id)).membershipVerified,false);
   process.env.NODE_ENV='production';assert.equal(transport.capability().available,false);process.env.NODE_ENV='test';
   await User.updateOne({_id:account.user._id},{$set:{membershipStatus:'disabled'}});assert.equal((await call('/auth/verification/consume',account.token,second)).status,400);
  });
  await t.test('exact registry evidence and assignment rollback',async()=>{
   const Hub=require('../../services/core/models/Hub'), College=require('../../services/core/models/College');
   const count=await Hub.countDocuments();const suffix=await register('identity_suffix','sub.cvr.ac.in');const proof=await request(suffix);
   assert.equal((await call('/auth/verification/consume',suffix.token,proof)).body.user.hubId,null);assert.equal(await Hub.countDocuments(),count);
   const blocked=await register('identity_atomic'), pending=await request(blocked);
   await Hub.updateOne({_id:member.user.hubId},{$set:{status:'disabled'}});
   assert.equal((await call('/auth/verification/consume',blocked.token,pending)).status,503);
   assert.equal((await Challenge.findById(pending.challengeId)).consumedAt,null);assert.equal((await User.findById(blocked.user._id).select('+emailVerifiedAt')).emailVerifiedAt,null);
   await Hub.updateOne({_id:member.user.hubId},{$set:{status:'active'}});
   assert.equal((await call('/auth/verification/consume',blocked.token,pending)).status,200);
   const noEvidence=await register('identity_evidence'), challenge=await request(noEvidence);
   const college=await College.findOne({slug:'cvr'}), evidence=college.domains[0].evidenceRef;
   await College.updateOne({_id:college._id},{$set:{'domains.0.evidenceRef':''}});
   assert.equal((await call('/auth/verification/consume',noEvidence.token,challenge)).body.user.hubId,null);
   await College.updateOne({_id:college._id},{$set:{'domains.0.evidenceRef':evidence}});
  });
  await t.test('retained notice/cutover preserves content and revokes old authority',async()=>{
   const legacy=await User.create({username:'legacy_identity',email:'legacy_identity@cvr.ac.in',password:'Disposable-identity-11!',hubId:member.user.hubId,membershipStatus:'active',membershipVerified:false,verificationMethod:'domain-claim',membershipVersion:3});
   const db=mongoose.connection.db;await db.collection('posts').insertOne({userId:legacy._id,hubId:legacy.hubId,body:'Retained content'});const before=await db.collection('posts').findOne({userId:legacy._id});
   await db.collection('aurabalances').insertOne({userId:legacy._id,hubId:legacy.hubId,total:17});
   await db.collection('auraevents').insertOne({userId:legacy._id,hubId:legacy.hubId,eventId:'retained-identity-receipt',awardedAura:17});
   const fs=require('node:fs/promises'), path=require('node:path'), {BSON}=mongoose.mongo, snapshots=[];
   await fs.mkdir('.local/tp11',{recursive:true});
   for(const {name} of await db.listCollections().toArray()){
    const rows=await db.collection(name).find().sort({_id:1}).toArray(), file=path.resolve('.local/tp11',name+'.bson');
    await fs.writeFile(file,BSON.serialize({rows}));snapshots.push({name,file,rows,indexes:await db.collection(name).indexes()});
   }
   process.env.LEGACY_MEMBERSHIP_NOTICE_UNTIL=new Date(Date.now()+60000).toISOString();
   const noticeToken=require('../../services/core/config/auth').generateToken(legacy);
   const notice=await call('/me',noticeToken);assert.equal(notice.status,200);assert.ok(notice.body.identity.legacyAccessUntil);
   process.env.LEGACY_MEMBERSHIP_NOTICE_UNTIL=new Date(0).toISOString();assert.equal((await call('/me',noticeToken)).status,401);delete process.env.LEGACY_MEMBERSHIP_NOTICE_UNTIL;
   const {migrate}=require('../../services/core/migrations/runner');const dry=await migrate(mongoose.connection.getClient(),db.databaseName);assert.equal(dry.cohorts.reverificationRequired,1);await migrate(mongoose.connection.getClient(),db.databaseName,{dryRun:false});
   const {cutoverMembership}=require('../../services/core/services/membershipCutover');const cutoff=new Date(Date.now()+1000);const preview=await cutoverMembership({dryRun:true,cutoverAt:cutoff,now:cutoff});assert.equal(preview.eligible,1);
   const old=require('../../services/core/config/auth').generateToken(legacy);await cutoverMembership({dryRun:false,cutoverAt:cutoff,now:cutoff});const saved=await User.findById(legacy._id);assert.equal(saved.membershipStatus,'verification-pending');assert.equal(saved.membershipVersion,4);assert.equal(String(saved.hubId),String(legacy.hubId));assert.deepEqual(await db.collection('posts').findOne({_id:before._id}),before);assert.equal((await call('/me',old)).status,401);
   const login=await call('/auth/login',null,{email:legacy.email,password:'Disposable-identity-11!'});const reproof=await request(login.body);const restored=await call('/auth/verification/consume',login.body.token,reproof);assert.equal(restored.status,200);assert.equal(restored.body.user.hubId,String(legacy.hubId));assert.equal(restored.body.user.membershipVersion,5);
   assert.equal((await db.collection('aurabalances').findOne({userId:legacy._id})).total,17);
   assert.equal((await db.collection('auraevents').findOne({userId:legacy._id})).eventId,'retained-identity-receipt');
   const rollback=mongoose.connection.getClient().db('collegehubs_demo_identity_rollback');
   for(const snapshot of snapshots){
    await rollback.createCollection(snapshot.name);const {rows}=BSON.deserialize(await fs.readFile(snapshot.file));
    if(rows.length)await rollback.collection(snapshot.name).insertMany(rows);
    for(const {v,ns,...index} of snapshot.indexes.filter(i=>i.name!=='_id_'))await rollback.collection(snapshot.name).createIndex(index.key,Object.fromEntries(Object.entries(index).filter(([k])=>k!=='key')));
    assert.deepEqual(await rollback.collection(snapshot.name).find().sort({_id:1}).toArray(),snapshot.rows);
   }
   assert.equal((await rollback.collection('users').findOne({_id:legacy._id})).membershipVersion,3);
   assert.equal((await rollback.collection('aurabalances').findOne({userId:legacy._id})).total,17);
  });
 }finally{if(server)await new Promise(r=>server.close(r));await mongoose.disconnect();await repl.stop();}
});

