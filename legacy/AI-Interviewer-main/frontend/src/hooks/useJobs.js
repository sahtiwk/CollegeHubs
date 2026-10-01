import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { jobsAPI } from '../services/api';

/**
 * Custom React Query hook to fetch and cache jobs.
 * 
 * Features:
 * - Automatically refetches when `params` change (because they are in the queryKey).
 * - `placeholderData: keepPreviousData` ensures the UI doesn't flash empty 
 *   while fetching the next page of results.
 * - Caches results for 5 minutes to prevent redundant API calls.
 * 
 * @param {Object} params - Search parameters (q, where, page, contract, salaryMin, etc.)
 */
export function useJobs(params) {
  return useQuery({
    // The queryKey uniquely identifies this specific search + page combination
    queryKey: ['jobs', params],
    
    // The fetcher function
    queryFn: async () => {
      // Strip out empty, null, or undefined parameters before sending to API
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
      );
      
      // Call our enhanced database search API with filters
      const response = await jobsAPI.getJobs({
        page: cleanParams.page,
        keyword: cleanParams.q || undefined,
        location: cleanParams.where || undefined,
        salaryMin: cleanParams.salaryMin || undefined,
        contractType: cleanParams.jobType || undefined
      });
      
      // Map our database pagination structure to the frontend's expected properties
      return {
        data: response.data.results || [],
        meta: {
          totalPages: response.data.totalPages || 1,
          total: response.data.total || 0
        }
      };
    },

    // UX: Keep showing the old page's data while the new page is fetching
    // (Requires @tanstack/react-query v5+)
    placeholderData: keepPreviousData,

    // Keep data fresh for 5 minutes before considering it stale
    staleTime: 5 * 60 * 1000, 
    
    // Optional: Don't automatically refetch if the user just switches browser tabs
    refetchOnWindowFocus: false,
  });
}
