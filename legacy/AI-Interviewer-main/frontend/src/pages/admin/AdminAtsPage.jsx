/**
 * pages/admin/AdminAtsPage.jsx — Placeholder
 * Will manage Applicant Tracking System (ATS) features and metrics.
 */
import { Target } from 'lucide-react';

export default function AdminAtsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <Target size={28} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">ATS Management</h2>
      <p className="text-slate-400 text-sm max-w-xs">
        Track candidate applications, resume scores, and ATS parsing pipelines.
      </p>
      <span className="mt-4 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">Coming Soon</span>
    </div>
  );
}
