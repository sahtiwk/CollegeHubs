// Offline authoring scaffold. No runtime API, paid provider or implicit activation.
// Drafts must be completed/reviewed and validated before replacing the released bank.
import { writeFileSync } from 'node:fs';
import { curriculum } from '../src/services/plannerAgent.ts';
const output=process.argv[2];
if(!output||process.argv[3]!=='--draft-only'||process.argv.length!==4)throw Error('Usage: node scripts/generate_question_seed.ts <new-output.json> --draft-only');
const draft={version:'draft-unreleased',review:{status:'draft',reviewer:'',reviewedAt:'',notes:'Fill original or permitted generated questions, verify each answer against the source, then record review.'},attribution:'',nodes:curriculum.nodes.map(n=>({slug:n.slug,domain:n.domain,source:n.resourceUrl,items:Array.from({length:15},(_,i)=>({id:n.slug+'-'+(i+1),mode:i<5?'checkpoint':'test-out',prompt:'',options:['a','b','c','d'].map(id=>({id,text:''})),correct:'',explanation:''}))}))};
writeFileSync(output,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
console.log('Unreleased question draft created. It cannot pass the reviewed-bank validator.');
