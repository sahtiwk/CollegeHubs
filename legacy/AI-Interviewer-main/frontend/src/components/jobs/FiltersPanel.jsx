import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';

export default function FiltersPanel({ filters, onApply }) {
  // Local state to hold filter selections before applying
  const [draftFilters, setDraftFilters] = useState(filters || {
    experience: '',
    salaryMin: 0,
    jobType: '',
  });

  // Sync with external state if it changes
  useEffect(() => {
    if (filters) {
      setDraftFilters(filters);
    }
  }, [filters]);

  const handleChange = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    if (onApply) {
      onApply(draftFilters);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-6">
      <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
        <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
        <h3 className="font-bold text-lg">Filters</h3>
      </div>

      <div className="space-y-6">
        
        {/* Experience Level Dropdown */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
            Experience Level
          </label>
          <div className="relative">
            <select
              value={draftFilters.experience}
              onChange={(e) => handleChange('experience', e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Any Experience</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-Level</option>
              <option value="senior">Senior</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Salary Range Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Min Salary
            </label>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {draftFilters.salaryMin > 0 ? `$${parseInt(draftFilters.salaryMin).toLocaleString()}+` : 'Any'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="200000"
            step="10000"
            value={draftFilters.salaryMin}
            onChange={(e) => handleChange('salaryMin', e.target.value)}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
            <span>$0</span>
            <span>$200k+</span>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Job Type */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Job Type
          </label>
          <div className="flex flex-col gap-3">
            {[
              { value: '', label: 'Any Type' },
              { value: 'full_time', label: 'Full-time' },
              { value: 'part_time', label: 'Part-time' },
              { value: 'remote', label: 'Remote' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 group-hover:border-indigo-500 transition-colors">
                  <input
                    type="radio"
                    name="jobType"
                    value={option.value}
                    checked={draftFilters.jobType === option.value}
                    onChange={(e) => handleChange('jobType', e.target.value)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  {draftFilters.jobType === option.value && (
                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm" />
                  )}
                </div>
                <span className={`text-sm font-medium transition-colors ${draftFilters.jobType === option.value ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Apply Filters Button */}
        <div className="pt-2">
          <button
            onClick={handleApply}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
