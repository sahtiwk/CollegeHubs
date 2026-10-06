import { spawnSync } from 'node:child_process';
const service = process.argv[2];
if (!['core', 'arcade', 'learn'].includes(service)) throw new Error('Choose core, arcade or learn');
const scope = ['--workspace', '@collegehubs/' + service, '--workspace', '@collegehubs/contracts', '--include-workspace-root=false'];
function npm(args) {
  const result = spawnSync('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
npm(['ci', ...scope, '--ignore-scripts', ...(service === 'learn' ? ['--include=dev'] : ['--omit=dev'])]);
npm(['run', 'build', '--workspace', '@collegehubs/' + service]);
if (service === 'learn') npm(['prune', ...scope, '--omit=dev', '--ignore-scripts']);
