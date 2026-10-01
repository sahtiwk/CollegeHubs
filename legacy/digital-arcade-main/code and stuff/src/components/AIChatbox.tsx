import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Loader, AlertTriangle } from 'lucide-react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const RATE_LIMIT_COOLDOWN = 60000; // 1 minute cooldown

export default function AIChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    setIsRateLimited(true);
    const endTime = Date.now() + RATE_LIMIT_COOLDOWN;
    setCooldownEndTime(endTime);

    cooldownTimerRef.current = setTimeout(() => {
      setIsRateLimited(false);
      setCooldownEndTime(null);
      setError(null);
    }, RATE_LIMIT_COOLDOWN);
  };

  const getRemainingCooldown = () => {
    if (!cooldownEndTime) return 0;
    const remaining = Math.max(0, cooldownEndTime - Date.now());
    return Math.ceil(remaining / 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isRateLimited) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a friendly and helpful AI assistant. Keep responses concise and engaging. Act casual and conversational."
          },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: "user",
            content: userMessage
          }
        ]
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (aiResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (error: any) {
      console.error('Error:', error);
      
      if (error?.status === 429) {
        startCooldown();
        setError(
          "The AI service is currently unavailable due to high demand. " +
          "Please wait a moment before trying again."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
      
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 z-50"
        title="Chat with AI"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-purple-900/95 backdrop-blur-lg border border-purple-500/20 rounded-xl shadow-2xl flex flex-col z-50">
          <div className="flex justify-between items-center p-4 border-b border-purple-500/20">
            <h3 className="text-xl font-semibold text-white">AI Chat</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-4">
                <p>👋 Hi! How can I help you today?</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-800/50 text-gray-200'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-purple-800/50 p-3 rounded-lg text-gray-200">
                  <Loader className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-300" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
              {isRateLimited && (
                <p className="text-red-200 text-sm mt-1">
                  Try again in {getRemainingCooldown()} seconds
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t border-purple-500/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRateLimited ? "Please wait..." : "Type your message..."}
                className="flex-1 px-4 py-2 bg-purple-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                disabled={isLoading || isRateLimited}
              />
              <button
                type="submit"
                disabled={isLoading || isRateLimited || !input.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}