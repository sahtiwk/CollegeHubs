/**
 * hooks/useApi.js
 *
 * Hook for imperative API calls (mutations: create, update, delete).
 * Unlike useFetch, this does NOT run on mount — you call `execute` manually.
 *
 * Usage:
 *   const { execute, loading, error } = useApi(resumeService.upload);
 *
 *   const handleSubmit = async (formData) => {
 *     const { data, error } = await execute(formData);
 *     if (!error) toast.success('Uploaded!');
 *   };
 */

import { useState, useCallback } from 'react';

const useApi = (asyncFn) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      const payload = result?.data ?? result;
      setData(payload);
      return { data: payload, error: null };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Request failed';
      setError(message);
      return { data: null, error: message };
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
};

export default useApi;
