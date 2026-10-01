// Pre-deployment configuration, not a deploy or an environment-secret writer.
const fs = require('node:fs');
const path = require('node:path');
const { deploymentConfig, origin } = require('../config/gateway.cjs');
const names = ['CORE_STAGING_ORIGIN', 'LEARN_STAGING_ORIGIN', 'GATEWAY_STAGING_ORIGIN'];
try {
  if (names.some(name => !process.env[name])) throw new Error('Set ' + names.join(', '));
  const [core, learn, gateway] = names.map(name => origin(process.env[name], name));
  if (new Set([core, learn, gateway]).size !== 3) throw new Error('Three distinct origins are required to avoid rewrite loops');
  const output = path.resolve(__dirname, '..', 'vercel.staging.json');
  fs.writeFileSync(output, JSON.stringify(deploymentConfig(core, learn), null, 2) + '\n');
  fs.mkdirSync(path.resolve(__dirname, '..', '.local'), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, '..', '.local', 'staging-origins.json'), JSON.stringify({ core, learn, gateway }, null, 2) + '\n');
  console.log('Saved vercel.staging.json and .local/staging-origins.json. No deployment performed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
