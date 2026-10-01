/**
 * hooks/useAdminQuery.js
 *
 * Exposes reusable query cache bindings utilizing React Query.
 * Enables automatic stale-while-revalidate caches, automatic page retries,
 * and loading skeletons states.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers, getAdminJobs, getAdminTransactions,
  getAdminLogs, getAdminSettings, getAdminAnalytics
} from '@/services/admin.service';

// ─── Query Hook for Users ─────────────────────────────────────────
export function useAdminUsersQuery(params) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => getAdminUsers(params),
    placeholderData: (prev) => prev, // smooth transitions
  });
}

// ─── Query Hook for Jobs ──────────────────────────────────────────
export function useAdminJobsQuery(params) {
  return useQuery({
    queryKey: ['admin-jobs', params],
    queryFn: () => getAdminJobs(params),
    placeholderData: (prev) => prev,
  });
}

// ─── Query Hook for Transactions ──────────────────────────────────
export function useAdminPaymentsQuery(params) {
  return useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => getAdminTransactions(params),
    placeholderData: (prev) => prev,
  });
}

// ─── Query Hook for Logs ──────────────────────────────────────────
export function useAdminLogsQuery(params) {
  return useQuery({
    queryKey: ['admin-logs', params],
    queryFn: () => getAdminLogs(params),
    placeholderData: (prev) => prev,
  });
}

// ─── Query Hook for Settings ──────────────────────────────────────
export function useAdminSettingsQuery() {
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => getAdminSettings(),
  });
}

// ─── Query Hook for Analytics Reports ─────────────────────────────
export function useAdminAnalyticsQuery(params) {
  return useQuery({
    queryKey: ['admin-analytics', params],
    queryFn: () => getAdminAnalytics(params),
    placeholderData: (prev) => prev,
  });
}
