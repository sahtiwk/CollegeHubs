// Operator-only: key material arrives on stdin, never a command-line argument or log.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const ServiceCredential = require('../models/ServiceCredential');
const { createHash } = require('node:crypto');
async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error('Input too large');
  }
  const { service, keyId, key, status = 'active' } = JSON.parse(input);
  if (!['arcade', 'interview', 'learn'].includes(service) || !/^[a-zA-Z0-9_-]{8,64}$/.test(keyId || '') ||
      typeof key !== 'string' || !new RegExp('^' + keyId + '\\.[a-zA-Z0-9_-]{43}$').test(key) ||
      !['active', 'disabled'].includes(status) || !process.env.MONGO_URI) throw new Error('Invalid configuration');
  await mongoose.connect(process.env.MONGO_URI);
  await ServiceCredential.init();
  const existing = await ServiceCredential.findOne({ keyId });
  if (existing && existing.service !== service) throw new Error('Key ID belongs to another service');
  await ServiceCredential.findOneAndUpdate({ keyId, service }, { $set: {
    keyHash: createHash('sha256').update(key).digest('hex'), status,
  }, $setOnInsert: { scope: 'system', hubId: null, keyId, service, eventTypes: [], allowedReadScopes: [] } }, { upsert: true, runValidators: true });
  console.log('Module service credential provisioned; no event/read scopes granted.');
}
main().catch(() => { console.error('Service provisioning failed. Check stdin configuration and database availability.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
