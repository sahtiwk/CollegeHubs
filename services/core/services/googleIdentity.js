const {OAuth2Client}=require('google-auth-library');
const {emailAddress}=require('../utils/validation');
const {emailDomain,normalizeDomain}=require('../config/collegeRegistry');
const failure=(status,message)=>Object.assign(new Error(message),{status});
function capability(){return {available:Boolean(process.env.GOOGLE_CLIENT_ID),clientId:process.env.GOOGLE_CLIENT_ID||null};}
async function verifyCredential(credential,{fresh=false,nonce}={}) {
 const id=process.env.GOOGLE_CLIENT_ID;if(!id)throw failure(503,'Google sign-in is not configured');
 let info;try{info=(await new OAuth2Client(id).verifyIdToken({idToken:credential,audience:id})).getPayload();}catch{throw failure(401,'Google identity could not be verified. Please try again.');}
 const now=Math.floor(Date.now()/1000);
 if(!info||!['accounts.google.com','https://accounts.google.com'].includes(info.iss)||info.aud!==id||info.email_verified!==true||typeof info.sub!=='string'||!info.sub||info.sub.length>255||!Number.isFinite(info.exp)||info.exp<=now)throw failure(401,'Invalid Google identity');
 if(fresh&&(!Number.isInteger(info.iat)||info.iat<now-300||info.iat>now+30||info.nonce!==nonce))throw failure(401,'Start linking again with a fresh Google credential.');
 const email=emailAddress(info.email),domain=emailDomain(email);
 const trustedEmail=domain==='gmail.com'||(typeof info.hd==='string'&&normalizeDomain(info.hd)===domain);
 return {info,email,trustedEmail};
}
module.exports={capability,verifyCredential};
