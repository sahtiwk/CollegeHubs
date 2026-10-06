const { Router }=require('express'); const { fail,exact }=require('../errors');
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
function cookie(req,name){const parts=(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith('ch_arcade_'+name+'='));return parts.length===1?parts[0].split('=')[1]:'';}
function sessionRoutes(config,store){const router=Router();const set=(res,name,value,age)=>res.append('Set-Cookie',`ch_arcade_${name}=${value}; Path=/api/arcade; HttpOnly;${config.secure?' Secure;':''} SameSite=Lax; Max-Age=${age}`);
router.post('/auth/start',wrap(async(req,res)=>{if(req.body&&!exact(req.body,[]))throw fail(400,'INVALID_BODY');const state=await store.start();set(res,'state',state,60);res.status(201).json({state,expiresIn:60});}));
router.post('/auth/callback',wrap(async(req,res)=>{if(!exact(req.body,['module','state','grant']))throw fail(400,'INVALID_BODY');const result=await store.callback({...req.body,origin:req.get('Origin'),cookieState:cookie(req,'state')});set(res,'state','',0);set(res,'session',result.handle,Math.max(0,Math.min(900,Math.floor((+result.expiresAt-Date.now())/1000))));res.json({ready:true});}));
router.get('/session',wrap(async(req,res)=>{const handle=cookie(req,'session');res.json(store.dto(await store.get(handle),handle));}));
const logout=wrap(async(req,res)=>{await store.logout(cookie(req,'session'),req.get('Origin'),req.get('X-CSRF-Token'));set(res,'state','',0);set(res,'session','',0);res.json({signedOut:true});});router.post('/logout',logout);router.delete('/session',logout);return router;}
module.exports={sessionRoutes,cookie,wrap};
