const KEY='collegehubs-return-intent';
const MAX_AGE=30*60*1000;
export function safeReturnPath(path){
 if(typeof path!=='string'||path.length>240||/[\\%?#\s]/.test(path))return null;
 if(['/', '/dashboard','/progress','/leaderboard','/contests'].includes(path))return path;
 if(/^\/(learn|interview|arcade)(\/[a-zA-Z0-9_-]+){0,3}$/.test(path))return path;
 if(/^\/(channels|study-rooms)\/[a-f0-9]{24}(\/study)?$/.test(path))return path;
 return null;
}
export function rememberIntent(path,userId=null,now=Date.now()){
 const target=safeReturnPath(path);if(!target)return;
 try{
  const previous=JSON.parse(sessionStorage.getItem(KEY)||'null');
  // Route rerenders and login/register switches must not renew the original deadline.
  if(previous?.path===target && previous.userId===userId)return;
  sessionStorage.setItem(KEY,JSON.stringify({path:target,userId,expiresAt:now+MAX_AGE}));
 }catch{}
}
export function clearIntent(){try{sessionStorage.removeItem(KEY);}catch{}}
export function returnIntent(userId,consume=false,now=Date.now()){
 try{
  const item=JSON.parse(sessionStorage.getItem(KEY)||'null');
  if(!item||!safeReturnPath(item.path)||!Number.isFinite(item.expiresAt)||item.expiresAt<=now||item.expiresAt>now+MAX_AGE||(item.userId&&item.userId!==userId)){clearIntent();return '/dashboard';}
  if(consume)clearIntent();else if(!item.userId)sessionStorage.setItem(KEY,JSON.stringify({...item,userId}));
  return item.path;
 }catch{clearIntent();return '/dashboard';}
}
