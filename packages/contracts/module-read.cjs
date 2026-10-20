// No Core DB or third-party dependency: modules verify with their configured public keys.
const { createPublicKey, verify } = require('node:crypto');
const audiences = { arcade: 'collegehubs-arcade', interview: 'collegehubs-interview', learn: 'collegehubs-learn' };
const fields = ['iss', 'aud', 'sub', 'hubId', 'scope', 'iat', 'nbf', 'exp', 'jti', 'membershipVersion'];
function verifyReadToken(token, { module: name, issuer, publicKeys, purpose = 'summary', now = Math.floor(Date.now() / 1000) }) {
  const invalid = () => { throw new Error('Invalid or expired module credential'); };
  try {
    if (!['summary','weak-skills'].includes(purpose) || purpose === 'weak-skills' && name !== 'learn' || !Object.hasOwn(audiences, name) || typeof issuer !== 'string' || !issuer || typeof token !== 'string' || token.length > 8192) return invalid();
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) return invalid();
    const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
    if (header.alg !== 'RS256' || header.typ !== 'JWT' || typeof header.kid !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(header.kid) ||
        Object.keys(header).some(key => !['alg', 'typ', 'kid'].includes(key)) || !Object.hasOwn(publicKeys, header.kid)) return invalid();
    const key = createPublicKey(publicKeys[header.kid]);
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048 ||
        !verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'))) return invalid();
    const c = JSON.parse(Buffer.from(parts[1], 'base64url'));
    if (!c || Object.keys(c).length !== fields.length || fields.some(field => !Object.hasOwn(c, field)) ||
        c.iss !== issuer || c.aud !== audiences[name] ||
        !Array.isArray(c.scope) || c.scope.length !== 1 || c.scope[0] !== 'module:' + name + ':' + purpose + ':read' ||
        typeof c.sub !== 'string' || !/^[a-f0-9]{24}$/.test(c.sub) || typeof c.hubId !== 'string' || !/^[a-f0-9]{24}$/.test(c.hubId) ||
        typeof c.jti !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(c.jti) ||
        !Number.isSafeInteger(c.membershipVersion) || c.membershipVersion < 0 ||
        ![c.iat, c.nbf, c.exp, now].every(Number.isSafeInteger) ||
        c.iat < 0 || c.nbf !== c.iat || c.iat > now || c.exp <= now || c.exp <= c.iat || c.exp - c.iat > 30) return invalid();
    return Object.freeze({ ...c, scope: Object.freeze([...c.scope]) });
  } catch { return invalid(); }
}
const countFields = Object.freeze({ learn: ['enrollments', 'completedNodes', 'completedQuizzes', 'pending','requiredNodes','optionalNodes','completedPaths'], arcade: ['completedGames', 'wins', 'pending'], interview: ['completedInterviews', 'pending'] });
function authorizeRead(req, config, name, purpose = 'summary') {
  const { timingSafeEqual } = require('node:crypto');
  const deny = () => { throw Object.assign(new Error('Read delegation required'), { status: 401, code: 'READ_DELEGATION_REQUIRED' }); };
  const supplied = req.get('Authorization');
  if (req.get('Origin') || req.get('Cookie') || Object.keys(req.query).length || !/^[a-zA-Z0-9_-]{43}$/.test(config.readKey || '') || typeof supplied !== 'string') return deny();
  const expected = Buffer.from('Bearer ' + config.readKey), actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return deny();
  try { return verifyReadToken(req.get('X-Module-Read'), { ...config, module: name, purpose }); } catch { return deny(); }
}
const summaryVersion = 2;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const mongoId = /^[a-f0-9]{24}$/;
const domains = ['dsa','web','ml','backend','devops'];
function validNext(name, value) {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys=Object.keys(value).sort().join(',');
  if(name==='learn')return keys==='id,kind'&&['node','quiz'].includes(value.kind)&&uuid.test(value.id);
  if(name==='interview')return keys==='id,kind'&&['session','report'].includes(value.kind)&&mongoId.test(value.id);
  return name==='arcade'&&keys==='gameId,id,kind'&&value.kind==='game'&&mongoId.test(value.id)&&['numberguess','mathamplitude','sorting','spotbug'].includes(value.gameId);
}
function validateSummary(name,data,now=Date.now()){
  if(!data||data.status!=='ok'||typeof data.asOf!=='string'||!Number.isFinite(Date.parse(data.asOf))||Math.abs(now-Date.parse(data.asOf))>30000)throw Error('Invalid summary');
  const v2=data.schemaVersion===summaryVersion;
  const fields=!v2&&name==='learn'&&!['requiredNodes','optionalNodes','completedPaths'].some(k=>Object.hasOwn(data,k))?countFields.learn.slice(0,4):countFields[name];
  const extra=v2?['status','asOf','schemaVersion','next',...(name==='learn'?['paths']:[])]:['status','asOf'];
  if(!fields||Object.keys(data).sort().join(',')!==[...fields,...extra].sort().join(',')||fields.some(k=>!Number.isSafeInteger(data[k])||data[k]<0))throw Error('Invalid summary');
  if(v2){
    if(!validNext(name,data.next))throw Error('Invalid continuation');
    if(name==='learn'){
      if(!Array.isArray(data.paths)||data.paths.length>5||new Set(data.paths.map(p=>p?.domain)).size!==data.paths.length)throw Error('Invalid paths');
      for(const p of data.paths)if(!p||Object.keys(p).sort().join(',')!=='completed,domain,required,version'||!domains.includes(p.domain)||!['demo-v1','foundations-v1'].includes(p.version)||!Number.isSafeInteger(p.required)||p.required<1||!Number.isSafeInteger(p.completed)||p.completed<0||p.completed>p.required)throw Error('Invalid path');
    }
  }
  return data;
}
module.exports = { verifyReadToken, authorizeRead, countFields, summaryVersion, validateSummary, validNext };
