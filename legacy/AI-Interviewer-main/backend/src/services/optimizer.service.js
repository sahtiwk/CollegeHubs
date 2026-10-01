const groq = require('../config/groq');

/**
 * Optimize a search query for vector search using Groq LLM
 * 
 * Rules:
 * - Focus on technical intent
 * - Expand abbreviations (e.g., JS → JavaScript)
 * - Include relevant skills, tools, or concepts
 * - Keep it concise (1–2 lines max)
 *
 * @param {string} userQuery - Raw user query
 * @returns {Promise<string>} Optimized query
 */
const optimizeQuery = async (userQuery) => {
  if (!userQuery || !userQuery.trim()) return '';

  const systemPrompt = `You are a semantic query optimizer for vector search.

Convert the user input into a precise, context-rich search query.

Rules:
- Focus on technical intent
- Expand abbreviations (e.g., JS → JavaScript)
- Include relevant skills, tools, or concepts
- Keep it concise (1–2 lines max)`;

  const userPrompt = `User Input:
${userQuery}

Output:
Optimized query only.`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const content = response.choices[0]?.message?.content?.trim();
    // Strip quotes if AI returned them
    return content ? content.replace(/^["']|["']$/g, '') : userQuery;
  } catch (err) {
    console.error('[Optimizer Service Error]:', err);
    return userQuery; // Fallback to raw query on error
  }
};

module.exports = { optimizeQuery };
