import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, MapPin, Banknote, Building2, Calendar, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobsAPI } from '../../services/api';

export default function JobDetailsDrawer({ job, onClose }) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (job) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [job]);

  // Lazy load full job details when the drawer opens
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['job', job?.id],
    queryFn: async () => {
      if (!job?.id) return null;
      const res = await jobsAPI.getById(job.id);
      return res.data?.data;
    },
    enabled: !!job?.id, // Only fetch if we have an ID
    staleTime: 10 * 60 * 1000, // Cache details for 10 mins
  });

  if (!job) return null;

  // Merge list data with full detailed data if available
  const displayJob = { ...job, ...detailData };

  const applicationLink = displayJob.apply_url || displayJob.url;
  const postedDate = displayJob.posted_at ? new Date(displayJob.posted_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : 'Recently';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        >
          
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-start">
            <div className="pr-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                {displayJob.title}
              </h2>
              <div className="flex items-center gap-2 text-lg font-medium text-slate-700 dark:text-slate-300">
                <Building2 className="w-5 h-5 text-indigo-500" />
                {displayJob.company}
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body (Scrollable content) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            
            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {displayJob.location && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{displayJob.location}</div>
                </div>
              )}
              {displayJob.salary && (
                <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-xl border border-green-100 dark:border-green-500/20">
                  <div className="text-xs font-bold text-green-600 dark:text-green-500 uppercase mb-1 flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Salary</div>
                  <div className="font-semibold text-green-700 dark:text-green-400">{displayJob.salary}</div>
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Posted</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{postedDate}</div>
              </div>
            </div>

            {/* Description Section */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                Job Description
              </h3>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                  <p className="text-sm font-medium">Loading full details...</p>
                </div>
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                  <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                    {displayJob.description || displayJob.summary || 'No detailed description provided by the employer.'}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <a
              href={applicationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Apply Now <ExternalLink className="w-4 h-4" />
            </a>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
