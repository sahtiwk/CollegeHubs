/**
 * components/admin/ErrorBoundary.jsx
 *
 * Catches runtime React render exceptions within admin pages.
 * Displays a custom diagnostic crash panel with restart actions.
 */

import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught admin layout exception:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-[#14142a]/60 border border-white/10 rounded-2xl max-w-xl mx-auto my-12 space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Component Crash Detected</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              A runtime rendering error occurred in this section of the admin workspace.
            </p>
          </div>
          {this.state.error && (
            <pre className="p-3 bg-black/40 border border-white/[0.04] text-[10px] text-red-400 font-mono rounded-lg overflow-auto max-w-full text-left">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleRestart}
            className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 hover:text-white"
          >
            <RefreshCw size={13} />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
