// Legacy access must be explicitly time-bounded during an announced rollout.
// New registrations never receive domain-claim membership.
function legacyDeadline() {
 const raw=process.env.LEGACY_MEMBERSHIP_NOTICE_UNTIL;
 if(!raw) return null;
 const date=new Date(raw);
 if(!Number.isFinite(date.getTime())) throw new Error('Invalid legacy membership deadline');
 return date;
}
function hasMembershipAuthority(user, now=new Date()) {
 if(user.membershipStatus!=='active'||!user.hubId) return false;
 if(user.membershipVerified===true && ['email','google'].includes(user.verificationMethod)) return true;
 const deadline=legacyDeadline();
 return Boolean(deadline && now<deadline && user.verificationMethod==='domain-claim' && !user.membershipCutoverAt);
}
module.exports={legacyDeadline,hasMembershipAuthority};
