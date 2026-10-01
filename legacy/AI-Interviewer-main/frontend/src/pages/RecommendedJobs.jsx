import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, MapPin, Banknote, Building2, ExternalLink, 
  Play, Loader2, FileText, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { jobsAPI, resumeAPI, interviewAPI } from '@/services/api';
import toast from 'react-hot-toast';

export default function RecommendedJobs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [hasResume, setHasResume] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [startingInterviewId, setStartingInterviewId] = useState(null);
  const [questionsModal, setQuestionsModal] = useState({ open: false, title: '', company: '', questions: [] });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // 1. Fetch user resumes to verify resume upload
      const { data: resData } = await resumeAPI.getAll();
      const userResumes = resData.resumes || [];
      setResumes(userResumes);

      if (userResumes.length === 0) {
        setHasResume(false);
        setJobs([]);
        setLoading(false);
        return;
      }
      setHasResume(true);

      // 2. Fetch recommended jobs
      const { data } = await jobsAPI.getRecommended();
      setJobs(data.results || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async (job) => {
    setStartingInterviewId(job.adzunaId || job._id);
    const toastId = toast.loading('AI is generating interview questions from the job description...');

    try {
      const { data } = await jobsAPI.generateQuestionsDirect({
        jobTitle: job.title,
        jobDescription: job.description,
      });

      toast.success("Questions generated successfully! 🚀", { id: toastId });
      setQuestionsModal({
        open: true,
        title: job.title,
        company: job.company,
        questions: data.questions || [],
      });

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate questions', { id: toastId });
    } finally {
      setStartingInterviewId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">Analyzing resume skills & scanning database matches...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-brand-400 font-bold text-sm tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-brand-400" />
            AI Talent Matching
          </div>
          <h1 className="text-3xl font-display font-black text-white">
            Recommended Positions
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Personalized listings scored and matched against your uploaded resume skills.
          </p>
        </div>
      </div>

      {/* Empty State: No Resumes Uploaded */}
      {!hasResume && (
        <div className="card p-10 flex flex-col items-center justify-center text-center max-w-xl mx-auto border border-surface-border">
          <div className="p-4 bg-brand-500/10 rounded-2xl mb-5">
            <FileText className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Active Resume Found</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Personalized matches require parsed resume profile skills. Upload your resume to unlock scoring recommendations.
          </p>
          <button 
            onClick={() => navigate('/resumes')}
            className="btn-primary"
          >
            Upload Resume
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* State: Resumes Uploaded but 0 Matches >= 60% */}
      {hasResume && jobs.length === 0 && (
        <div className="card p-10 flex flex-col items-center justify-center text-center max-w-xl mx-auto border border-surface-border">
          <div className="p-4 bg-amber-500/10 rounded-2xl mb-5">
            <ShieldCheck className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Strong Matches Found</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            We couldn't find any job postings in the database that match at least 60% of your resume skills.
          </p>
          <button 
            onClick={() => navigate('/jobs')}
            className="btn-secondary"
          >
            Browse All Jobs
          </button>
        </div>
      )}

      {/* Recommended Jobs Grid */}
      {hasResume && jobs.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {jobs.map((job, idx) => (
            <motion.div
              key={job.adzunaId || job._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card relative flex flex-col justify-between overflow-hidden border border-surface-border p-6 shadow-sm hover:shadow-xl hover:border-brand-500/30 transition-all duration-300"
            >
              {/* Top Row: Title / Match score */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="pr-12">
                  <h3 className="text-lg font-bold text-white line-clamp-1 hover:text-brand-400 transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mt-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {job.company}
                  </div>
                </div>

                {/* Score Gauge Badge */}
                <div className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full ${
                  job.matchScore >= 80 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                }`}>
                  {job.matchScore}% Match
                </div>
              </div>

              {/* Job Metadata Tags */}
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                {job.location && (
                  <div className="flex items-center gap-1 bg-surface-border text-slate-300 px-2.5 py-1 rounded-md">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[130px]">{job.location}</span>
                  </div>
                )}
                {(job.salaryMin || job.salaryMax) && (
                  <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md font-medium">
                    <Banknote className="w-3 h-3" />
                    £{Math.round(job.salaryMin || job.salaryMax).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Snippet Description */}
              <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed mb-6">
                {job.description || 'No description provided.'}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-surface-border mt-auto">
                <a
                  href={job.redirectUrl || job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 bg-surface-border hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all duration-300"
                >
                  View Job
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => handleStartInterview(job)}
                  disabled={startingInterviewId !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all duration-300"
                >
                  {startingInterviewId === (job.adzunaId || job._id) ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Start Interview
                      <Play className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Direct Interview Questions Modal Overlay */}
      {questionsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col justify-between">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-500/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-black text-white">Interview Questions</h3>
                  <p className="text-xs text-slate-400">Generated by AI Recruiter for {questionsModal.title} at {questionsModal.company}</p>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4 my-6 overflow-y-auto max-h-[50vh] pr-2">
                {questionsModal.questions.map((question, i) => (
                  <div 
                    key={i} 
                    className="flex gap-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl hover:border-brand-500/20 transition-colors"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 font-extrabold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium align-middle my-auto">
                      {question}
                    </p>
                  </div>
                ))}

                {questionsModal.questions.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    No questions could be generated. Please try again.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setQuestionsModal({ open: false, title: '', company: '', questions: [] })}
                className="py-2.5 px-6 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all duration-300 shadow-glow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
