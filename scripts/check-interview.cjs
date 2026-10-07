const { readdirSync } = require('node:fs'), { resolve } = require('node:path'), { execFileSync } = require('node:child_process');
function check(dir) { for (const item of readdirSync(dir, { withFileTypes: true })) { const path = resolve(dir, item.name); if (item.isDirectory()) check(path); else if (/\.(js|mjs)$/.test(path)) execFileSync(process.execPath, ['--check', path]); } }
check(resolve(__dirname, '../services/interview/src')); console.log('Interview source syntax valid.');
