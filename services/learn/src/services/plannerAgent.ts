import legacy from '../data/curriculum/demo-v1.json' with {type:'json'};
import legacyBank from '../data/questions/demo-v1.json' with {type:'json'};
import foundation from '../data/curriculum/foundations-v1.json' with {type:'json'};
import foundationBank from '../data/questions/foundations-v1.json' with {type:'json'};
import registry from '@collegehubs/contracts/learn-curricula.json' with {type:'json'};
import { pathsFor } from '../data/starterPaths.ts';
export type Question = {id:string;mode:string;prompt:string;options:{id:string;text:string}[];correct:string;explanation:string};
export const latestVersion = 'foundations-v1';
export function release(version:string):{curriculum:any;bank:any} {
  if(version==='demo-v1')return {curriculum:legacy,bank:legacyBank};
  if(version===latestVersion)return {curriculum:foundation,bank:foundationBank};
  throw Error('Unknown curriculum publication');
}
export function canonicalId(domain:string,slug:string,version:string) {
  const entry=registry.equivalence.find(n=>n.domain===domain&&n.slug===slug&&n.versions.includes(version));
  if(!entry)throw Error('Unknown canonical skill');return entry.canonicalId;
}
export function permittedUrl(value:string) {
  try {const url=new URL(value);return registry.origins.includes(url.origin)&&!url.username&&!url.password&&!url.hash&&!url.search&&!/[\s\\]/.test(value)&&url.protocol==='https:';}catch{return false;}
}
export function validateCurriculum(c:any=foundation,b:any=foundationBank) {
  const text=(v:any,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
  if(!['demo-v1',latestVersion].includes(c.version)||c.version!==b.version||b.review?.status!=='reviewed'||!text(b.review.reviewer,200)||!text(b.attribution,1000)||!Array.isArray(c.nodes)||!Array.isArray(b.nodes)||c.nodes.length<1||c.nodes.length>100||c.nodes.length!==b.nodes.length)throw Error('Unreviewed or mismatched curriculum');
  if(c.version!== 'demo-v1'&&(c.review?.status!=='reviewed'||c.license!=='CC0-1.0'||b.license!=='CC0-1.0'||!text(c.provenance,1000)))throw Error('Missing publication provenance');
  const slugs=new Set(c.nodes.map((n:any)=>n.slug)),visited=new Set<string>(),visiting=new Set<string>(),questionIds=new Set<string>(),canonical=new Set<string>();
  if(slugs.size!==c.nodes.length||new Set(b.nodes.map((n:any)=>n.slug)).size!==b.nodes.length)throw Error('Duplicate topic');
  function visit(slug:string) {
    if(visiting.has(slug))throw Error('Curriculum cycle');if(visited.has(slug))return;
    const n=c.nodes.find((n:any)=>n.slug===slug);if(!n)throw Error('Missing prerequisite');visiting.add(slug);
    if(!Array.isArray(n.prerequisites)||n.prerequisites.length>1)throw Error('Unsupported prerequisites');
    for(const p of n.prerequisites){if(c.nodes.find((x:any)=>x.slug===p)?.domain!==n.domain)throw Error('Foreign prerequisite');visit(p);}
    visiting.delete(slug);visited.add(slug);
  }
  for(const n of c.nodes) {
    if(!registry.domains.some(d=>d.id===n.domain)||!text(n.label,120)||!permittedUrl(n.resourceUrl))throw Error('Invalid topic or reading origin');
    const id=canonicalId(n.domain,n.slug,c.version);if(canonical.has(id)||c.version!== 'demo-v1'&&n.canonicalId!==id)throw Error('Invalid canonical identity');canonical.add(id);visit(n.slug);
    const group=b.nodes.find((q:any)=>q.slug===n.slug&&q.domain===n.domain);
    if(!group||group.source!==n.resourceUrl||!Array.isArray(group.items)||group.items.length<15||group.items.length>100)throw Error('Missing question group');
    for(const [mode,count] of [['checkpoint',5],['test-out',10]] as const)if(group.items.filter((q:any)=>q.mode===mode).length<count)throw Error('Incomplete question bank');
    for(const q of group.items){
      if(questionIds.has(q.id)||!/^[a-z0-9-]{1,64}$/.test(q.id)||!['checkpoint','test-out'].includes(q.mode)||!text(q.prompt,1000)||!text(q.explanation,1500)||!Array.isArray(q.options)||q.options.length!==4||new Set(q.options.map((o:any)=>o.id)).size!==4||new Set(q.options.map((o:any)=>o.text)).size!==4||!q.options.some((o:any)=>o.id===q.correct)||q.options.some((o:any)=>!/^[a-d]$/.test(o.id)||!text(o.text,500)))throw Error('Invalid question');
      questionIds.add(q.id);
    }
  }
  const paths=pathsFor(c.version);
  for(const [domain,path] of Object.entries(paths))for(const topic of path!.nodes){const node=c.nodes.find((n:any)=>n.domain===domain&&n.slug===topic.slug);if(!node||node.label!==topic.label||node.resourceUrl!==topic.resource.url||JSON.stringify(node.prerequisites)!==JSON.stringify(topic.prerequisite?[topic.prerequisite]:[]))throw Error('Reading curriculum mismatch');}
  return {nodes:c.nodes.length,questions:questionIds.size,version:c.version};
}
validateCurriculum(legacy,legacyBank);validateCurriculum();
export const curriculum=foundation,bank=foundationBank;
