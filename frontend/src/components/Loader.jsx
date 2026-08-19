import React from 'react';

/**
 * Reusable animated loading spinner component
 * @param {Boolean} fullPage - If true, renders as a fixed overlay with backdrop blur
 */
const Loader = ({ fullPage = false }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative w-12 h-12">
        {/* Background ring */}
        <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
        {/* Animated active segment */}
        <div className="absolute inset-0 border-4 border-t-brand-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-slate-400 font-medium text-sm tracking-wide animate-pulse">
        Loading...
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-md">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-6">{spinner}</div>;
};

export default Loader;
