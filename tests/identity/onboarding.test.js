const test=require('node:test'),assert=require('node:assert/strict');
const mongoose=require('mongoose'),{MongoMemoryReplSet}=require('mongodb-memory-server');
const fs=require('node:fs/promises'),path=require('node:path');
Object.assign(process.env,{JWT_SECRET:'tp12-disposable-secret',NODE_ENV:'test',ALLOWED_ORIGINS:'http://127.0.0.1:5173',ENABLE_MODULES:'',VERIFICATION_MAIL_MODE:'capture',GOOGLE_CLIENT_ID:'test-google-client'});
delete process.env.LEGACY_MEMBERSHIP_NOTICE_UNTIL;
test('G1/G2 TP1.2: explicit Google linking and atomic alternate email', {timeout:120000},async t=>{
 const repl=await MongoMemoryReplSet.create({replSet:{count:1}});let server;
 const {OAuth2Client}=require('google-auth-library'),original=OAuth2Client.prototype.verifyIdToken;let claims;
 try{
  process.env.MONGO_URI=repl.getUri('collegehubs_demo_tp12');await mongoose.connect(process.env.MONGO_URI);
  const User=require('../../services/core/models/User'),Challenge=require('../../services/core/models/VerificationChallenge'),College=require('../../services/core/models/College'),Hub=require('../../services/core/models/Hub');
  await require('../../services/core/services/hubProvisioning').seedColleges();await Promise.all([User.init(),Challenge.init()]);
  server=require('../../services/core/app').createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  async function call(route,account,body,method=body?'POST':'GET',origin='http://127.0.0.1:5173') {const r=await fetch(base+'/api'+route,{method,headers:{Origin:origin,...(account?{Authorization:'Bearer '+account.token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
  async function register(name,domain='cvr.ac.in'){const r=await call('/auth/register',null,{username:name,email:name+'@'+domain,password:'Disposable-identity-12!'});assert.equal(r.status,201);return r.data;}
  async function captured(a){const {challengeId,token}=JSON.parse(await fs.readFile(path.resolve('.local/verification-mail',a.user._id+'.json'),'utf8'));return {challengeId,token};}
  async function verify(a){assert.equal((await call('/auth/verification/request',a,{})).status,202);const r=await call('/auth/verification/consume',a,await captured(a));assert.equal(r.status,200);return r.data;}
  async function cool(a){await User.updateOne({_id:a.user._id},{$set:{'verificationRate.lastRequestedAt':new Date(0)}});}
  const account=await register('link_owner'),other=await register('link_other');
  const valid={iss:'https://accounts.google.com',aud:'test-google-client',sub:'test-subject',email:account.user.email,email_verified:true,hd:'cvr.ac.in',exp:Math.floor(Date.now()/1000)+300,iat:Math.floor(Date.now()/1000)};
  OAuth2Client.prototype.verifyIdToken=async()=>({getPayload:()=>claims});
  await t.test('same-email credential cannot merge; nonce, freshness and uniqueness enforced',async()=>{
   claims={...valid};assert.equal((await call('/google/auth',null,{credential:'synthetic'})).status,409);
   assert.equal((await call('/google/link/start',null,{})).status,401);
   assert.equal((await call('/google/link/start',account,{},'POST','https://evil.example')).status,403);
   const start=await call('/google/link/start',account,{});assert.equal(start.status,200);const nonce=start.data.nonce;
   claims={...valid,nonce:'wrong'};assert.equal((await call('/google/link',account,{credential:'synthetic',nonce})).status,401);
   claims={...valid,nonce,iat:Math.floor(Date.now()/1000)-600};assert.equal((await call('/google/link',account,{credential:'synthetic',nonce})).status,401);
   claims={...valid,nonce};const linked=await call('/google/link',account,{credential:'synthetic',nonce});assert.equal(linked.status,200);assert.equal(linked.data.user.identity.googleLinked,true);assert.equal(linked.data.user.hubId,null);assert.equal(linked.data.user.identity.emailVerified,false);
   assert.equal((await call('/google/link',linked.data,{credential:'synthetic',nonce})).status,409);
   const otherStart=await call('/google/link/start',other,{});claims={...valid,nonce:otherStart.data.nonce};assert.equal((await call('/google/link',other,{credential:'synthetic',nonce:otherStart.data.nonce})).status,409);
   claims={...valid};const signed=await call('/google/auth',null,{credential:'synthetic'});assert.equal(signed.status,200);assert.equal(signed.data.user._id,account.user._id);assert.equal(signed.data.user.membershipVerified,true);Object.assign(account,signed.data);
  });
  await t.test('untrusted third-party Google email never grants membership',async()=>{
   claims={...valid,sub:'untrusted-google',email:'untrusted@cvr.ac.in',hd:undefined};const r=await call('/google/auth',null,{credential:'synthetic'});assert.equal(r.status,200);assert.equal(r.data.user.hubId,null);assert.equal(r.data.user.identity.emailVerified,false);
  });
  await t.test('alternate email expires, rejects conflicts/transfers, preserves old login until commit',async()=>{
   const before=await User.findById(account.user._id).select('+googleSubject');
   assert.equal((await call('/me/email-change',account,{email:other.user.email})).status,409);
   assert.equal((await call('/me/email-change',account,{email:'unknown@unconfigured.example'})).status,400);
   await College.create({name:'Other',slug:'other-college',status:'active',timezone:'Asia/Kolkata',domains:[{normalizedDomain:'other.example.test',verifiedAt:new Date(),evidenceRef:'synthetic'}]});
   assert.equal((await call('/me/email-change',account,{email:'transfer@other.example.test'})).status,409);
   const newEmail='new_login@cvr.ac.in';assert.equal((await call('/me/email-change',account,{email:newEmail})).status,202);
   const expired=await captured(account);assert.equal((await User.findById(account.user._id)).email,before.email);
   await Challenge.updateOne({_id:expired.challengeId},{$set:{expiresAt:new Date(0)}});assert.equal((await call('/auth/verification/consume',account,expired)).status,400);assert.equal((await User.findById(account.user._id)).email,before.email);
   await cool(account);assert.equal((await call('/auth/verification/request',account,{})).status,202);const proof=await captured(account);
   const results=await Promise.all(Array.from({length:4},()=>call('/auth/verification/consume',account,proof)));assert.equal(results.filter(r=>r.status===200).length,1);
   const changed=results.find(r=>r.status===200).data;assert.equal(changed.user.email,newEmail);assert.equal(changed.user.hubId,account.user.hubId);assert.equal(changed.user._id,account.user._id);assert.equal((await call('/me',account)).status,401);
   const login=await call('/auth/login',null,{email:newEmail,password:'Disposable-identity-12!'});assert.equal(login.status,200);assert.equal((await call('/auth/login',null,{email:before.email,password:'Disposable-identity-12!'})).status,401);
   claims={...valid};assert.equal((await call('/google/auth',null,{credential:'synthetic'})).data.user.email,newEmail);Object.assign(account,changed);
   await cool(account);assert.equal((await call('/me/email-change',account,{email:'cancelled@cvr.ac.in'})).status,202);const cancelled=await captured(account);assert.equal((await call('/me/email-change',account,undefined,'DELETE')).status,200);assert.equal((await call('/auth/verification/consume',account,cancelled)).status,400);
  });
  await t.test('unassigned identity can verify an institutional replacement, with conflict rechecked at consumption',async()=>{
   const outsider=await register('outside','unknown.example.test');const target='joined@cvr.ac.in';assert.equal((await call('/me/email-change',outsider,{email:target})).status,202);const proof=await captured(outsider);
   await User.create({username:'race_owner',email:target,password:'Disposable-identity-12!'});assert.equal((await call('/auth/verification/consume',outsider,proof)).status,409);assert.equal((await User.findById(outsider.user._id)).email,outsider.user.email);assert.equal((await Challenge.findById(proof.challengeId)).consumedAt,null);
   await cool(outsider);assert.equal((await call('/me/email-change',outsider,{email:'eligible@cvr.ac.in'})).status,202);const result=await call('/auth/verification/consume',outsider,await captured(outsider));assert.equal(result.status,200);assert.equal(result.data.user.membershipVerified,true);
  });
  delete process.env.GOOGLE_CLIENT_ID;assert.equal((await call('/auth/capabilities')).data.google.available,false);assert.equal((await call('/google/link/start',other,{})).status,503);
 }finally{OAuth2Client.prototype.verifyIdToken=original;if(server)await new Promise(r=>server.close(r));await mongoose.disconnect();await repl.stop();}
});
