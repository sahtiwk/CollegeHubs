const Lease=require('../models/ProviderRequestLease');
async function reserve(){
  try{await Lease.updateOne({_id:'codeforces'},{$setOnInsert:{nextAt:new Date(0)}},{upsert:true}).maxTimeMS(2000);}catch(e){if(e.code!==11000)throw e;}
  const now=new Date();
  const row=await Lease.findOneAndUpdate({_id:'codeforces',nextAt:{$lte:now}},{$set:{nextAt:new Date(+now+3000)}},{new:true}).maxTimeMS(2000);
  if(!row)throw Object.assign(Error('Provider budget busy'),{code:'PROVIDER_COOLDOWN'});
}
module.exports={reserve};
