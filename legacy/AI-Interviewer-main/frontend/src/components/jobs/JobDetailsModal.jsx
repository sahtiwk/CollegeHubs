import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, MapPin, Banknote, Clock, Building, Briefcase } from 'lucide-react';

export default function JobDetailsModal({ job, onClose }) {
  if (!job) return null;

  const postedDate = job.posted_at ? new Date(job.posted_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'Recently';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 z-10"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
            <div className="pr-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                {job.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5"><Building className="w-4 h-4" /> {job.company}</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location || 'Remote'}</div>
                {job.category && <div className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.category}</div>}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 sm:px-8 custom-scrollbar">
            {/* Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Salary</div>
                <div className="font-bold text-green-600 dark:text-green-400">{job.salary || 'Undisclosed'}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Type</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 capitalize">{job.contract?.replace('_', ' ') || 'Full Time'}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Posted</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">{postedDate}</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Match Score</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">{job.score ? `${job.score}%` : 'N/A'}</div>
              </div>
            </div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Job Description</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                {/* Note: The description is already HTML-stripped by the backend normalizer, so we can render it safely. If it has \n, we preserve them. */}
                <p className="whitespace-pre-wrap leading-relaxed">
                  {job.description || job.summary || 'No detailed description available.'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <a
              href={job.apply_url || job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              Apply on Adzuna <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
