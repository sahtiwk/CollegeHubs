const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const p=await browser.newPage({viewport:{width:390,height:844}});let linked=false,submitted=0;const nonce='n'.repeat(43);
 const token=()=> 'header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sid:'b'.repeat(24),revision:linked?1:0})).toString('base64url')+'.signature';
 const user=()=>({_id:'a'.repeat(24),username:'google-ui-fixture',email:'student@cvr.ac.in',membershipStatus:'unassigned',membershipVersion:linked?1:0,hubId:null,hubs:[],membershipVerified:false,identity:{emailVerified:false,verificationRequired:true,googleLinked:linked,mail:{available:false,mode:'unavailable'}}});
 await p.route('**/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(o){window.fixtureGoogleOptions=o},renderButton(el){const b=document.createElement('button');b.textContent='Choose Google fixture';b.onclick=()=>window.fixtureGoogleOptions.callback({credential:'synthetic-ui-only'});el.replaceChildren(b)},cancel(){},prompt(){},disableAutoSelect(){}}}};`}));
 await p.route('**/api/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/api/auth/capabilities')return route.fulfill({json:{google:{available:true,clientId:'test-google-client'}}});
  if(pathname==='/api/auth/csrf')return route.fulfill({json:{csrfToken:'synthetic'}});
  if(pathname==='/api/auth/refresh')return route.fulfill({json:{token:token(),user:user(),csrfToken:'synthetic'}});
  if(pathname==='/api/me')return route.fulfill({json:user()});
  if(pathname==='/api/google/link/start')return route.fulfill({json:{nonce,expiresInSeconds:300}});
  if(pathname==='/api/google/link'){
   assert.deepEqual(route.request().postDataJSON(),{credential:'synthetic-ui-only',nonce});submitted++;
   if(submitted===1)return route.fulfill({status:401,json:{error:'Start linking again with a fresh Google credential.',code:'GOOGLE_IDENTITY_INVALID'}});
   linked=true;return route.fulfill({json:{token:token(),user:user()}});
  }
  return route.fulfill({status:404,json:{error:'Unexpected fixture request'}});
 });
 await p.goto('http://127.0.0.1:5194/verify-email');await p.getByRole('button',{name:'Start linking Google'}).focus();await p.keyboard.press('Enter');await p.getByRole('button',{name:'Choose Google fixture'}).waitFor();assert.equal(await p.evaluate(()=>window.fixtureGoogleOptions.nonce),nonce);
 await p.getByRole('button',{name:'Choose Google fixture'}).click();await p.getByText('Start linking again with a fresh Google credential.',{exact:true}).waitFor();assert.equal(new URL(p.url()).pathname,'/verify-email');
 await p.getByRole('button',{name:'Choose Google fixture'}).click();await p.getByRole('heading',{name:'Google is linked.'}).waitFor();assert.equal(submitted,2);assert.equal(await p.getByRole('button',{name:'Start linking Google'}).count(),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Google-enabled UI: keyboard start, nonce forwarded, failed credential keeps Core sign-in, explicit linking success. Synthetic SDK/API, not real Google sign-in.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
