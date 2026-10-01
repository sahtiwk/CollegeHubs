/**
 * useDebounce.js — §3 Frontend Query Debouncing
 *
 * Prevents a search API call on every single keystroke.
 * Only fires after the user has stopped typing for `delay` ms.
 *
 * Two variants provided:
 *   1. useDebounce (React hook)   — use inside React components
 *   2. debounce   (plain utility) — use in vanilla JS / class components
 *
 * Usage (React hook):
 *   const debouncedQuery = useDebounce(searchInput, 400);
 *   useEffect(() => {
 *     if (debouncedQuery.trim()) fetchJobs(debouncedQuery);
 *   }, [debouncedQuery]);
 *
 * Usage (plain):
 *   const debouncedSearch = debounce((q) => fetchJobs(q), 400);
 *   input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 */

import { useState, useEffect } from 'react';

// ─── React Hook Variant ───────────────────────────────────────────────────────

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of inactivity.
 *
 * @param {*}      value - The value to debounce (usually a string)
 * @param {number} delay - Debounce wait in milliseconds (recommended: 350–500ms)
 * @returns {*} Debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the previous timer if value changes before delay elapses
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ─── Plain Utility Variant ────────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn`.
 * Calling the returned function resets the timer every time.
 *
 * @param {Function} fn    - Function to debounce
 * @param {number}   delay - Wait time in milliseconds
 * @returns {Function} Debounced function with a `.cancel()` method
 */
export function debounce(fn, delay = 400) {
  let timerId = null;

  function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(this, args);
    }, delay);
  }

  /** Cancel any pending invocation. */
  debounced.cancel = () => {
    clearTimeout(timerId);
    timerId = null;
  };

  return debounced;
}

// ─── Usage Examples ───────────────────────────────────────────────────────────
/*
  ── React (hook) ──────────────────────────────────────────────────────────────

  import { useDebounce } from '@/utils/useDebounce';

  function JobSearchBar({ onSearch }) {
    const [input, setInput] = useState('');
    const debouncedInput = useDebounce(input, 400);

    useEffect(() => {
      if (debouncedInput.trim()) {
        onSearch(debouncedInput);       // ← fires API call
      }
    }, [debouncedInput]);

    return (
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search jobs…"
      />
    );
  }

  ── Vanilla JS ────────────────────────────────────────────────────────────────

  import { debounce } from '@/utils/useDebounce';

  const debouncedSearch = debounce(async (q) => {
    const res  = await fetch(`/api/jobs/search?q=${encodeURIComponent(q)}&page=1`);
    const data = await res.json();
    renderResults(data.results);
  }, 400);

  document.getElementById('search-input')
    .addEventListener('input', (e) => debouncedSearch(e.target.value));
*/
