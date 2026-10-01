const Groq = require('groq-sdk');
require('dotenv').config();

if (!process.env.GROQ_API_KEY) {
  console.warn('[GROQ] Warning: GROQ_API_KEY is missing from environment variables.');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

module.exports = groq;
