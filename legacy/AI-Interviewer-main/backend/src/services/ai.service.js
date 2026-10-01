const groq = require('../config/groq');
const { extractContextViaRAG, buildSemanticChunks, createAndStoreEmbeddings, retrieveContextForTopic } = require('./rag.service');
const { optimizeQuery } = require('./optimizer.service');
const SystemPrompt = require('../models/SystemPrompt.model');

const getActivePrompt = async (category, defaultVal) => {
  try {
    const promptDoc = await SystemPrompt.findOne({ category });
    return promptDoc ? promptDoc.content : defaultVal;
  } catch {
    return defaultVal;
  }
};

const formatPrompt = (template, vars) => {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
};

/**
 * Generate interview questions using Groq LLM (llama-3.3-70b-versatile)
 * @param {Object} params
 * @param {string} params.jobTitle
 * @param {string} params.jobDescription
 * @param {string} params.experienceLevel
 * @param {string[]} params.questionTypes
 * @param {number} params.numberOfQuestions
 * @param {string|null} params.resumeText
 * @returns {Promise<Array>} Array of question objects
 */
const generateInterviewQuestions = async ({
  jobTitle,
  jobDescription,
  experienceLevel,
  numberOfQuestions = 10,
  resumeText = null,
}) => {
  const optimizedContext = await extractContextViaRAG(resumeText, jobDescription);

  // Distribute questions: ~2/3 technical, ~1/3 behavioral (min 1 each)
  const technicalCount = Math.max(1, Math.round((numberOfQuestions * 2) / 3));
  const behavioralCount = Math.max(1, numberOfQuestions - technicalCount);

  const systemPrompt = `You are an expert technical interviewer and HR specialist.
You create precise, challenging, and role-relevant interview questions solely based on the provided context retrieved from RAG chunks.
NO HALLUCINATIONS: Do not ask questions about skills or tools not explicitly present in the provided context.
Always respond with valid JSON only — no extra text, no markdown fences.`;

  const userPrompt = `Act as an AI interviewer.

Given the following strictly retrieved chunks of candidate context and role requirements:
---
${optimizedContext}
---

Job Title: ${jobTitle}
Experience Level: ${experienceLevel}

Generate:
- ${technicalCount} technical questions
- ${behavioralCount} behavioral questions

Rules:
- STRICT GROUNDING: You MUST base every single question ONLY on the provided retrieved chunks above.
- If a technology or experience is not mentioned in the context, DO NOT generate a question about it.
- Questions must match candidate skill level (${experienceLevel}).
- Avoid generic questions.
- Behavioral questions should use STAR method format.
- Technical questions should test real-world problem solving.
- Include 3-5 expected keywords for each question.

Return structured JSON exactly in this format:
{
  "technical": [
    {
      "questionText": "...",
      "difficulty": "easy|medium|hard",
      "expectedKeywords": ["keyword1", "keyword2"]
    }
  ],
  "behavioral": [
    {
      "questionText": "...",
      "difficulty": "easy|medium|hard",
      "expectedKeywords": ["keyword1", "keyword2"]
    }
  ]
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI model.');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  const technicalQs = Array.isArray(parsed.technical) ? parsed.technical : [];
  const behavioralQs = Array.isArray(parsed.behavioral) ? parsed.behavioral : [];

  if (!technicalQs.length && !behavioralQs.length) {
    throw new Error('AI returned no valid questions. Please try again.');
  }

  // Flatten and map to MongoDB question schema format
  const allQuestions = [];
  
  technicalQs.forEach(q => {
    allQuestions.push({
      questionText: q.questionText || q.question || '',
      category: 'technical',
      difficulty: q.difficulty || 'medium',
      expectedKeywords: Array.isArray(q.expectedKeywords) ? q.expectedKeywords : [],
    });
  });

  behavioralQs.forEach(q => {
    allQuestions.push({
      questionText: q.questionText || q.question || '',
      category: 'behavioral',
      difficulty: q.difficulty || 'medium',
      expectedKeywords: Array.isArray(q.expectedKeywords) ? q.expectedKeywords : [],
    });
  });

  // Safety slice: ensure we never return more than the requested number of questions
  const trimmed = allQuestions.slice(0, numberOfQuestions);
  return trimmed.map((q, i) => ({ ...q, order: i + 1 }));
};

/**
 * Evaluate a candidate's answer using Groq
 */
const evaluateAnswer = async ({ questionText, answerText, expectedKeywords, jobTitle }) => {
  const defaultPrompt = `Act as an interviewer evaluating a candidate's response.

Job Title: \${jobTitle}
Question: \${questionText}
Expected Keywords Context: \${expectedKeywordsText}
Candidate's Answer: \${answerText}

Evaluate the candidate's answer strictly based on:
1. Correctness
2. Clarity
3. Depth

Return valid JSON exactly in this format:
{
  "score": <number 1-10>,
  "feedback": "<constructive feedback string explaining the evaluation based on correctness, clarity, and depth>"
}`;

  const rawTemplate = await getActivePrompt('ats_scorer', defaultPrompt);
  const prompt      = formatPrompt(rawTemplate, {
    jobTitle,
    questionText,
    expectedKeywordsText: expectedKeywords.join(', '),
    answerText: answerText || '(No answer provided)',
  });

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 512,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  return JSON.parse(content || '{}');
};

/**
 * Generate overall session feedback
 */
const generateOverallFeedback = async ({ jobTitle, answers }) => {
  const summary = answers
    .map((a, i) => `Q${i + 1}: ${a.questionText}\nScore: ${a.aiScore}/10\nAnswer: ${a.answerText?.slice(0, 200)}`)
    .join('\n\n');

  const defaultPrompt = `You are a senior interviewer providing a final interview report.
Be professional and concise.

Job Title: \${jobTitle}
Interview Summary:
\${summary}

Respond with valid JSON exacty in this format:
{
  "overallScore": <number 1-100>,
  "strengths": ["<point 1>", "<point 2>"],
  "weaknesses": ["<point 1>", "<point 2>"],
  "improvementTips": ["<point 1>", "<point 2>"]
}`;

  const rawTemplate = await getActivePrompt('feedback_report', defaultPrompt);
  const prompt      = formatPrompt(rawTemplate, { jobTitle, summary });

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  return JSON.parse(content || '{}');
};

/**
 * Parse Resume & Job Description into structured JSON
 * @param {string} resumeText - Raw extracted resume text
 * @param {string} jdText     - Job description text
 * @returns {Promise<Object>} Structured { resume, jobDescription } object
 */
const parseResumeAndJD = async (resumeText, jdText) => {
  const defaultPrompt = `You are an expert resume and job description parser.

Extract structured data in strict JSON format.

From Resume:
- name
- skills (array)
- experience (array of objects: role, company, duration, tech)
- projects (array: title, tech stack, description)
- education

From Job Description:
- role
- required_skills (array)
- preferred_skills (array)
- responsibilities (array)

Rules:
- Do not hallucinate
- If missing, return empty array or null
- Keep output strictly JSON`;

  const systemPrompt = await getActivePrompt('resume_parser', defaultPrompt);

  const userPrompt = `Input:
RESUME:
${resumeText || 'Not provided'}

JOB_DESCRIPTION:
${jdText || 'Not provided'}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI parser.');

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('AI parser returned invalid JSON.');
  }
};

