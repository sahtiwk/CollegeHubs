const fs = require('node:fs/promises');
const path = require('node:path');
const directory = path.resolve(__dirname,'../../../.local/verification-mail');
function publicOrigin() {
 try {
  const url=new URL(process.env.APP_ORIGIN);
  if(url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash &&
   (process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(url.origin)) return url.origin;
 } catch {}
 return null;
}
function capability() {
 const mode=process.env.VERIFICATION_MAIL_MODE || 'unavailable';
 if(mode==='brevo') return process.env.BREVO_API_KEY && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.VERIFICATION_MAIL_FROM||'') && publicOrigin()
  ? {available:true,mode:'brevo'} : {available:false,mode:'unavailable'};
 if(mode!=='capture') return {available:false,mode:'unavailable'};
 // Capture is never a public delivery provider, even with an accidental flag.
 const local=process.env.NODE_ENV==='test'||process.env.NODE_ENV==='development';
 const mongo=process.env.MONGO_URI || '';
 const origins=(process.env.ALLOWED_ORIGINS||'').split(',');
 const loopback=origins.length && origins.every(value=>{try{return ['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);}catch{return false;}});
 if(!local || !/^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(mongo) || !loopback) return {available:false,mode:'unavailable'};
 return {available:true,mode:'local-capture'};
}
async function deliver({userId,email,challengeId,token}, {fetcher=fetch}={}) {
 const config=capability();
 if(!config.available) throw new Error('Mail unavailable');
 if(config.mode==='brevo') {
  if(!/^[a-f0-9]{24}$/i.test(challengeId)||!/^[A-Za-z0-9_-]{43}$/.test(token)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid mail request');
  const link=`${publicOrigin()}/verify-email#challengeId=${challengeId}&token=${token}`;
  const text=`Verify your CollegeHubs email\n\nOpen this link while signed in to your CollegeHubs account:\n${link}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, ignore this email.`;
  // Fixed HTTPS destination, bounded request, no redirects, no automatic retries.
  // Never expose provider error bodies (which can contain recipient information).
  try {
   const response=await fetcher('https://api.brevo.com/v3/smtp/email',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({sender:{name:'CollegeHubs',email:process.env.VERIFICATION_MAIL_FROM},to:[{email}],
     subject:'Verify your CollegeHubs email',textContent:text,
     htmlContent:`<p>Verify your CollegeHubs email.</p><p><a href="${link.replaceAll('&','&amp;')}">Confirm your email address</a></p><p>Open this link while signed in to CollegeHubs. It expires in 30 minutes and works once. If you did not request it, ignore this email.</p>`,
     headers:{IdempotencyKey:`collegehubs-verification-${challengeId}`}})
   });
   await response.body?.cancel();
   if(response.status!==201) throw new Error('Provider rejected mail');
   return;
  } catch { throw new Error('Verification email delivery unavailable'); }
 }
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 // No token in HTTP responses/logs. This private fixture file is the mailbox.
 const target=path.join(directory,String(userId)+'.json');
 const origin=(process.env.APP_ORIGIN||process.env.ALLOWED_ORIGINS.split(',')[0]);
 const link=`${origin}/verify-email#challengeId=${challengeId}&token=${token}`;
 await fs.writeFile(target,JSON.stringify({email,challengeId,token,link}),{mode:0o600});
}
module.exports={capability,deliver};
