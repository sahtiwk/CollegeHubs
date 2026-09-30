'use client';

import { createContext, useContext, ReactNode } from 'react';

interface DashboardContextType {
  domains: string[];
  activeDomain: string;
  setActiveDomain: (domain: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isLoaded: boolean;
  userId: string | null | undefined;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardLayout');
  return context;
}

export function useDashboardOptional() {
  return useContext(DashboardContext);
}