/**
 * Generate specialized technical questions using RAG context
 * @param {Object} params
 * @param {string} params.retrievedChunks - Raw context from RAG
 * @param {Object} params.parsedResumeData - Structured resume JSON
 * @param {Object} params.parsedJdData - Structured job description JSON
 * @returns {Promise<string>} Numbered list of questions
 */
const generateSeniorTechnicalQuestions = async ({
  retrievedChunks,
  parsedResumeData,
  parsedJdData,
}) => {
  const systemPrompt = `You are a senior technical interviewer.

Generate interview questions using ONLY the provided context.

Rules:
- Do NOT use outside knowledge
- Questions must map directly to skills/projects in context
- Avoid generic questions
- Cover:
  - Core skills
  - Project-based questions
  - Problem-solving
- Difficulty: mixed (easy → hard)
- Max 5 questions`;

  const userPrompt = `Context:
${retrievedChunks}

Candidate Profile:
${JSON.stringify(parsedResumeData, null, 2)}

Job Requirements:
${JSON.stringify(parsedJdData, null, 2)}

Output:
Numbered list of questions.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content?.trim() || 'Failed to generate questions.';
};

/**
 * Strict technical evaluation of a candidate's answer using RAG context
 * @param {Object} params
 * @param {string} params.retrievedChunks - Raw context from RAG
 * @param {string} params.question - The question being answered
 * @param {string} params.answer - The candidate's answer
 * @returns {Promise<Object>} Evaluation JSON
 */
const evaluateStrictAnswer = async ({ retrievedChunks, question, answer }) => {
  const systemPrompt = `You are a strict technical interviewer.

Evaluate the candidate's answer using ONLY the given context.

Rules:
- Be strict, not generous
- Tie feedback directly to expected concepts in context
- No generic statements
- Penalize vague answers
- Always return valid JSON`;

  const userPrompt = `Context:
${retrievedChunks}

Question:
${question}

Candidate Answer:
${answer}

Return JSON exactly as:
{
  "score": (0-10),
  "correctness": "low | medium | high",
  "strengths": [],
  "weaknesses": [],
  "missed_concepts": [],
  "improvement_suggestions": []
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  try {
    return JSON.parse(content || '{}');
  } catch {
    throw new Error('AI evaluation returned invalid JSON.');
  }
};

/**
 * Generate a follow-up question based on the previous interaction
 * @param {Object} params
 * @param {string} params.retrievedChunks - Raw context from RAG
 * @param {string} params.question - The question previously asked
 * @param {string} params.answer - The candidate's answer
 * @returns {Promise<string>} Single follow-up question
 */
const generateFollowUpQuestion = async ({ retrievedChunks, question, answer }) => {
  const systemPrompt = `You are a technical interviewer.

Generate a follow-up question based on the previous interaction.

Rules:
- Focus on weak areas or gaps
- Increase depth of evaluation
- Do NOT repeat the same concept
- Keep it precise`;

  const userPrompt = `Context:
${retrievedChunks}

Previous Question:
${question}

Candidate Answer:
${answer}

Output:
Single follow-up question.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 512,
  });

  return response.choices[0]?.message?.content?.trim() || 'No follow-up generated.';
};

/**
 * Generate a comprehensive final evaluation report
 * @param {Array} allEvaluations - Array of individual answer evaluations
 * @returns {Promise<Object>} Structured report JSON
 */
const generateFinalEvaluationReport = async (allEvaluations) => {
  const systemPrompt = `You are a senior interviewer.

Generate a final evaluation report based on the provided session data.

Rules:
- Be decisive
- No vague feedback
- Base everything on evaluation data
- Always return valid JSON`;

  const userPrompt = `Evaluation Data:
${JSON.stringify(allEvaluations, null, 2)}

Return JSON exactly as:
{
  "overall_score": (0-10),
  "skill_breakdown": [
    { "skill": "", "score": 0-10 }
  ],
  "key_strengths": [],
  "key_weaknesses": [],
  "hire_decision": "yes | no | borderline",
  "improvement_plan": [
    "step 1",
    "step 2"
  ]
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  try {
    return JSON.parse(content || '{}');
  } catch {
    throw new Error('AI report generator returned invalid JSON.');
  }
};

/**
 * Validate whether a model response is grounded in the provided context
 * @param {Object} params
 * @param {string} params.retrievedChunks - Context used for grounding
 * @param {string} params.modelOutput - Output to be validated
 * @returns {Promise<Object>} Grounding validation result
 */
const validateGrounding = async ({ retrievedChunks, modelOutput }) => {
  const systemPrompt = `You are a validation system.

Check whether the response is fully supported by the context.

Return JSON exactly as:
{
  "grounded": true|false,
  "unsupported_claims": [],
  "reason": ""
}`;

  const userPrompt = `Context:
${retrievedChunks}

Response:
${modelOutput}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  try {
    return JSON.parse(content || '{}');
  } catch {
    throw new Error('AI validator returned invalid JSON.');
  }
};

/**
 * ── 6-STEP ORCHESTRATOR ──
 * Topic-based Dynamic Question Generator
 *
 * 1. Query Rewrite  (topic name -> technical goal string)
 * 2. Embed & Retrieve (Pinecone-like search on internal vectorStore)
 * 3. Retrieve top 5
 * 4. Format context
 * 5. Pass into Senior Technical Question Generator
 * 6. Generate questions
 */
const generateTopicQuestions = async ({ resumeText, jobDescription, topic, parsedResumeData, parsedJdData }) => {
  // Step 1: Prepare Vector Store
  const chunks      = buildSemanticChunks(resumeText, jobDescription);
  const vectorStore = await createAndStoreEmbeddings(chunks);

  // Step 2, 3 & 4: Retrieval & Format Context
  const context = await retrieveContextForTopic(vectorStore, topic);

  // Step 5 & 6: Generation (using our existing grounded generator logic)
  return generateSeniorTechnicalQuestions({
    retrievedChunks: context,
    parsedResumeData,
    parsedJdData,
  });
};

const generateQuestionsDirect = async (jobTitle, jobDescription) => {
  if (!jobTitle || !jobDescription) {
    throw new Error('Job title and job description are required.');
  }

  const systemPrompt = `You are a professional AI Technical Recruiter.
Generate 5 targeted, highly role-relevant interview questions (3 technical, 2 behavioral) based specifically on the provided Job Title and Job Description.
Always respond with a valid JSON object containing a "questions" key pointing to an array of question strings. Format:
{
  "questions": [
    "Question 1...",
    "Question 2...",
    "Question 3...",
    "Question 4...",
    "Question 5..."
  ]
}`;

  const userPrompt = `Job Title: ${jobTitle}
Job Description:
${jobDescription}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Failed to generate questions.');

  try {
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch (err) {
    logger.error('Failed to parse direct questions JSON from Groq:', err);
    throw new Error('Failed to parse questions response.');
  }
};

module.exports = {
  generateInterviewQuestions,
  evaluateAnswer,
  generateOverallFeedback,
  parseResumeAndJD,
  optimizeQuery,
  generateSeniorTechnicalQuestions,
  evaluateStrictAnswer,
  generateFollowUpQuestion,
  generateFinalEvaluationReport,
  validateGrounding,
  generateTopicQuestions,
  generateQuestionsDirect,
};







