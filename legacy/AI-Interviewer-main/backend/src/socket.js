const { Server } = require("socket.io");
const Groq = require("groq-sdk");
require("dotenv").config();
const SystemPrompt = require('./models/SystemPrompt.model');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Listen for live interview responses
    socket.on("live_answer", async ({ questionText, answerText, expectedKeywords }) => {
      try {
        let systemPromptText = `Act as an AI interviewer. The candidate just responded to the following question. Provide a brief, conversational, and direct 1-3 sentence follow-up or acknowledgment based ONLY on their answer. Do not return JSON. Just speak as an interviewer naturally.`;
        try {
          const doc = await SystemPrompt.findOne({ category: 'interview' });
          if (doc) systemPromptText = doc.content;
        } catch (e) { /* ignore fallback */ }

        const prompt = `${systemPromptText}

Question: ${questionText}
Expected Keywords: ${expectedKeywords?.join(', ') || 'None'}
Candidate Answer: ${answerText || '(silence)'}`;

        const stream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 150,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            socket.emit("ai_chunk", content);
          }
        }
        
        // Let the client know the AI finished speaking
        socket.emit("ai_complete");
      } catch (error) {
        console.error("Socket Groq Error:", error);
        socket.emit("ai_error", "Failed to get AI response.");
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
