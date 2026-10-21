const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
function key() {
  const text = process.env.GOOGLE_CALENDAR_TOKEN_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(text)) throw Error('Calendar encryption key is not configured');
  return Buffer.from(text, 'hex');
}
function seal(token, owner) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(String(owner)));
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(p => p.toString('base64url')).join('.');
}
function open(text, owner) {
  const parts = text.split('.').map(p => Buffer.from(p, 'base64url'));
  if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16) throw Error('Invalid calendar token');
  const decipher = createDecipheriv('aes-256-gcm', key(), parts[0]);
  decipher.setAAD(Buffer.from(String(owner))); decipher.setAuthTag(parts[1]);
  return Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString('utf8');
}
module.exports = { seal, open, key };
