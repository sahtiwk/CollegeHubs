const fs = require('node:fs/promises');
const path = require('node:path');
const directory = path.resolve(__dirname,'../../../.local/verification-mail');
function capability() {
 const mode=process.env.VERIFICATION_MAIL_MODE || 'unavailable';
 if(mode!=='capture') return {available:false,mode:'unavailable'};
 // Capture is never a public delivery provider, even with an accidental flag.
 const local=process.env.NODE_ENV==='test'||process.env.NODE_ENV==='development';
 const mongo=process.env.MONGO_URI || '';
 const origins=(process.env.ALLOWED_ORIGINS||'').split(',');
 const loopback=origins.length && origins.every(value=>{try{return ['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);}catch{return false;}});
 if(!local || !/^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(mongo) || !loopback) return {available:false,mode:'unavailable'};
 return {available:true,mode:'local-capture'};
}
async function deliver({userId,email,challengeId,token}) {
 if(!capability().available) throw new Error('Mail unavailable');
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 // No token in HTTP responses/logs. This private fixture file is the mailbox.
 const target=path.join(directory,String(userId)+'.json');
 const origin=(process.env.APP_ORIGIN||process.env.ALLOWED_ORIGINS.split(',')[0]);
 const link=`${origin}/verify-email#challengeId=${challengeId}&token=${token}`;
 await fs.writeFile(target,JSON.stringify({email,challengeId,token,link}),{mode:0o600});
}
module.exports={capability,deliver};
