import React from 'react';

/**
 * Reusable glassmorphic text input component
 * @param {String} label - Field label text
 * @param {String} error - Error message text (renders field red if present)
 */
const Input = ({ label, error, type = 'text', className = '', ...props }) => {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <input
        type={type}
        className={`glass-input px-4 py-2.5 rounded-lg text-sm transition-all placeholder:text-slate-500 ${
          error 
            ? 'border-red-500/80 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]' 
            : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-400 font-medium animate-pulse">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
