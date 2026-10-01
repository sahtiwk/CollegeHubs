/**
 * hooks/useFetch.js
 *
 * Generic data-fetching hook with loading, error, and refetch support.
 * Wraps any async service function.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useFetch(interviewService.getAll);
 *
 *   // With params:
 *   const { data } = useFetch(() => sessionService.getById(id), [id]);
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const useFetch = (asyncFn, deps = []) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Track mounted state to prevent setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (mountedRef.current) setData(result?.data ?? result);
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.response?.data?.message || err?.message || 'Something went wrong');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
};

export default useFetch;
