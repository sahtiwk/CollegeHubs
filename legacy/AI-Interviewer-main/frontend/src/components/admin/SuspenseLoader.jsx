/**
 * components/admin/SuspenseLoader.jsx
 *
 * Renders a premium shimmer placeholder layout.
 * Used as a fallback loader during React lazy page chunks fetches.
 */

import React from 'react';

export default function SuspenseLoader() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 animate-pulse">
      
      {/* Header shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 bg-white/5 rounded-lg w-48" />
          <div className="h-3 bg-white/5 rounded-lg w-72" />
        </div>
        <div className="h-10 bg-white/5 rounded-xl w-32" />
      </div>

      {/* Grid blocks shimmers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] h-24 space-y-3">
            <div className="h-3 bg-white/5 rounded w-16" />
            <div className="h-6 bg-white/5 rounded w-28" />
          </div>
        ))}
      </div>

      {/* Table shimmer */}
      <div className="card overflow-hidden bg-[#0f0f22]/20 border-white/[0.06] p-4 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="h-4 bg-white/5 rounded w-36" />
          <div className="h-8 bg-white/5 rounded w-24" />
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-4 bg-white/5 rounded flex-1" />
              <div className="h-4 bg-white/5 rounded flex-1" />
              <div className="h-4 bg-white/5 rounded flex-1" />
              <div className="h-4 bg-white/5 rounded w-16" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
