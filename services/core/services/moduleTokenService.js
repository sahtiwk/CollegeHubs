const jwt = require('jsonwebtoken');
const { randomBytes, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const ModuleGrant = require('../models/ModuleGrant');
const ServiceCredential = require('../models/ServiceCredential');
const User = require('../models/User');
const Hub = require('../models/Hub');
const { requireHubAccess } = require('./hubAccess');
const { hubPresentation } = require('./hubPresentation');
const { definitions } = require('../config/modules');
const { verifyModuleToken } = require('@collegehubs/contracts/module-token.cjs');
const failure = (status, code, message) => Object.assign(new Error(message), { status, code });
const digest = value => createHash('sha256').update(value).digest('hex');
const opaque = () => randomBytes(32).toString('base64url');
function input(body, fields) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== fields.length ||
    fields.some(key => typeof body[key] !== 'string')) throw failure(400, 'INVALID_INPUT', 'Invalid handoff fields');
}
function target(config, name) {
  if (!Object.hasOwn(definitions, name)) throw failure(400, 'INVALID_MODULE', 'Unknown module');
  if (!config.enabled.includes(name)) throw failure(503, 'MODULE_UNAVAILABLE', 'This module is not available yet');
  return definitions[name];
}
async function authenticateService(authorization) {
  const token = /^Bearer ([a-zA-Z0-9_-]{8,64}\.[a-zA-Z0-9_-]{43})$/.exec(authorization || '')?.[1];
  if (!token) throw failure(401, 'SERVICE_AUTH_REQUIRED', 'Module service credential required');
  const keyId = token.split('.')[0];
  const credential = await ServiceCredential.findOne({ keyId, status: 'active', scope: 'system', hubId: null }).select('+keyHash');
  if (!credential || !/^[a-f0-9]{64}$/.test(credential.keyHash || '') ||
    !timingSafeEqual(Buffer.from(digest(token)), Buffer.from(credential.keyHash))) throw failure(401, 'SERVICE_AUTH_INVALID', 'Invalid module service credential');
  return credential;
}
async function issueGrant(user, body, config) {
  input(body, ['module', 'state', 'returnPath']);
  const definition = target(config, body.module);
  if (!/^[a-zA-Z0-9_-]{43}$/.test(body.state) || !definition.returnPaths.includes(body.returnPath)) throw failure(400, 'INVALID_HANDOFF', 'Invalid state or return path');
  const context = await requireHubAccess(user);
  const hub = await Hub.findOne({ _id: context.hubId, status: 'active' });
  if (!hub) throw failure(403, 'HUB_REQUIRED', 'An active Hub is required');
  const grant = opaque();
  const expiresAt = new Date(Date.now() + config.grantTtl * 1000);
  await ModuleGrant.create({ hubId: context.hubId, userId: context.userId, module: body.module,
    grantHash: digest(grant), stateHash: digest(body.state), returnPath: body.returnPath,
    membershipVersion: context.membershipVersion, themeVersion: hub.themeVersion,
    expiresAt, retainUntil: expiresAt });
  return { grant, expiresAt: expiresAt.toISOString(), callbackPath: '/api/' + body.module + '/auth/callback' };
}
async function exchangeGrant(credential, body, config) {
  input(body, ['module', 'grant', 'state']);
  if (credential.service !== body.module) throw failure(403, 'SERVICE_MODULE_FORBIDDEN', 'Service cannot exchange for this module');
  const definition = target(config, body.module);
  if (!/^[a-zA-Z0-9_-]{43}$/.test(body.grant) || !/^[a-zA-Z0-9_-]{43}$/.test(body.state)) throw failure(400, 'INVALID_HANDOFF', 'Invalid grant or state');
  const now = new Date();
  const filter = { module: credential.service, grantHash: digest(body.grant), stateHash: digest(body.state), consumedAt: null, expiresAt: { $gt: now } };
  const grant = await ModuleGrant.findOne(filter);
  if (!grant) throw failure(409, 'GRANT_INVALID', 'Grant is expired, consumed, or invalid. Start a new handoff.');
  const context = await requireHubAccess({ sub: String(grant.userId) }, String(grant.hubId));
  if (context.membershipVersion !== grant.membershipVersion) throw failure(403, 'MEMBERSHIP_CHANGED', 'Membership changed. Start a new handoff.');
  const user = await User.findById(grant.userId);
  const hub = await Hub.findOne({ _id: context.hubId, status: 'active' });
  if (!hub || !user || user.membershipStatus !== 'active' || String(user.hubId) !== context.hubId || user.membershipVersion !== context.membershipVersion) throw failure(403, 'MEMBERSHIP_CHANGED', 'Membership changed');
  const theme = hubPresentation(hub);
  const iat = Math.floor(Date.now() / 1000);
  const accessJti = randomUUID();
  const claims = { iss: config.issuer, aud: definition.audience, sub: context.userId, hubId: context.hubId,
    college: theme.name, username: user.username, scope: [definition.scope],
    iat, nbf: iat, exp: iat + config.accessTtl, jti: accessJti,
    membershipVersion: context.membershipVersion, themeVersion: theme.themeVersion };
  // Sign/validate before consuming, so configuration errors cannot burn a grant.
  const token = jwt.sign(claims, config.privateKey, { algorithm: 'RS256', keyid: config.kid });
  verifyModuleToken(token, { module: body.module, issuer: config.issuer, publicKeys: config.publicKeys });
  const consumedAt = new Date();
  const consumed = await ModuleGrant.findOneAndUpdate({ ...filter, _id: grant._id, hubId: context.hubId, userId: context.userId,
    membershipVersion: context.membershipVersion, expiresAt: { $gt: consumedAt } },
    { $set: { consumedAt, accessJti, accessExpiresAt: new Date(claims.exp * 1000), themeVersion: theme.themeVersion,
      retainUntil: new Date(consumedAt.getTime() + config.retentionDays * 86400000) } }, { new: true });
  if (!consumed) throw failure(409, 'GRANT_REPLAYED', 'Grant was already used or expired. Start a new handoff.');
  return { token, tokenType: 'Bearer', expiresAt: new Date(claims.exp * 1000).toISOString(), returnPath: grant.returnPath, theme };
}
module.exports = { issueGrant, exchangeGrant, authenticateService, digest, opaque, failure };
