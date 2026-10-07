// Explicit disposable integration transport; never loaded by production startup.
if (process.env.NODE_ENV !== 'test' || !process.env.INTERVIEW_MONGO_URI?.includes('/collegehubs_demo_interview')) throw new Error('Disposable Interview fixture required');
process.env.GROQ_API_KEY = 'fixture-only-not-a-provider-key';
process.env.GROQ_FREE_CONFIRMED = 'true';
process.env.INTERVIEW_PROVIDER_FIXTURE = 'true';
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  if (url !== 'https://api.groq.com/openai/v1/chat/completions') return realFetch(url, options);
  const body = JSON.parse(options.body), text = body.messages[1].content;
  if (text.includes('[fixture:timeout]')) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  if (text.includes('[fixture:429]')) return Response.json({}, { status: 429, headers: { 'Retry-After': '1' } });
  if (text.includes('[fixture:malformed]')) return new Response('{broken', { headers: { 'Content-Type': 'application/json' } });
  await new Promise(resolve => setTimeout(resolve, 150));
  const data = JSON.parse(text.slice('BEGIN_UNTRUSTED_DATA\n'.length, -'\nEND_UNTRUSTED_DATA'.length));
  const output = data.categoryOrder ? { questions: data.categoryOrder.map((category, i) => ({ questionText: `Synthetic practice ${i+1}: explain ${['arrays','functions','promises','objects','tests'][i]} with an example.`, category, difficulty: 'medium', expectedKeywords: ['example','tradeoff'] })) } : { summary: 'Synthetic fixture feedback; not a live AI report.', answers: data.answers.map(a => ({ questionId: a.questionId, score: 8, feedback: 'Synthetic feedback: include a concrete example and tradeoff.' })) };
  return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] });
};
