import React, { memo } from 'react';
import JobCard from './JobCard';
import Pagination from './Pagination';
import { Inbox } from 'lucide-react';

// ─── Skeleton Loader Component ─────────────────────────────────────────────
const JobSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-full flex flex-col animate-pulse">
    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
    
    <div className="flex gap-3 mb-6">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
    </div>
    
    <div className="space-y-2 mb-6 flex-grow">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
    </div>
    
    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
    </div>
  </div>
);

// ─── Main JobsList Component (Memoized) ────────────────────────────────────
const JobsList = memo(({ jobs = [], loading = false, page, totalPages, onPageChange, onSelectJob, searchQuery = '' }) => {
  
  // 1. Initial Loading State (Skeleton Loaders) - ONLY show if no jobs are present
  if (loading && jobs.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <JobSkeleton key={i} />
        ))}
      </div>
    );
  }

  // 2. Empty State
  if (!loading && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No jobs found</h3>
        <p className="text-sm">Try adjusting your search criteria or filters.</p>
      </div>
    );
  }

  // 3. Render Jobs Grid
  return (
    <div className="w-full relative">
      
      {/* 
        REMOVED soft loading overlay spinner as per UX Enhancements requirement.
        Because we use keepPreviousData, the jobs will naturally stay visible, 
        and the loading state is conveyed by the disabled/spinning search button.
      */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 transition-opacity duration-300 ${loading ? 'opacity-60 grayscale-[0.2]' : 'opacity-100'}`}>
        {jobs.map((job, idx) => (
          <JobCard 
            key={job.id || idx} 
            job={job} 
            onClick={() => onSelectJob && onSelectJob(job)}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {/* Embedded Pagination */}
      {totalPages > 1 && (
        <Pagination 
          page={page} 
          totalPages={totalPages} 
          onPageChange={onPageChange} 
        />
      )}
    </div>
  );
});

JobsList.displayName = 'JobsList';

export default JobsList;
