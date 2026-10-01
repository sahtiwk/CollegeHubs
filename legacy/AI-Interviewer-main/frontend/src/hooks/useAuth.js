/**
 * hooks/useAuth.js
 *
 * Single auth hook for the entire app.
 * Bridges to the Zustand authStore so both route guards (App.jsx)
 * and page components (LoginPage, RegisterPage, etc.) share
 * the same auth state — no dual-system confusion.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated, isLoading } = useAuth();
 */

import { useAuthStore } from '@/store/authStore';

const useAuth = () => useAuthStore();

export default useAuth;
