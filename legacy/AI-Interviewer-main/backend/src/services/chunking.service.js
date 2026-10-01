/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  chunking.service.js
 *  Semantic Document Chunking System
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Rules (from prompt spec):
 *   • Each chunk represents a single idea
 *   • Max 300 tokens per chunk  (~1 200 chars at ~4 chars/token)
 *   • Preserve context – never cut mid-sentence
 *   • Metadata: { type: 'resume' | 'job_description', section: string }
 *
 *  Returns: Array<{ content: string, metadata: { type, section } }>
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_CHARS = 1200; // ≈ 300 tokens (4 chars / token estimate)

// ── Section-header patterns (resume) ──────────────────────────────────────
const RESUME_SECTIONS = [
  { pattern: /\b(skills?|technical\s+skills?|core\s+competencies|technologies|tools)\b/i,     section: 'skills' },
  { pattern: /\b(work\s+experience|experience|employment|career|professional\s+background)\b/i, section: 'experience' },
  { pattern: /\b(projects?|personal\s+projects?|key\s+projects?)\b/i,                         section: 'project' },
  { pattern: /\b(education|academic|qualification|degree|university|college|school)\b/i,       section: 'education' },
  { pattern: /\b(certifications?|licen[sc]es?|awards?|achievements?)\b/i,                     section: 'certification' },
  { pattern: /\b(summary|objective|profile|about\s+me|career\s+objective)\b/i,                section: 'summary' },
  { pattern: /\b(publications?|research|papers?)\b/i,                                         section: 'publication' },
  { pattern: /\b(languages?|spoken\s+languages?)\b/i,                                         section: 'languages' },
  { pattern: /\b(interests?|hobbies|extracurricular)\b/i,                                     section: 'interests' },
];

// ── Section-header patterns (job description) ─────────────────────────────
const JD_SECTIONS = [
  { pattern: /\b(responsibilities?|duties|you\s+will|what\s+you.ll\s+do)\b/i,                 section: 'responsibility' },
  { pattern: /\b(requirements?|required\s+skills?|must\s+have|qualifications?)\b/i,           section: 'requirements' },
  { pattern: /\b(preferred|nice\s+to\s+have|bonus|desirable)\b/i,                             section: 'preferred_skills' },
  { pattern: /\b(benefits?|perks?|what\s+we\s+offer|compensation)\b/i,                        section: 'benefits' },
  { pattern: /\b(about\s+(us|the\s+company|the\s+role)|overview|description)\b/i,             section: 'overview' },
  { pattern: /\b(skills?|technical\s+skills?|stack|technologies)\b/i,                         section: 'required_skills' },
  { pattern: /\b(experience\s+required|years?\s+of\s+experience)\b/i,                         section: 'experience_requirement' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Rough token count: 1 token ≈ 4 chars
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Detect the most likely section label for a block of text.
 */
function detectSection(text, patterns) {
  for (const { pattern, section } of patterns) {
    if (pattern.test(text)) return section;
  }
  return 'general';
}

/**
 * Split a long text block into sentence-safe sub-chunks ≤ MAX_CHARS.
 * Splits on sentence boundaries ('. ', '! ', '? ', '\n') to avoid cuts.
 */
function splitBySentences(text, maxChars) {
  if (text.length <= maxChars) return [text.trim()].filter(Boolean);

  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const subChunks = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) subChunks.push(current.trim());
      // If a single sentence itself exceeds maxChars, hard-split at word boundary
      if (sentence.length > maxChars) {
        const words  = sentence.split(' ');
        let wordBuf  = '';
        for (const word of words) {
          if ((wordBuf + ' ' + word).length > maxChars) {
            if (wordBuf) subChunks.push(wordBuf.trim());
            wordBuf = word;
          } else {
            wordBuf = wordBuf ? `${wordBuf} ${word}` : word;
          }
        }
        current = wordBuf;
      } else {
        current = sentence;
      }
    }
  }
  if (current.trim()) subChunks.push(current.trim());
  return subChunks;
}

/**
 * Split a raw text document into semantic section blocks.
 * Detects headers as lines that are SHORT (<= 80 chars) and match a section pattern,
 * or are followed by a blank line / all-caps text.
 */
function splitIntoSections(text) {
  const lines    = text.split('\n');
  const sections = [];
  let currentHeader = null;
  let buffer        = [];

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (content) sections.push({ header: currentHeader, content });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Identify a section header: short line, possibly all-caps or ends with ':'
    const looksLikeHeader =
      trimmed.length > 0 &&
      trimmed.length <= 80 &&
      (
        /^[A-Z\s&/]{4,}$/.test(trimmed) ||          // ALL CAPS
        /^[A-Za-z\s&/]+:$/.test(trimmed) ||          // Title:
        /^#{1,3}\s/.test(trimmed)                     // Markdown heading
      );

    if (looksLikeHeader) {
      flush();
      currentHeader = trimmed.replace(/^#+\s*/, '').replace(/:$/, '').trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

// ── Main chunking function ─────────────────────────────────────────────────

/**
 * Chunk a document into semantically meaningful, metadata-tagged pieces.
 *
 * @param {string} text   - Raw document text
 * @param {'resume'|'job_description'} type
 * @returns {{ content: string, metadata: { type: string, section: string } }[]}
 */
function chunkDocument(text, type) {
  if (!text || !text.trim()) return [];

  const patterns = type === 'resume' ? RESUME_SECTIONS : JD_SECTIONS;
  const rawSections = splitIntoSections(text);

  /** @type {{ content: string, metadata: { type: string, section: string } }[]} */
  const chunks = [];

  for (const { header, content } of rawSections) {
    if (!content.trim()) continue;

    // Determine section from header text first, then fall back to content scan
    const sectionProbe = header ? `${header}\n${content.slice(0, 200)}` : content.slice(0, 200);
    const section      = detectSection(sectionProbe, patterns);

    // Split into ≤300-token sub-chunks (sentence-safe)
    const subChunks = splitBySentences(content, MAX_CHARS);

    for (const sub of subChunks) {
      if (!sub.trim()) continue;
      const finalContent = header ? `${header}\n${sub}` : sub;
      chunks.push({
        content: finalContent.trim(),
        metadata: { type, section },
      });
    }
  }

  // Edge case: if section detection found nothing (no headers at all), chunk the whole text
  if (chunks.length === 0) {
    const subChunks = splitBySentences(text.trim(), MAX_CHARS);
    for (const sub of subChunks) {
      if (sub.trim()) {
        chunks.push({
          content: sub.trim(),
          metadata: { type, section: detectSection(sub, patterns) },
        });
      }
    }
  }

  return chunks;
}

/**
 * Chunk both resume and job description, returning a unified metadata-tagged array.
 *
 * @param {string|null} resumeText
 * @param {string|null} jdText
 * @returns {{ content: string, metadata: { type: string, section: string } }[]}
 */
function chunkResumeAndJD(resumeText, jdText) {
  const resumeChunks = resumeText
    ? chunkDocument(resumeText, 'resume')
    : [];

  const jdChunks = jdText
    ? chunkDocument(jdText, 'job_description')
    : [];

  return [...jdChunks, ...resumeChunks]; // JD first for RAG query relevance
}

module.exports = { chunkDocument, chunkResumeAndJD, estimateTokens };
