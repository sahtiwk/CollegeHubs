import React, { useEffect, useState } from 'react';
import channelContract from '@collegehubs/contracts/channel.cjs';
import { safeTokens } from '../code/safeTokens';
function render(nodes) { return nodes.map((node,index) => typeof node === 'string' ? node : <span key={index} className={'syntax-' + node.kind}>{render(node.children)}</span>); }
export default function CodeBlock({ text, language }) {
 const source = typeof text === 'string' ? text : '';
 const known = channelContract.languages.includes(language) ? language : 'plaintext';
 const [result, setResult] = useState(null), [copied, setCopied] = useState('');
 useEffect(() => {
  setResult(null); setCopied('');
  if (known === 'plaintext' || new TextEncoder().encode(source).length > 32768) return;
  let worker, timer, stopped = false;
  const stop = () => { stopped = true; clearTimeout(timer); worker?.terminate(); };
  try {
   worker = new Worker(new URL('../code/highlight.worker.js', import.meta.url), { type: 'module' });
   timer = setTimeout(stop, 3000);
   worker.onmessage = ({data}) => { if (stopped) return; try { if (!data.failed) setResult({ source, known, tokens: safeTokens(data.html, source) }); } catch { /* Literal text stays visible. */ } stop(); };
   worker.onerror = stop; worker.postMessage({ text: source, language: known });
  } catch { stop(); }
  return stop;
 }, [source, known]);
 async function copy() { try { await navigator.clipboard.writeText(source); setCopied('Copied exactly.'); } catch { setCopied('Select the code to copy it.'); } }
 return <div className="code-block"><div className="code-caption"><span>{known} · saved source</span><button onClick={copy}>Copy code</button></div><pre tabIndex={0} aria-label={`${known} code; scroll horizontally for long lines`}><code>{result?.source === source && result.known === known ? render(result.tokens) : source}</code></pre><span className="code-copy-status" role="status">{copied}</span></div>;
}
