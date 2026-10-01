const { OpenAIEmbeddings } = require('@langchain/openai');
const { chunkResumeAndJD } = require('./chunking.service');
const { normalizeChunks } = require('../utils/normalizer');
const { optimizeQuery } = require('./optimizer.service');

// ─────────────────────────────────────────────────────────────────────────────
//  Cosine Similarity (pure Node.js – no native FAISS needed on Windows)
// ─────────────────────────────────────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Step 1 – Semantic Chunking + Normalization
//  1a. chunkResumeAndJD  → metadata-tagged chunks
//  1b. normalizeChunks   → clean content ready for embedding
// ─────────────────────────────────────────────────────────────────────────────
const buildSemanticChunks = (resumeText, jdText) => {
  const raw = chunkResumeAndJD(resumeText || '', jdText || '');
  return normalizeChunks(raw); // ← clean before embedding
};

// ─────────────────────────────────────────────────────────────────────────────
//  Step 2 – Embedding Pipeline (in-memory vector store)
//  Each chunk is embedded preserving its metadata.
// ─────────────────────────────────────────────────────────────────────────────
const createAndStoreEmbeddings = async (chunks) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Required for embedding generation.');
  }

  const embeddingsClient = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
  const chunkTexts       = chunks.map((c) => c.content);
  const chunkVectors     = await embeddingsClient.embedDocuments(chunkTexts);

  // Return in-memory store: chunks retain full { content, metadata }
  return { embeddingsClient, chunks, chunkVectors };
};

// ─────────────────────────────────────────────────────────────────────────────
//  Step 3 – Retrieval with metadata-aware ranking
//
//  Strategy:
//   • Run TWO queries: one skill/tech-focused, one responsibility-focused
//   • Boost chunks from high-priority sections (skills, experience, responsibility)
//   • De-duplicate and return top K
// ─────────────────────────────────────────────────────────────────────────────

// Section priority weights for ranking boost
const SECTION_BOOST = {
  skills:                 1.25,
  experience:             1.20,
  responsibility:         1.20,
  requirements:           1.15,
  project:                1.10,
  required_skills:        1.15,
  experience_requirement: 1.10,
  preferred_skills:       1.05,
  summary:                1.00,
  education:              0.90,
  general:                0.85,
  overview:               0.85,
  benefits:               0.70,
  interests:              0.60,
  languages:              0.70,
  certification:          0.90,
  publication:            0.80,
};
const RETRIEVAL_GOALS = [
  'Extract exact technical skills, programming languages, and frameworks used in candidate projects.',
  'Identify core role responsibilities, required qualifications, and daily tasks for this job.',
];
const TOP_K = 6;

const retrieveRelevantContext = async (vectorStore) => {
  const allScores = new Map(); // chunkIndex → best boosted score

  // Optimize our retrieval goals using the LLM optimizer to get context-rich queries
  const optimizedQueries = await Promise.all(
    RETRIEVAL_GOALS.map((q) => optimizeQuery(q))
  );

  for (const query of optimizedQueries) {
    const queryVector = await vectorStore.embeddingsClient.embedQuery(query);

    vectorStore.chunks.forEach((chunk, idx) => {
      const rawSim   = cosineSimilarity(queryVector, vectorStore.chunkVectors[idx]);
      const boost    = SECTION_BOOST[chunk.metadata?.section] ?? 0.85;
      const boosted  = rawSim * boost;
      const existing = allScores.get(idx) ?? -Infinity;
      if (boosted > existing) allScores.set(idx, boosted);
    });
  }

  // Sort by score descending → take top K
  const sorted = [...allScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_K);

  // Format retrieved context with section label for the LLM
  return sorted
    .map(([idx]) => {
      const chunk = vectorStore.chunks[idx];
      const label = `[${chunk.metadata.type.toUpperCase()} › ${chunk.metadata.section}]`;
      return `${label}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main RAG Pipeline Orchestrator
// ─────────────────────────────────────────────────────────────────────────────
const extractContextViaRAG = async (resumeText, jobDescription) => {
  try {
    // Step 1: Semantic chunk with metadata
    const chunks = buildSemanticChunks(resumeText, jobDescription);

    if (chunks.length === 0) {
      return `Fallback Context:\nJD: ${(jobDescription || '').slice(0, 1000)}\nResume: ${(resumeText || '').slice(0, 1000)}`;
    }

    // Step 2: Embed & store
    const vectorStore = await createAndStoreEmbeddings(chunks);

    // Step 3: Retrieve with boosted semantic search
    const retrievedContext = await retrieveRelevantContext(vectorStore);

    return retrievedContext;
  } catch (error) {
    console.error('RAG Pipeline Error:', error);
    // Graceful fallback if OpenAI key is missing or embedding fails
    return `Fallback Context:\nJD: ${(jobDescription || '').slice(0, 1000)}\nResume: ${(resumeText || '').slice(0, 1000)}`;
  }
};

/**
 * Targetted Context Retrieval for a specific topic
 * 1. Query Rewrite (Topic -> Precise search query)
 * 2. Embed & Retrieve
 */
const retrieveContextForTopic = async (vectorStore, topic) => {
  if (!topic) return '';

  // Step 1: Query Rewrite
  const optimizedQuery = await optimizeQuery(topic);

  // Step 2 & 3: Embed & Retrieve
  const queryVector = await vectorStore.embeddingsClient.embedQuery(optimizedQuery);

  const scores = vectorStore.chunks.map((chunk, idx) => {
    const rawSim = cosineSimilarity(queryVector, vectorStore.chunkVectors[idx]);
    const boost = SECTION_BOOST[chunk.metadata?.section] ?? 1.0;
    return { idx, score: rawSim * boost };
  });

  const topChunks = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Retrieve top 5 as requested

  // Step 4: Format context
  return topChunks
    .map(({ idx }) => {
      const chunk = vectorStore.chunks[idx];
      const label = `[${chunk.metadata.type.toUpperCase()} › ${chunk.metadata.section}]`;
      return `${label}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');
};

module.exports = { extractContextViaRAG, buildSemanticChunks, createAndStoreEmbeddings, retrieveContextForTopic };

