const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const mail=require('../../services/core/services/verificationMail');
const keys=['VERIFICATION_MAIL_MODE','BREVO_API_KEY','VERIFICATION_MAIL_FROM','APP_ORIGIN','ALLOWED_ORIGINS','NODE_ENV','MONGO_URI'];
const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
after(()=>{for(const [key,value] of Object.entries(original)) value===undefined?delete process.env[key]:process.env[key]=value;});
function configure(overrides={}) {
 Object.assign(process.env,{VERIFICATION_MAIL_MODE:'brevo',BREVO_API_KEY:'test-only-secret',VERIFICATION_MAIL_FROM:'sender@example.com',APP_ORIGIN:'https://collegehubs.example',ALLOWED_ORIGINS:'https://collegehubs.example',NODE_ENV:'production',MONGO_URI:'mongodb://localhost/test'},overrides);
}
const request={userId:'test-user',email:'recipient@example.com',challengeId:'a'.repeat(24),token:'b'.repeat(43)};
test('Brevo sends one bounded request with a fragment token and no response disclosure',async()=>{
 configure(); let calls=0,cancelled=false;
 const result=await mail.deliver(request,{fetcher:async(url,options)=>{
  calls++; assert.equal(url,'https://api.brevo.com/v3/smtp/email');
  assert.equal(options.method,'POST'); assert.equal(options.redirect,'error');
  assert.ok(options.signal instanceof AbortSignal); assert.equal(options.headers['api-key'],'test-only-secret');
  const body=JSON.parse(options.body);
  assert.deepEqual(body.to,[{email:request.email}]);
  assert.deepEqual(body.sender,{name:'CollegeHubs',email:'sender@example.com'});
  assert.match(body.textContent,/https:\/\/collegehubs\.example\/verify-email#challengeId=/);
  assert.match(body.htmlContent,/&amp;token=/);
  assert.equal(body.headers.IdempotencyKey,`collegehubs-verification-${request.challengeId}`);
  return {status:201,body:{cancel:async()=>{cancelled=true;}}};
 }});
 assert.equal(result,undefined); assert.equal(calls,1); assert.ok(cancelled);
});
test('missing configuration and unsafe origins disable delivery',async()=>{
 for(const overrides of [{BREVO_API_KEY:''},{VERIFICATION_MAIL_FROM:''},{APP_ORIGIN:'http://collegehubs.example'},{APP_ORIGIN:'https://evil.example'},{APP_ORIGIN:'https://collegehubs.example/path'},{APP_ORIGIN:'https://user:password@collegehubs.example'},{APP_ORIGIN:'https://collegehubs.example/?query=1'}]) {
  configure(overrides); assert.deepEqual(mail.capability(),{available:false,mode:'unavailable'});
  await assert.rejects(mail.deliver(request,{fetcher:()=>assert.fail('must not contact provider')}),/Mail unavailable/);
 }
});
test('provider errors and network failures are generic and never retried',async()=>{
 configure();
 for(const status of [200,400,401,429,500]) {
  let calls=0;
  await assert.rejects(mail.deliver(request,{fetcher:async()=>{calls++;return {status};}}),{message:'Verification email delivery unavailable'});
  assert.equal(calls,1);
 }
 await assert.rejects(mail.deliver(request,{fetcher:async()=>{throw new Error('secret recipient token');}}),{message:'Verification email delivery unavailable'});
});
test('malformed challenges are rejected before contacting Brevo',async()=>{
 configure();
 for(const invalid of [{token:'bad'},{challengeId:'bad'},{email:'bad'}])
  await assert.rejects(mail.deliver({...request,...invalid},{fetcher:()=>assert.fail('must not send')}),/Invalid mail request/);
});
test('capture stays disabled in production',()=>{
 configure({VERIFICATION_MAIL_MODE:'capture',ALLOWED_ORIGINS:'http://localhost:5173'});
 assert.deepEqual(mail.capability(),{available:false,mode:'unavailable'});
});
