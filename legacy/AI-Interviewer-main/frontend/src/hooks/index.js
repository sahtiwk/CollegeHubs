/**
 * hooks/index.js — Barrel file
 *
 * Single import point for all custom hooks:
 *   import { useAuth, useFetch, useApi, useLocalStorage } from '@/hooks';
 */

export { default as useAuth          } from './useAuth';
export { default as useFetch         } from './useFetch';
export { default as useApi           } from './useApi';
export { default as useLocalStorage  } from './useLocalStorage';
