import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle } from 'lucide-react';

import SearchBar from '../components/jobs/SearchBar';
import FiltersPanel from '../components/jobs/FiltersPanel'; // Acts as FiltersSidebar
import JobsList from '../components/jobs/JobsList';
import JobDetailsDrawer from '../components/jobs/JobDetailsDrawer';
import { useJobs } from '../hooks/useJobs';

export default function JobsPage() {
  // UI State
  const [selectedJob, setSelectedJob] = useState(null);

  // Unified Search State
  const [searchParams, setSearchParams] = useState({
    q: '',
    where: '',
    page: 1,
    experience: '',
    salaryMin: 0,
    jobType: '',
  });

  // React Query Hook handles fetching, loading, error, and caching
  // isPlaceholderData lets us know if we are seeing old data while loading the new page
  const { data, isLoading, isError, error, isPlaceholderData } = useJobs(searchParams);

  // Extract from React Query response safely
  const jobs = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const isFallback = data?._cache?.fallback || false;

  // Handlers
  const handleSearch = (newSearch) => {
    setSearchParams((prev) => ({ ...prev, ...newSearch, page: 1 }));
  };

  const handleFilterApply = (newFilters) => {
    setSearchParams((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page) => {
    setSearchParams((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      
      {/* Header Section */}
      <div className="mb-10 text-center md:text-left">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight"
        >
          Find your next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">opportunity</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl"
        >
          Discover jobs perfectly matched to your skills, experience, and interview performance using our AI-driven deterministic ranking engine.
        </motion.p>
      </div>

      {/* Search Bar Component */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <SearchBar 
          onSearch={handleSearch} 
          initialQuery={searchParams.q} 
          initialLocation={searchParams.where} 
          isFetching={isLoading || isPlaceholderData}
        />
      </motion.div>

      {/* Fallback Warning (Adzuna is down) */}
      {isFallback && !isError && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Live Search Offline</h4>
            <p className="text-sm mt-1">We are currently experiencing issues connecting to our job provider. Showing cached results for your query.</p>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Filters Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full lg:w-1/4"
        >
          <FiltersPanel 
            filters={{
              experience: searchParams.experience,
              salaryMin: searchParams.salaryMin,
              jobType: searchParams.jobType,
            }} 
            onApply={handleFilterApply} 
          />
        </motion.div>

        {/* Jobs List Section */}
        <div className="w-full lg:w-3/4">
          {isError ? (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 p-6 rounded-2xl flex items-center flex-col text-center">
              <AlertCircle className="w-10 h-10 mb-3" />
              <p className="font-bold">{error?.response?.data?.message || 'Failed to fetch jobs. Please try again later.'}</p>
            </div>
          ) : (
            <JobsList 
              jobs={jobs} 
              loading={isLoading || isPlaceholderData} 
              page={searchParams.page} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
              onSelectJob={setSelectedJob} 
              searchQuery={searchParams.q}
            />
          )}
        </div>

      </div>

      {/* Job Details Drawer overlay */}
      {selectedJob && (
        <JobDetailsDrawer 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />
      )}
      
    </div>
  );
}
