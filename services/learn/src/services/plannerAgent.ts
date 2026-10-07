// Replaces MargaAI's runtime DAG generation with a validated, versioned seed.
import curriculum from '../data/curriculum/demo-v1.json' with { type: 'json' };
import bank from '../data/questions/demo-v1.json' with { type: 'json' };
import {starterPaths,curriculumVersion} from '../data/starterPaths.ts';
export type Question = { id: string; mode: string; prompt: string; options: { id: string; text: string }[]; correct: string; explanation: string };
export function validateCurriculum(c = curriculum, b = bank) {
  if (c.version !== b.version || b.review.status !== 'reviewed' || c.nodes.length !== 4 || b.nodes.length !== 4) throw Error('Unreviewed or mismatched curriculum');
  const slugs = new Set(c.nodes.map(n => n.slug));
  if (slugs.size !== 4) throw Error('Duplicate topic');
  for (const domain of ['dsa', 'web']) if (c.nodes.filter(n => n.domain === domain).length !== 2) throw Error('Unsupported domain count');
  const visited = new Set<string>(), visiting = new Set<string>(), questionIds = new Set<string>();
  function visit(slug: string) {
    if (visiting.has(slug)) throw Error('Curriculum cycle');
    if (visited.has(slug)) return;
    const node = c.nodes.find(n => n.slug === slug); if (!node) throw Error('Missing prerequisite');
    visiting.add(slug);
    for (const p of node.prerequisites) { if (c.nodes.find(n => n.slug === p)?.domain !== node.domain) throw Error('Foreign prerequisite'); visit(p); }
    visiting.delete(slug); visited.add(slug);
  }
  for (const n of c.nodes) {
    visit(n.slug);
    const questions = b.nodes.filter(q => q.slug === n.slug && q.domain === n.domain);
    if (questions.length !== 1 || questions[0].items.length !== 15) throw Error('Missing question group');
    for (const [mode, count] of [['checkpoint', 5], ['test-out', 10]] as const) if (questions[0].items.filter(q => q.mode === mode).length !== count) throw Error('Incomplete question bank');
    for (const q of questions[0].items) {
      if (questionIds.has(q.id) || !/^[a-z0-9-]{1,64}$/.test(q.id) || !q.prompt || q.prompt.length > 1000 || !q.explanation || q.explanation.length > 1500 || q.options.length !== 4 || new Set(q.options.map(o => o.id)).size !== 4 || new Set(q.options.map(o => o.text)).size !== 4 || !q.options.some(o => o.id === q.correct) || q.options.some(o => !/^[a-d]$/.test(o.id) || !o.text || o.text.length > 500)) throw Error('Invalid question');
      questionIds.add(q.id);
    }
  }
  return { nodes: c.nodes.length, questions: questionIds.size, version: c.version };
}
validateCurriculum();
// Reading installation and assessment DAG must describe the same released graph.
if(curriculumVersion!==curriculum.version)throw Error('Reading curriculum version mismatch');
for(const [domain,path] of Object.entries(starterPaths))for(const topic of path.nodes){
  const node=curriculum.nodes.find(n=>n.domain===domain&&n.slug===topic.slug);
  if(!node||node.label!==topic.label||node.resourceUrl!==topic.resource.url||JSON.stringify(node.prerequisites)!==JSON.stringify(topic.prerequisite?[topic.prerequisite]:[]))throw Error('Reading curriculum mismatch');
}
export { curriculum, bank };
