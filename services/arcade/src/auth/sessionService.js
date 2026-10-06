const { timingSafeEqual } = require('node:crypto');
const { hash, opaque, requireCallback } = require('@collegehubs/contracts/module-session.cjs');
const { validateExchange } = require('./config');
const { jsonRequest } = require('../services/http');
const { fail } = require('../errors');
const pattern = /^[a-zA-Z0-9_-]{43}$/;
function createSessionStore(models, config, fetcher = fetch) {
  const { ModuleSession, Handoff } = models;
  async function start() { const state = opaque(); await Handoff.create({ stateHash: hash(state), expiresAt: new Date(Date.now()+60000) }); return state; }
  async function callback({ origin, cookieState, state, grant, module }) {
    if (module !== 'arcade' || typeof grant !== 'string' || !pattern.test(grant)) throw fail(400,'INVALID_CALLBACK');
    try { requireCallback({ origin, expectedOrigin: config.origin, state, cookieState }); } catch { throw fail(403,'CALLBACK_STATE_INVALID'); }
    if (!await Handoff.findOneAndDelete({ stateHash: hash(state), expiresAt: { $gt: new Date() } })) throw fail(409,'CALLBACK_REPLAYED');
    let result;
    try { result = await jsonRequest(config.core+'/api/auth/module-grants/exchange', { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.serviceKey}, body:JSON.stringify({module:'arcade',grant,state}) }, fetcher); if (!result.ok) throw Error(); }
    catch { throw fail(503,'HANDOFF_RESTART_REQUIRED','Start a new Arcade handoff.'); }
    let checked; try { checked = validateExchange(result.data,config); } catch { throw fail(401,'INVALID_MODULE_CREDENTIAL'); }
    const handle=opaque(), expiresAt=new Date(checked.principal.exp*1000);
    await ModuleSession.create({sessionHash:hash(handle),user_id:checked.principal.sub,hub_id:checked.principal.hubId,principal:checked.principal,theme:checked.theme,expires_at:expiresAt,csrfHash:hash(hash('csrf:'+handle))});
    return {handle,expiresAt};
  }
  async function get(handle) {
    if (typeof handle !== 'string' || !pattern.test(handle)) throw fail(401,'ARCADE_SESSION_REQUIRED');
    const row=await ModuleSession.findOne({sessionHash:hash(handle),expires_at:{$gt:new Date()}}).lean();
    if (!row || !/^[a-f0-9]{24}$/.test(row.user_id) || !/^[a-f0-9]{24}$/.test(row.hub_id) || row.principal?.sub !== row.user_id || row.principal?.hubId !== row.hub_id || row.principal.exp*1000<=Date.now() || +row.expires_at>row.principal.exp*1000) throw fail(401,'ARCADE_SESSION_REQUIRED');
    return row;
  }
  function mutation(row,origin,csrf) { if(origin!==config.origin || typeof csrf!=='string' || csrf.length!==64 || !timingSafeEqual(Buffer.from(hash(csrf)),Buffer.from(row.csrfHash))) throw fail(403,'CSRF_INVALID'); }
  async function logout(handle,origin,csrf) {const row=await get(handle);mutation(row,origin,csrf);await ModuleSession.deleteOne({sessionHash:hash(handle),user_id:row.user_id,hub_id:row.hub_id});}
  const dto=(row,handle)=>({userId:row.user_id,hubId:row.hub_id,username:row.principal.username,college:row.principal.college,membershipVersion:row.principal.membershipVersion,expiresAt:row.expires_at,theme:row.theme,csrfToken:hash('csrf:'+handle)});
  return {start,callback,get,logout,mutation,dto};
}
module.exports={createSessionStore};
