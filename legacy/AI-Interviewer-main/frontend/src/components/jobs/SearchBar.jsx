import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Building2 } from 'lucide-react';
import { useDebounce } from '../../utils/useDebounce';

export default function SearchBar({ onSearch, initialQuery = '', initialLocation = '', initialRemote = false, isFetching = false }) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [isRemote, setIsRemote] = useState(initialRemote);

  // Debounce the inputs (300ms as requested)
  const debouncedQuery = useDebounce(query, 300);
  const debouncedLocation = useDebounce(location, 300);
  const debouncedRemote = useDebounce(isRemote, 300);

  // Auto-search when debounced values change
  useEffect(() => {
    onSearch({ 
      q: debouncedQuery, 
      where: debouncedRemote ? 'remote' : debouncedLocation,
      remote: debouncedRemote 
    });
  }, [debouncedQuery, debouncedLocation, debouncedRemote]);

  // Manual submit handler for the search button
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ 
      q: query, 
      where: isRemote ? 'remote' : location,
      remote: isRemote 
    });
  };

  return (
    <div className="w-full relative z-20 group">
      {/* Premium Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
      
      <form 
        onSubmit={handleSubmit}
        className="relative flex flex-col md:flex-row items-center bg-white dark:bg-slate-900 rounded-2xl md:rounded-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-1.5 gap-2"
      >
        
        {/* Keywords Search */}
        <div className="flex-1 flex items-center px-4 py-3 md:py-2 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 w-full">
          <Search className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Job title, keywords, or company..."
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Location Search */}
        <div className="flex-1 flex items-center px-4 py-3 md:py-2 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 w-full transition-opacity duration-300">
          <MapPin className={`w-5 h-5 mr-3 flex-shrink-0 ${isRemote ? 'text-slate-300 dark:text-slate-600' : 'text-indigo-500'}`} />
          <input
            type="text"
            value={isRemote ? 'Remote' : location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isRemote}
            placeholder="City, state, or zip code..."
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {location && !isRemote && (
            <button type="button" onClick={() => setLocation('')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Remote Toggle & Submit Button Group */}
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto px-4 md:px-0 py-2 md:py-0 gap-4">
          
          {/* Remote Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
            <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 group-hover/toggle:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
                className="absolute opacity-0 w-full h-full cursor-pointer"
              />
              {isRemote && (
                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm" />
              )}
            </div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 group-hover/toggle:text-slate-900 dark:group-hover/toggle:text-white transition-colors">
              <Building2 className="w-4 h-4" /> Remote
            </span>
          </label>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isFetching}
            className="px-6 py-3 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl md:rounded-full shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:-translate-y-0 flex items-center justify-center min-w-[100px]"
          >
            {isFetching ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Search'
            )}
          </button>
        </div>
        
      </form>
    </div>
  );
}
