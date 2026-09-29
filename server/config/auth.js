const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
if (!secret || !secret.trim()) throw new Error('JWT_SECRET is required');
const issuer = process.env.CORE_TOKEN_ISSUER || 'collegehubs-core';
const audience = process.env.CORE_ACCESS_AUDIENCE || 'collegehubs-core-api';
const ttl = Number(process.env.CORE_ACCESS_TTL_SECONDS || 86400);
if (!Number.isInteger(ttl) || ttl < 1 || ttl > 86400) {
  throw new Error('CORE_ACCESS_TTL_SECONDS must be an integer from 1 to 86400');
}

function generateToken(user) {
  return jwt.sign({ id: String(user._id), username: user.username }, secret, {
    algorithm: 'HS256', issuer, audience, expiresIn: ttl,
  });
}

function verifyToken(token) {
  const claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
  if (!claims || typeof claims.id !== 'string' || !/^[a-f\d]{24}$/i.test(claims.id) ||
      !Number.isInteger(claims.exp) || !Number.isInteger(claims.iat) ||
      claims.exp <= claims.iat || claims.exp - claims.iat > 86400) {
    throw new jwt.JsonWebTokenError('Invalid Core claims');
  }
  return claims;
}

module.exports = { generateToken, verifyToken };
