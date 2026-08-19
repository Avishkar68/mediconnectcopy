import React from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal card component
 * @param {Boolean} isOpen - Control visibility
 * @param {Function} onClose - Handler called on backdrop click or close button click
 * @param {String} title - Modal title text
 */
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative glass-card max-w-lg w-full rounded-2xl shadow-2xl p-6 overflow-hidden z-10 transition-transform transform scale-100">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-100 font-display">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
