/**
 * context/index.js — Barrel file
 *
 * Single import point for all contexts and their hooks:
 *   import { AuthProvider, useAuthContext, AppProvider, useAppContext } from '@/context';
 *   import { AdminAuthProvider, useAdminAuth }                          from '@/context';
 */

export { AuthContext,      AuthProvider,      useAuthContext } from './AuthContext';
export { AppContext,       AppProvider,       useAppContext  } from './AppContext';
export { AdminAuthContext, AdminAuthProvider, useAdminAuth   } from './AdminAuthContext';
