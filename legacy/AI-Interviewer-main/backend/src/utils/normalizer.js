/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  normalizer.js  –  Text Cleaning & Normalization for Embedding
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Rules:
 *   1. Remove noise  : extra spaces, special symbols, zero-width chars, BOM
 *   2. Preserve tech : never expand or mangle known technical keywords
 *   3. Expand abbrs  : obvious abbreviations → full form (JS → JavaScript, etc.)
 *   4. Keep concise  : collapse redundant whitespace, strip decorative separators
 *
 *  Returns cleaned plain text only (no JSON wrapper).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Abbreviation expansion table ──────────────────────────────────────────────
// Order matters: longer / more specific entries first to avoid partial replacements.
// Wrapped in \b word-boundary assertions so "JS" inside "JSON" is NOT expanded.
const ABBREVIATIONS = [
  // Languages & runtimes
  [/\bJS\b/g,          'JavaScript'],
  [/\bTS\b/g,          'TypeScript'],
  [/\bPY\b/g,          'Python'],
  [/\bRB\b/g,          'Ruby'],
  [/\bGO\b(?!\s*lang)/gi, 'Golang'],   // GO but not "Golang" (already full)
  [/\bRS\b/g,          'Rust'],
  [/\bKT\b/g,          'Kotlin'],
  [/\bSW\b/g,          'Swift'],

  // Frameworks & libraries (guard against already-expanded tokens)
  [/\bRJS\b/g,         'React.js'],
  [/\bVJS\b/g,         'Vue.js'],
  [/\bNJS\b/g,         'Node.js'],
  [/\bNEXT\b(?!\.\s*js)/gi, 'Next.js'],
  [/\bEXP\b/g,         'Express.js'],

  // Cloud & DevOps
  [/\bAWS\b/g,         'Amazon Web Services'],
  [/\bGCP\b/g,         'Google Cloud Platform'],
  [/\bAZ\b/g,          'Microsoft Azure'],
  [/\bK8S\b/gi,        'Kubernetes'],
  [/\bK8\b/gi,         'Kubernetes'],
  [/\bCI\/CD\b/gi,     'Continuous Integration and Continuous Delivery'],
  [/\bIaC\b/g,         'Infrastructure as Code'],

  // Databases
  [/\bPG\b/g,          'PostgreSQL'],
  [/\bMDB\b/g,         'MongoDB'],
  [/\bMSSQL\b/g,       'Microsoft SQL Server'],
  [/\bSQLite\b/gi,     'SQLite'],

  // Protocols & concepts
  [/\bREST\b/g,        'REST API'],
  [/\bGQL\b/g,         'GraphQL'],
  [/\bOOP\b/g,         'Object-Oriented Programming'],
  [/\bFP\b/g,          'Functional Programming'],
  [/\bTDD\b/g,         'Test-Driven Development'],
  [/\bBDD\b/g,         'Behavior-Driven Development'],
  [/\bDDD\b/g,         'Domain-Driven Design'],
  [/\bMVC\b/g,         'Model-View-Controller'],
  [/\bAPI\b/g,         'API'],        // keep as-is (already well-known, no expansion)
  [/\bSDK\b/g,         'SDK'],
  [/\bLLM\b/g,         'Large Language Model'],
  [/\bNLP\b/g,         'Natural Language Processing'],
  [/\bML\b/g,          'Machine Learning'],
  [/\bAI\b/g,          'Artificial Intelligence'],
  [/\bDL\b/g,          'Deep Learning'],
  [/\bRAG\b/g,         'Retrieval-Augmented Generation'],

  // Common resume abbreviations
  [/\byrs?\b/gi,       'years'],
  [/\bmos?\b/gi,       'months'],
  [/\bsr\.?\b/gi,      'Senior'],
  [/\bjr\.?\b/gi,      'Junior'],
  [/\bmgr\.?\b/gi,     'Manager'],
  [/\bdev\.?\b/gi,     'Developer'],
  [/\beng\.?\b/gi,     'Engineer'],
  [/\barch\.?\b/gi,    'Architect'],
  [/\bswe\b/gi,        'Software Engineer'],
  [/\bpm\b/gi,         'Project Manager'],
  [/\bpo\b/gi,         'Product Owner'],
  [/\bui\b/gi,         'User Interface'],
  [/\bux\b/gi,         'User Experience'],
  [/\bqa\b/gi,         'Quality Assurance'],
  [/\bdba\b/gi,        'Database Administrator'],
];

