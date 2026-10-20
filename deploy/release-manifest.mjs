// Read-only local release inventory. No environment values or ignored files are read.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, {encoding:'utf8'});
const files = [...new Set(git(['ls-files','-c','-o','--exclude-standard','-z']).split('\0').filter(Boolean))]
 .filter(file=> /^(apps\/web\/|services\/|packages\/contracts\/|deploy\/|scripts\/)/.test(file)||['package.json','package-lock.json','render.yaml'].includes(file))
 .filter(file=>!/(^|\/)\.env(?:\.|$)/.test(file)&&fs.existsSync(file)&&fs.statSync(file).isFile()).sort();
const source=files.map(file=>({file,sha256:hash(fs.readFileSync(file))}));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]);}
if(!fs.existsSync('apps/web/dist/index.html'))throw Error('Build web before preparing a manifest');
const artifact=walk('apps/web/dist').sort().map(file=>({file:file.replaceAll('\\','/').replace('apps/web/dist/',''),sha256:hash(fs.readFileSync(file)),bytes:fs.statSync(file).size}));
const findings=[];
for(const row of artifact){
 const text=fs.readFileSync(path.join('apps/web/dist',row.file),'utf8');
 if(/-----BEGIN (?:RSA )?PRIVATE KEY-----|(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^/\s"']+:[^@\s"']+@|\bgsk_[a-zA-Z0-9]{24,}/.test(text))findings.push(row.file);
 if(row.bytes>25*1024*1024)findings.push(row.file+':asset-size');
}
if(artifact.length>20000)findings.push('asset-count');
const migrations=source.filter(row=>/\/migrations\/\d{4}_[^/]+\.(sql|js)$/.test(row.file));
const report={generatedAt:new Date().toISOString(),status:'local-candidate-not-deployed',baseCommit:git(['rev-parse','HEAD']).trim(),workingTreeDirty:!!git(['status','--porcelain']).trim(),
 sourceDigest:hash(JSON.stringify(source)),artifactDigest:hash(JSON.stringify(artifact)),source,migrations,artifact,artifactInspection:{findings,scope:'common credential patterns and Pages file bounds; not a complete secret audit'},
 activation:{hostingAccountPlans:'unverified',deploymentIds:null,authCutover:'separate gate: public email delivery unavailable',providerCapabilities:'preserve existing settings; verify account plans before enabling'},
 rollback:{reference:'docs/transition-restore.md',approvedArtifact:null}};
fs.mkdirSync('.local/tp111',{recursive:true});fs.writeFileSync('.local/tp111/release-manifest.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,sourceDigest:report.sourceDigest,artifactDigest:report.artifactDigest,sourceFiles:source.length,assets:artifact.length,findings:findings.length}));
if(findings.length)process.exitCode=1;
