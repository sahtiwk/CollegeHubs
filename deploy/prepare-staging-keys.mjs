// Generates staging-only credentials locally. Never writes to active service .env files.
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(root, '.local/staging');
const destination = join(directory, 'credentials.json');
const ignored = spawnSync('git', ['check-ignore', '--quiet', destination], { cwd: root });
if (ignored.status !== 0) throw new Error('Staging credentials must be Git-ignored.');
if (existsSync(destination)) {
  console.log('Existing .local/staging/credentials.json preserved; no keys rotated.');
} else {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const kid = 'staging-' + randomBytes(8).toString('hex');
  const secret = () => randomBytes(32).toString('base64url');
  const scopes = {
    arcade: ['arcade.game_completed'],
    interview: ['interview.completed'],
    learn: ['learn.quiz_completed', 'learn.node_mastered'],
  };
  const bundle = {
    createdAt: new Date().toISOString(),
    core: {
      JWT_SECRET: secret(),
      CORE_MODULE_PRIVATE_KEY: privateKey,
      CORE_MODULE_KEY_ID: kid,
      CORE_MODULE_PUBLIC_KEYS: JSON.stringify({ [kid]: publicKey }),
    },
    modules: {},
    provisioning: [],
  };
  for (const [service, eventTypes] of Object.entries(scopes)) {
    const keyId = service + '-' + randomBytes(8).toString('hex');
    const key = keyId + '.' + secret();
    bundle.modules[service] = {
      CORE_PUBLIC_KEY: publicKey,
      CORE_KEY_ID: kid,
      CORE_TOKEN_ISSUER: 'collegehubs-core',
      CORE_TOKEN_AUDIENCE: 'collegehubs-' + service,
      CORE_SERVICE_KEY: key,
      [service.toUpperCase() + '_RECONCILE_KEY']: secret(),
    };
    bundle.provisioning.push({ service, keyId, key, eventTypes });
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(destination, JSON.stringify(bundle, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Created ignored .local/staging/credentials.json. No secrets printed; no provider or database changed.');
}
