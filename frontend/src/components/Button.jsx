import React from 'react';

/**
 * Reusable animated action button
 * @param {String} variant - Design type ('primary', 'secondary', 'danger')
 * @param {Boolean} loading - Shows mini loading indicator if true
 */
const Button = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyle =
    'flex items-center justify-center font-medium text-sm px-5 py-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95';

  const variants = {
    primary:
      'bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 text-white shadow-md shadow-brand-500/10 focus:ring-brand-500 hover:shadow-lg hover:shadow-brand-500/20',
    secondary:
      'glass-card text-slate-200 hover:bg-slate-800/80 hover:text-white focus:ring-slate-500 border border-slate-700/50',
    danger:
      'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-md focus:ring-red-500',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
