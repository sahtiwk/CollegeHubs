import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, SkipForward, CheckCircle,
  Clock, Mic, Send, Loader2, AlertCircle, BrainCircuit, Volume2, VolumeX, MessageSquare
} from 'lucide-react';
import { io } from 'socket.io-client';
import { interviewAPI, sessionAPI } from '@/services/api';
import toast from 'react-hot-toast';

const DIFFICULTY_CLR = { easy: 'badge-success', medium: 'badge-warning', hard: 'badge-danger' };
const CATEGORY_CLR   = { technical: 'badge-brand', behavioral: 'badge-slate', situational: 'badge-warning', hr: 'badge-success', culture_fit: 'badge-danger' };

export default function InterviewSessionPage() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [session, setSession]     = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [savedAnswers, setSavedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Live WebSocket AI Flow
  const [socket, setSocket] = useState(null);
  const [liveFeedback, setLiveFeedback] = useState('');
  const [isReceivingFeedback, setIsReceivingFeedback] = useState(false);

  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true });
    setSocket(s);
    
    s.on("ai_chunk", (chunk) => {
      setLiveFeedback((prev) => prev + chunk);
    });

    s.on("ai_complete", () => {
      setIsReceivingFeedback(false);
    });

    s.on("ai_error", () => {
      setIsReceivingFeedback(false);
      toast.error("Live AI connection failed.");
    });

    return () => s.disconnect();
  }, []);

  const handleLiveAIFeedback = () => {
    if (!answerText.trim()) return toast.error('Say or type something to ask the AI!');
    setLiveFeedback('');
    setIsReceivingFeedback(true);
    socket?.emit("live_answer", {
      questionText: currentQuestion?.questionText,
      expectedKeywords: currentQuestion?.expectedKeywords,
      answerText: answerText.trim()
    });
  };

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeakQuestion = () => {
    if (!window.speechSynthesis) return toast.error('Text-to-speech not supported.');
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const text = currentQuestion?.questionText;
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; 
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Stop speaking when question changes or unmounts, and optionally auto-play the next question
  useEffect(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Auto-read the new question after a short delay for smooth transition
    const text = interview?.questions?.[currentIdx]?.questionText;
    if (text && window.speechSynthesis) {
      const timer = setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, interview?.questions]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let finalText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalText += e.results[i][0].transcript;
          }
        }
        // Only append text from results that are marked as final
        // Interim results are intentionally ignored to prevent word repetition
        if (finalText) {
          setAnswerText((prev) => {
            const trimmedPrev = prev.trimEnd();
            const separator = trimmedPrev.length > 0 ? ' ' : '';
            return trimmedPrev + separator + finalText.trim();
          });
        }
      };
      rec.onerror = (e) => {
        console.error('Speech recognition error', e.error);
        setIsListening(false);
        toast.error('Microphone access denied or failed.');
      };
      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return toast.error('Voice typing not supported in this browser.');
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast.success('Listening... Start speaking now.', { icon: '🎙️' });
    }
  };

  // Stop listening when navigating away from question
  useEffect(() => {
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [currentIdx, recognition]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    const init = async () => {
      try {
        const { data: intData } = await interviewAPI.getById(interviewId);
        setInterview(intData.interview);
        const { data: sessData } = await sessionAPI.start(interviewId);
        setSession(sessData.session);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to start session');
        navigate('/interviews');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [interviewId, navigate]);

  const currentQuestion = interview?.questions?.[currentIdx];
  const totalQuestions = interview?.questions?.length || 0;
  const progress = totalQuestions ? ((currentIdx + 1) / totalQuestions) * 100 : 0;

  const saveAnswer = useCallback(async (skipped = false) => {
    if (!session || !currentQuestion) return;
    if (!answerText.trim() && !skipped) return;

    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      await sessionAPI.submitAnswer(session._id, {
        questionId: currentQuestion._id,
        answerText: skipped ? '' : answerText.trim(),
        timeTaken,
        skipped,
      });
      setSavedAnswers((prev) => ({ ...prev, [currentQuestion._id]: { answerText, skipped } }));
      setStartTime(Date.now());
    } catch {
      toast.error('Failed to save answer');
    } finally {
      setSubmitting(false);
    }
  }, [session, currentQuestion, answerText, startTime]);

  const handleNext = async (skip = false) => {
    await saveAnswer(skip);
    setAnswerText(savedAnswers[interview?.questions?.[currentIdx + 1]?._id]?.answerText || '');
    setCurrentIdx((i) => i + 1);
    setElapsed(0);
    setStartTime(Date.now());
    setLiveFeedback('');
    setIsReceivingFeedback(false);
  };

  const handlePrev = () => {
    const prev = interview?.questions?.[currentIdx - 1];
    setAnswerText(savedAnswers[prev?._id]?.answerText || '');
    setCurrentIdx((i) => i - 1);
    setLiveFeedback('');
    setIsReceivingFeedback(false);
  };

  const handleComplete = async () => {
    await saveAnswer(false);
    setCompleting(true);
    try {
      await sessionAPI.complete(session._id);
      toast.success('Session completed! Loading your results...');
      navigate(`/sessions/${session._id}/results`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading your interview session...</p>
        </div>
      </div>
    );
  }

  if (!interview || !session) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-white">{interview.jobTitle}</h2>
          <p className="text-slate-400 text-sm capitalize">{interview.experienceLevel} level • {totalQuestions} questions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
            <Clock className="w-4 h-4 text-brand-400" />
            <span className="text-white font-mono">{formatTime(elapsed)}</span>
          </div>
          <span className="text-sm text-slate-400">{currentIdx + 1} / {totalQuestions}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar">
        <motion.div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="card p-7 space-y-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-brand-400 font-bold text-sm">Q{currentIdx + 1}</span>
            <span className={`badge ${DIFFICULTY_CLR[currentQuestion?.difficulty] || 'badge-slate'}`}>
              {currentQuestion?.difficulty}
            </span>
            <span className={`badge ${CATEGORY_CLR[currentQuestion?.category] || 'badge-slate'}`}>
              {currentQuestion?.category?.replace('_', ' ')}
            </span>
            {savedAnswers[currentQuestion?._id] && (
              <span className="badge badge-success"><CheckCircle className="w-3 h-3" /> Saved</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <p className="text-white text-lg leading-relaxed font-medium">
              {currentQuestion?.questionText}
            </p>
            <button
              type="button"
              onClick={toggleSpeakQuestion}
              className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                isSpeaking 
                  ? 'bg-brand-500/20 text-brand-400 animate-pulse' 
                  : 'bg-surface hover:bg-surface-hover text-slate-400 border border-surface-border'
              }`}
              title="Read Question Aloud"
            >
              {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label !mb-0 flex items-center gap-2">
                Your Answer
              </label>
              <button 
                type="button"
                onClick={toggleListening}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-surface hover:bg-surface-hover text-slate-400 border border-surface-border'}`}
              >
                <Mic className="w-3.5 h-3.5" />
                {isListening ? 'Listening...' : 'Voice Input'}
              </button>
            </div>
            <textarea
              className={`form-textarea h-44 transition-colors ${isListening ? 'border-brand-500 ring-1 ring-brand-500/50 bg-brand-500/5' : ''}`}
              placeholder="Type your answer here, or click 'Voice Input' to speak. Be concise yet thorough. For behavioral questions, use the STAR method..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
            <p className="text-slate-500 text-xs mt-1.5">{answerText.length} characters</p>
          </div>

          {/* Keywords hint */}
          {currentQuestion?.expectedKeywords?.length > 0 && (
            <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-500/20">
              <p className="text-xs text-brand-300">
                💡 <strong>Topic hints:</strong> {currentQuestion.expectedKeywords.join(' • ')}
              </p>
            </div>
          )}

          {/* Real-time AI Insight Box */}
          <div className="pt-2">
            <button 
              type="button" 
              onClick={handleLiveAIFeedback}
              disabled={isReceivingFeedback || !answerText.trim()}
              className="btn-secondary w-full py-2.5 text-sm gap-2"
            >
              {isReceivingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4 text-brand-400" />}
              {isReceivingFeedback ? 'AI is thinking...' : 'Get Live AI Follow-up (Socket.io streamed)'}
            </button>
            
            {(liveFeedback || isReceivingFeedback) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-4 bg-surface rounded-lg border border-brand-500/30 font-mono text-sm text-brand-100"
              >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-brand-500/20">
                   <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                   <span className="text-brand-300 font-bold text-xs uppercase tracking-wider">Live Interviewer Stream</span>
                </div>
                {liveFeedback}
                {isReceivingFeedback && <span className="inline-block w-1.5 h-3 ml-1 bg-brand-400 animate-pulse" />}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrev} disabled={currentIdx === 0 || submitting}
          className="btn-secondary disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => handleNext(true)} disabled={submitting}
            className="btn-ghost text-slate-400">
            <SkipForward className="w-4 h-4" /> Skip
          </button>

          {currentIdx < totalQuestions - 1 ? (
            <button onClick={() => handleNext(false)} disabled={submitting || !answerText.trim()}
              className="btn-primary disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Save & Next</>}
            </button>
          ) : (
            <button onClick={handleComplete} disabled={completing}
              className="btn-primary bg-emerald-600 hover:bg-emerald-500">
              {completing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                : <><CheckCircle className="w-4 h-4" /> Finish & Get Results</>}
            </button>
          )}
        </div>
      </div>

      {/* Session completion warning */}
      {currentIdx === totalQuestions - 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card p-4 border-amber-500/30 bg-amber-600/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-sm">
            This is the last question. After saving, clicking <strong>"Finish & Get Results"</strong> will submit your answers and AI will evaluate your performance.
          </p>
        </motion.div>
      )}
    </div>
  );
}
