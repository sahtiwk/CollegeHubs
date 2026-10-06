const {readdirSync}=require('node:fs');const {resolve}=require('node:path');const {execFileSync}=require('node:child_process');
function check(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())check(path);else if(path.endsWith('.js'))execFileSync(process.execPath,['--check',path]);}}
check(resolve(__dirname,'../services/arcade/src'));console.log('Arcade source syntax valid.');
