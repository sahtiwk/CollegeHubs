import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface flex">
      {/* ── Left Brand Panel ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-violet-900 
                      flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-400 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
              <BrainCircuit className="w-10 h-10 text-white" />
            </div>
            <span className="text-3xl font-display font-bold text-white">InterviewAI</span>
          </div>

          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Ace your next<br />
            <span className="text-brand-200">interview</span> with AI
          </h1>
          <p className="text-brand-200 text-lg max-w-sm leading-relaxed">
            Upload your resume, input the job description, and get personalized interview questions powered by advanced AI.
          </p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: 'Questions Generated', value: '50K+' },
              { label: 'Mock Interviews', value: '12K+' },
              { label: 'Success Rate', value: '87%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-brand-300 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right Form Panel ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <BrainCircuit className="w-7 h-7 text-brand-400" />
            <span className="text-xl font-display font-bold gradient-text">InterviewAI</span>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
