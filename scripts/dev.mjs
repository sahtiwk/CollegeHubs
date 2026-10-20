import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { readFileSync } from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
const coreEnv = resolve(root, 'services/core/.env');
const coreConfig = existsSync(coreEnv) ? parseEnv(readFileSync(coreEnv, 'utf8')) : {};
const enabled = (process.env.ENABLE_MODULES ?? coreConfig.ENABLE_MODULES ?? '').split(',');
const definitions = [ ['apps/web', ['../../node_modules/vite/bin/vite.js']], ['services/core', ['index.js']] ];
if (enabled.includes('arcade')) definitions.push(['services/arcade', ['src/server.js']]);
if (enabled.includes('interview')) definitions.push(['services/interview', ['src/server.js']]);
if (enabled.includes('learn')) definitions.push(['services/learn', ['src/server.ts']]);
const children = definitions.map(([dir, args]) => {
  const child = spawn(process.execPath, args, { cwd: resolve(root, dir), stdio: 'inherit', env: { ...process.env, CORE_SESSION_ENABLED: process.env.CORE_SESSION_ENABLED ?? coreConfig.CORE_SESSION_ENABLED ?? 'true', NODE_ENV: process.env.NODE_ENV || 'development' } });
  child.on('error', () => { console.error(dir + ' could not start; other processes remain available.'); process.exitCode = 1; });
  child.on('exit', code => { if (!stopping) console.log(dir + ' stopped (' + (code ?? 'signal') + '); restart it in its workspace.'); });
  return child;
});
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; process.exitCode = code; for (const child of children) child.kill(); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
