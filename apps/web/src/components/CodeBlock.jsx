import React from 'react';
import channelContract from '@collegehubs/contracts/channel.cjs';

const keywords = new Set('const let var function return if else for while class new import export from async await throw try catch true false null undefined def in not and or None True False lambda with as pass break continue public private static void int string String boolean double include SELECT FROM WHERE JOIN ON INSERT INTO VALUES UPDATE SET'.split(' '));
// A bounded lexical highlighter: only text nodes and allowlisted span classes.
// No HTML generation, auto-detection, eval, dynamic grammar imports, or pasted markup.
export function codeTokens(source, language) {
  if (!channelContract.languages.includes(language) || language === 'plaintext') return [source];
  const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
  const parts = []; let offset = 0;
  for (const match of source.matchAll(pattern)) {
    parts.push(source.slice(offset, match.index));
    const value = match[0];
    const kind = /^(\/\/|\/\*|#)/.test(value) ? 'comment' : /^["'`]/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : keywords.has(value) ? 'keyword' : null;
    parts.push(kind ? { value, kind } : value); offset = match.index + value.length;
  }
  parts.push(source.slice(offset)); return parts;
}
export default function CodeBlock({ text, language }) {
  return <div className="code-block"><div className="code-caption">{channelContract.languages.includes(language) ? language : 'plaintext'} &middot; saved code</div>
    <pre tabIndex={0} aria-label={`${language || 'Plain text'} code; scroll horizontally for long lines`}><code>{codeTokens(text, language).map((part, index) => typeof part === 'string' ? part : <span key={index} className={'syntax-' + part.kind}>{part.value}</span>)}</code></pre>
  </div>;
}
