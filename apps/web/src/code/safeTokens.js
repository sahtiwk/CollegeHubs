// Parse the library output in an inert document; only text and vetted span classes survive.
export function safeTokens(html, source) {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const allowed = new Set(['keyword','string','number','comment','title','built_in','literal','type','attr','attribute','tag','name','selector-tag','selector-class','property','meta','punctuation','operator','variable','params','function','subst','symbol','regexp']);
 function walk(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1 || node.tagName !== 'SPAN') throw Error('Unexpected highlight markup');
  const kind = [...node.classList].map(c => c.replace(/^hljs-/, '')).find(c => allowed.has(c));
  return { kind: kind || 'plain', children: [...node.childNodes].map(walk) };
 }
 const result = [...doc.body.childNodes].map(walk);
 const plain = nodes => nodes.map(n => typeof n === 'string' ? n : plain(n.children)).join('');
 if (plain(result) !== source) throw Error('Source changed');
 return result;
}
