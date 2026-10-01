"use client";

import { useState, useRef, useEffect } from 'react';
import { useDashboardOptional } from '@/app/dashboard/DashboardContext';
import { useAuth } from '@clerk/nextjs';

interface Message {
  role: 'user' | 'tutor';
  content: string;
  references?: string[];
  groundingFound?: boolean;
}

export default function TutorChat() {
  const dashboard = useDashboardOptional();
  const selectedNodeId = dashboard?.selectedNodeId || null;
  const isLoaded = dashboard ? dashboard.isLoaded : true; // Assume loaded if outside dashboard
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (selectedNodeId) {
      setMessages([
        {
          role: 'tutor',
          content: `Hi! I'm your AI Tutor. Do you have any questions about this specific module?`
        }
      ]);
    } else {
      setMessages([
        {
          role: 'tutor',
          content: `Hi! I'm your AI Tutor. Feel free to ask me anything about your learning path.`
        }
      ]);
    }
  }, [selectedNodeId]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/tutor/slow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: selectedNodeId, query: userMessage.content }),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'tutor', 
            content: data.answer,
            references: data.references,
            groundingFound: data.groundingFound
          }
        ]);
      } else {
        setMessages(prev => [...prev, { role: 'tutor', content: data.message || 'Sorry, I encountered an error.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'tutor', content: 'Network error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isLoaded || !isAuthLoaded || !userId) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'var(--brand-slate-deep)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 90,
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          {isOpen ? 'close' : 'smart_toy'}
        </span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 104,
            right: 32,
            width: 360,
            height: 520,
            maxHeight: 'calc(100vh - 140px)',
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 90,
            border: '1px solid rgba(0,0,0,0.1)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'var(--brand-slate-deep)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--brand-blue-sky)' }}>smart_toy</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>AI Tutor</h3>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8, color: 'white' }}>Grounded in your curriculum</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: '#F8FAFC',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'var(--brand-blue-navy)' : 'white',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: 16,
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: msg.role === 'tutor' ? 4 : 16,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  border: msg.role === 'tutor' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}>
                  {msg.content}
                </div>
                
                {msg.role === 'tutor' && msg.groundingFound === false && (
                  <span style={{ fontSize: 10, color: '#EA580C', marginTop: 4, paddingLeft: 4 }}>
                    ⚠️ Not grounded in curriculum
                  </span>
                )}

                {msg.role === 'tutor' && msg.references && msg.references.length > 0 && (
                  <div style={{ marginTop: 6, paddingLeft: 4 }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>Sources:</span>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 14, fontSize: 11, color: '#6B7280' }}>
                      {msg.references.map((ref, idx) => (
                        <li key={idx}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'white', padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', gap: 4 }}>
                <div style={{ width: 6, height: 6, background: '#CBD5E1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                <div style={{ width: 6, height: 6, background: '#CBD5E1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s' }} />
                <div style={{ width: 6, height: 6, background: '#CBD5E1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: 16, background: 'white', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                disabled={isTyping}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(0,0,0,0.1)',
                  outline: 'none',
                  fontSize: 14,
                  background: 'white',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                style={{
                  background: input.trim() ? 'var(--brand-blue-navy)' : '#E2E8F0',
                  color: 'white',
                  border: 'none',
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); transform-origin: bottom right; }
          to { opacity: 1; transform: translateY(0) scale(1); transform-origin: bottom right; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
