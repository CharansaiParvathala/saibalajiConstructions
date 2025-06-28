import React, { useEffect, useRef } from 'react';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({ open, onClose, children, maxWidth = '32rem' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Trap focus
      if (e.key === 'Tab' && modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        } else if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    // Focus the first input
    setTimeout(() => {
      if (modalRef.current) {
        const firstInput = modalRef.current.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
        firstInput?.focus();
      }
    }, 100);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-2 sm:px-0"
      onClick={onClose}
      style={{ backdropFilter: 'blur(2px)' }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl p-6 relative w-full max-h-[90vh] overflow-y-auto flex flex-col"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default ResponsiveModal; 