// Core is plain CommonJS. Validate every source file without opening a listener/DB.
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
function check(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name)) continue;
    const file = join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.(js|cjs)$/.test(entry.name)) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  }
}
check(require('node:path').resolve(__dirname, '../services/core'));
console.log('Core source syntax valid; no transpilation required.');
