const loaders = {
 javascript: () => import('highlight.js/lib/languages/javascript'),
 typescript: () => import('highlight.js/lib/languages/typescript'),
 python: () => import('highlight.js/lib/languages/python'),
 json: () => import('highlight.js/lib/languages/json'),
 html: () => import('highlight.js/lib/languages/xml'),
 css: () => import('highlight.js/lib/languages/css'),
 java: () => import('highlight.js/lib/languages/java'),
 cpp: () => import('highlight.js/lib/languages/cpp'),
 sql: () => import('highlight.js/lib/languages/sql'),
};
self.onmessage = async ({ data: { text, language } }) => {
 try {
  if (!Object.hasOwn(loaders, language) || typeof text !== 'string' || new TextEncoder().encode(text).length > 32768) throw Error('Unsupported source');
  const [{ default: hljs }, { default: grammar }] = await Promise.all([import('highlight.js/lib/core'), loaders[language]()]);
  hljs.registerLanguage(language, grammar);
  self.postMessage({ html: hljs.highlight(text, { language, ignoreIllegals: true }).value });
 } catch { self.postMessage({ failed: true }); }
};
