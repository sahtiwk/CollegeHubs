const mongoose=require('mongoose');
const User=require('../models/User');
const unverified={membershipStatus:'active',hubId:{$ne:null},$nor:[{membershipVerified:true,verificationMethod:{$in:['email','google']}}]};
async function cutoverMembership({dryRun=true,cutoverAt,now=new Date(),batchSize=100}={}) {
 if(!(cutoverAt instanceof Date)||!Number.isFinite(+cutoverAt)||cutoverAt>now||!Number.isInteger(batchSize)||batchSize<1||batchSize>1000)throw new Error('An elapsed announced cutover and bounded batch size are required');
 const filter={...unverified,membershipNoticeAt:{$type:'date',$lte:cutoverAt}};
 const total=await User.countDocuments(unverified), eligible=await User.countDocuments(filter);
 if(dryRun)return {dryRun,eligible,unannounced:total-eligible,cutoverAt};
 if(total!==eligible)throw new Error('Announce all affected memberships before cutover');
 const audit=mongoose.connection.db.collection('membershipcutovers');
 await audit.updateOne({_id:cutoverAt.toISOString()},{$setOnInsert:{cutoverAt,startedAt:now,changed:0}},{upsert:true});
 let changed=0;
 await mongoose.connection.transaction(async session=>{
  const users=await User.find(filter).sort({_id:1}).limit(batchSize).session(session);
  changed=users.length;
  for(const user of users){user.membershipStatus='verification-pending';user.membershipVerified=false;user.membershipCutoverAt=cutoverAt;user.membershipVersion+=1;await user.save({session});}
  await audit.updateOne({_id:cutoverAt.toISOString()},{$inc:{changed},$set:{lastBatchAt:now}},{session});
 });
 const remaining=await User.countDocuments(filter);
 return {dryRun,changed,remaining,complete:remaining===0,cutoverAt};
}
module.exports={cutoverMembership,unverified};
