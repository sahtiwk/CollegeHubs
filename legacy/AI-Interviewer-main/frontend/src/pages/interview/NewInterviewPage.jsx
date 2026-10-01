import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, FileText, Sliders, Sparkles,
  Loader2, ChevronRight, ChevronLeft, Check
} from 'lucide-react';
import { interviewAPI, resumeAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const STEPS = ['Job Details', 'Preferences', 'Resume', 'Review'];

const EXPERIENCE_LEVELS = [
  { value: 'entry',     label: 'Entry Level',  sub: '0–2 years' },
  { value: 'mid',       label: 'Mid Level',    sub: '3–5 years' },
  { value: 'senior',    label: 'Senior',       sub: '5–8 years' },
  { value: 'lead',      label: 'Lead / Staff', sub: '8+ years'  },
  { value: 'executive', label: 'Executive',    sub: 'C-Suite'   },
];

const QUESTION_TYPES = [
  { value: 'technical',   label: 'Technical',     color: 'brand' },
  { value: 'behavioral',  label: 'Behavioral',    color: 'violet' },
  { value: 'situational', label: 'Situational',   color: 'emerald' },
  { value: 'hr',          label: 'HR',            color: 'amber' },
  { value: 'culture_fit', label: 'Culture Fit',   color: 'rose' },
];

export default function NewInterviewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(['technical', 'behavioral']);
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { numberOfQuestions: 10 }
  });

  const jobTitle = watch('jobTitle');
  const jobDescription = watch('jobDescription');
  const company = watch('company');
  const numberOfQuestions = watch('numberOfQuestions');

  useEffect(() => {
    resumeAPI.getAll().then(({ data }) => setResumes(data.resumes || []));
  }, []);

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter((t) => t !== type) : prev
        : [...prev, type]
    );
  };

  const onSubmit = async (formData) => {
    setIsCreating(true);
    try {
      // Step 1: Create interview
      const { data: createData } = await interviewAPI.create({
        ...formData,
        experienceLevel,
        questionTypes: selectedTypes,
        resumeId: selectedResume,
      });
      const interviewId = createData.interview._id;

      // Step 2: Generate questions
      setIsGenerating(true);
      toast.loading('AI is generating your questions...', { id: 'gen' });

      await interviewAPI.generateQuestions(interviewId);

      toast.success(`Questions ready! Let's go 🚀`, { id: 'gen' });
      navigate(`/interviews/${interviewId}/session`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create interview', { id: 'gen' });
    } finally {
      setIsCreating(false);
      setIsGenerating(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return jobTitle?.trim().length > 0 && jobDescription?.trim().length >= 50;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
              ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-500 text-white shadow-glow' : 'bg-surface-border text-slate-500'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-white' : 'text-slate-500'}`}>{label}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-emerald-500' : 'bg-surface-border'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* ── Step 0: Job Details ──────────────────────── */}
          {step === 0 && (
            <motion.div key="step0"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-8 space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-600/20 rounded-xl"><Briefcase className="w-5 h-5 text-brand-400" /></div>
                <h3 className="text-xl font-display font-bold text-white">Job Details</h3>
              </div>

              <div>
                <label className="form-label">Job Title *</label>
                <input type="text" className="form-input" placeholder="e.g. Senior React Developer"
                  {...register('jobTitle', { required: 'Job title is required' })} />
                {errors.jobTitle && <p className="form-error">{errors.jobTitle.message}</p>}
              </div>

              <div>
                <label className="form-label">Company (optional)</label>
                <input type="text" className="form-input" placeholder="e.g. Google, Microsoft..."
                  {...register('company')} />
              </div>

              <div>
                <label className="form-label">
                  Job Description *
                  <span className="text-slate-500 font-normal ml-2 text-xs">
                    (min. 50 chars — {jobDescription?.length ?? 0}/5000)
                  </span>
                </label>
                <textarea className="form-textarea h-40" placeholder="Paste the full job description here. The more detail, the better the questions..."
                  {...register('jobDescription', {
                    required: 'Job description is required',
                    minLength: { value: 50, message: 'Please provide at least 50 characters' },
                  })}
                />
                {errors.jobDescription && <p className="form-error">{errors.jobDescription.message}</p>}
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Preferences ──────────────────────── */}
          {step === 1 && (
            <motion.div key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-8 space-y-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-600/20 rounded-xl"><Sliders className="w-5 h-5 text-violet-400" /></div>
                <h3 className="text-xl font-display font-bold text-white">Preferences</h3>
              </div>

              <div>
                <label className="form-label">Experience Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {EXPERIENCE_LEVELS.map(({ value, label, sub }) => (
                    <button key={value} type="button"
                      onClick={() => setExperienceLevel(value)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                        experienceLevel === value
                          ? 'border-brand-500 bg-brand-600/20 text-white'
                          : 'border-surface-border bg-surface hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Question Types <span className="text-slate-500 text-xs">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUESTION_TYPES.map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => toggleType(value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedTypes.includes(value)
                          ? 'bg-brand-600/30 border-brand-500 text-brand-300'
                          : 'border-surface-border text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {selectedTypes.includes(value) && <Check className="w-3 h-3 inline mr-1" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Number of Questions: <span className="text-brand-400 font-bold">{numberOfQuestions}</span></label>
                <input type="range" min="3" max="20" step="1" className="w-full accent-brand-500 mt-2"
                  {...register('numberOfQuestions', { valueAsNumber: true })} />
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>3</span><span>20</span></div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Resume ────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-8 space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-600/20 rounded-xl"><FileText className="w-5 h-5 text-emerald-400" /></div>
                <h3 className="text-xl font-display font-bold text-white">Select Resume <span className="text-slate-500 text-sm font-normal">(optional)</span></h3>
              </div>
              <p className="text-slate-400 text-sm">Linking a resume helps AI generate more personalized questions based on your experience.</p>

              <div className="space-y-2">
                <button type="button"
                  onClick={() => setSelectedResume(null)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    !selectedResume ? 'border-brand-500 bg-brand-600/20' : 'border-surface-border bg-surface hover:border-slate-500'
                  }`}
                >
                  <p className="text-sm font-medium text-white">No resume — generic questions</p>
                  <p className="text-xs text-slate-500 mt-1">AI generates questions based on job description only</p>
                </button>

                {resumes.map((r) => (
                  <button key={r._id} type="button"
                    onClick={() => setSelectedResume(r._id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedResume === r._id ? 'border-brand-500 bg-brand-600/20' : 'border-surface-border bg-surface hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={`w-5 h-5 flex-shrink-0 ${selectedResume === r._id ? 'text-brand-400' : 'text-slate-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{r.originalName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.parseStatus === 'parsed' ? '✅ Text extracted' : r.parseStatus === 'failed' ? '⚠️ Parse failed' : '⏳ Pending'}
                          {r.isDefault && <span className="ml-2 badge-brand badge text-xs">Default</span>}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {resumes.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No resumes uploaded yet. <a href="/resumes" className="text-brand-400">Upload one →</a></p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Review ────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-8 space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-600/20 rounded-xl"><Sparkles className="w-5 h-5 text-amber-400" /></div>
                <h3 className="text-xl font-display font-bold text-white">Review & Generate</h3>
              </div>

              {[
                { label: 'Job Title', value: jobTitle },
                { label: 'Company', value: company || 'Not specified' },
                { label: 'Experience Level', value: EXPERIENCE_LEVELS.find((l) => l.value === experienceLevel)?.label },
                { label: 'Question Types', value: selectedTypes.join(', ') },
                { label: 'Number of Questions', value: numberOfQuestions },
                { label: 'Resume', value: resumes.find((r) => r._id === selectedResume)?.originalName || 'None selected' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start py-3 border-b border-surface-border last:border-0">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium text-right max-w-xs">{value}</span>
                </div>
              ))}

              <div className="p-4 rounded-xl bg-brand-600/10 border border-brand-500/30">
                <p className="text-brand-300 text-sm">
                  🤖 AI will generate <strong>{numberOfQuestions}</strong> personalized questions using Groq AI (Llama-3). This usually takes 5–15 seconds.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0}
            className="btn-secondary disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
              className="btn-primary disabled:opacity-50">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={isCreating || isGenerating} className="btn-primary">
              {isCreating || isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {isGenerating ? 'Generating...' : 'Creating...'}</>
                : <><Sparkles className="w-4 h-4" /> Generate & Start</>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
