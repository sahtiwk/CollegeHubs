const { domainToASCII } = require('node:url');
const config = require('./colleges.seed.json');
function normalizeDomain(value) {
  if (typeof value !== 'string') throw new Error('Invalid email domain');
  const input = value.trim().toLowerCase();
  if (/[\s/\\:@?#%]/.test(input)) throw new Error('Invalid email domain');
  const domain = domainToASCII(input);
  if (!domain || domain.length > 253 || !domain.includes('.') || domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error('Invalid email domain');
  return domain;
}
function emailDomain(email) { return normalizeDomain(email.slice(email.lastIndexOf('@') + 1)); }
function safeTheme(tokens) {
  if (!tokens || typeof tokens !== 'object') throw new Error('Theme tokens required');
  const result = {};
  for (const key of Object.keys(config.defaultTheme)) {
    if (!/^#[0-9a-f]{6}$/i.test(tokens[key] || '')) throw new Error('Invalid theme token');
    result[key] = tokens[key];
  }
  if (Object.keys(tokens).some(key => !Object.hasOwn(result, key))) throw new Error('Unknown theme token');
  return result;
}
module.exports = { config, normalizeDomain, emailDomain, safeTheme };
