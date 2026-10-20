const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
// Integration-only: read the private loopback fixture mailbox, then use the real API.
module.exports=async function verifyCapturedAccount(account){
 const base=process.env.GUARD_APP_ORIGIN;
 assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+account.token};
 const requested=await fetch(base+'/api/auth/verification/request',{method:'POST',headers,body:'{}'});assert.equal(requested.status,202);
 const {challengeId,token}=JSON.parse(await fs.readFile(path.resolve('.local/verification-mail',account.user._id+'.json'),'utf8'));
 const result=await fetch(base+'/api/auth/verification/consume',{method:'POST',headers,body:JSON.stringify({challengeId,token})});assert.equal(result.status,200);
 return result.json();
};
