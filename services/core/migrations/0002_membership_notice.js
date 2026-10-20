// Add evidence metadata and an announcement timestamp without changing historical ownership.
module.exports=async function membershipNotice({db,session,cursor,batchSize}) {
 const query=cursor?{_id:{$gt:cursor}}:{};
 const users=await db.collection('users').find(query,{session}).sort({_id:1}).limit(batchSize).toArray();
 for(const user of users){
  const fields={};
  if(user.emailVerificationMethod===undefined) fields.emailVerificationMethod=user.emailVerifiedAt&&user.googleSubject&&user.verificationMethod==='google'?'google':'none';
  if(user.membershipStatus==='active'&&user.hubId&&!(user.membershipVerified===true&&['google','email'].includes(user.verificationMethod))&&!user.membershipNoticeAt) fields.membershipNoticeAt=new Date();
  if(Object.keys(fields).length)await db.collection('users').updateOne({_id:user._id},{$set:fields},{session});
 }
 return {done:users.length<batchSize,cursor:users.at(-1)?._id||cursor};
};