// ── Noise patterns ────────────────────────────────────────────────────────────
// Things to REMOVE or REPLACE (without losing meaning)
const NOISE_RULES = [
  // BOM / zero-width / invisible characters
  [/[\uFEFF\u200B\u200C\u200D\u00AD]/g, ''],

  // Decorative separators (lines of dashes, dots, underscores, asterisks, equals)
  [/^[\s\-_=*•·.]{3,}$/gm, ''],

  // Bullet-point decorators at line start
  [/^[\s]*[•●◦▸▹►▷◆◇■□✓✔✗✘\-–—]+\s*/gm, ''],

  // Parenthesised empty groups e.g. "()", "[]", "{}"
  [/\(\s*\)|\[\s*\]|\{\s*\}/g, ''],

  // E-mail address (privacy / noise for embeddings)
  [/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, '[email]'],

  // Phone numbers (various formats)
  [/(\+?\d[\d\s\-().]{7,}\d)/g, '[phone]'],

  // URLs (keep domain hint but remove full URL noise)
  [/https?:\/\/\S+/gi, '[url]'],

  // Repeated punctuation: "...", "---", "___", "!!!", "???"
  [/([!?.,;:\-_=*])\1{2,}/g, '$1'],

  // Non-ASCII symbols that don't add meaning (keep %, $, #, @, &, +, -, /)
  [/[^\x00-\x7F]/g, ' '],

  // Multiple spaces / tabs on a single line → single space
  [/[ \t]{2,}/g, ' '],

  // More than 2 consecutive blank lines → 1 blank line
  [/(\r?\n){3,}/g, '\n\n'],
];

// ── Technical keyword safelist ────────────────────────────────────────────────
// These tokens must NEVER be altered. We temporarily replace them with a
// placeholder before abbreviation expansion, then restore them afterwards.
const PROTECTED_TOKENS = [
  // Version strings like "Node.js 18", "Python 3.11", "React 18.2"
  /\b(Node\.js|React\.js|Vue\.js|Next\.js|Express\.js|Angular\.js|Svelte\.js)\b/gi,
  // File extensions as tech references: ".ts", ".jsx", etc.
  /\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|cpp|c|sh|yaml|yml|json|env)\b/gi,
  // Known compound keywords that contain abbreviations
  /\b(JSON|YAML|TOML|HTML|CSS|SCSS|SASS|DOM|SQL|NoSQL|GraphQL|gRPC|OAuth|JWT|CORS|CSRF|XSS|HTTPS|HTTP|WebSocket|WebRTC|WASM)\b/gi,
  // Common version patterns "v1", "v2.0", "ES6", "ES2022", "ECMAScript"
  /\b(ES\d+|ECMAScript|v\d[\d.]*)\b/gi,
];

// ── Core normalizer ────────────────────────────────────────────────────────────

/**
 * Normalize a single string for embedding.
 *
 * @param {string} text - Raw chunk content
 * @returns {string}    - Cleaned, normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  let t = text;

  // ── 1. Apply noise removal rules ─────────────────────────────────
  for (const [pattern, replacement] of NOISE_RULES) {
    t = t.replace(pattern, replacement);
  }

  // ── 2. Protect technical tokens before abbreviation expansion ─────
  const placeholders = [];
  for (const tokenPattern of PROTECTED_TOKENS) {
    t = t.replace(tokenPattern, (match) => {
      const idx = placeholders.length;
      placeholders.push(match);
      return `__PROTECTED_${idx}__`;
    });
  }

  // ── 3. Expand abbreviations ───────────────────────────────────────
  for (const [pattern, expansion] of ABBREVIATIONS) {
    t = t.replace(pattern, expansion);
  }

  // ── 4. Restore protected tokens ───────────────────────────────────
  placeholders.forEach((original, idx) => {
    t = t.replace(`__PROTECTED_${idx}__`, original);
  });

  // ── 5. Final whitespace cleanup ───────────────────────────────────
  t = t
    .split('\n')
    .map((line) => line.trim())        // trim each line
    .filter((line) => line.length > 0) // drop blank lines
    .join('\n')
    .trim();

  return t;
}

/**
 * Normalize an array of chunk objects (as produced by chunking.service).
 * Returns a new array; originals are not mutated.
 *
 * @param {{ content: string, metadata: object }[]} chunks
 * @returns {{ content: string, metadata: object }[]}
 */
function normalizeChunks(chunks) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      content: normalizeText(chunk.content),
    }))
    .filter((chunk) => chunk.content.length > 0); // drop chunks that became empty
}

module.exports = { normalizeText, normalizeChunks };
