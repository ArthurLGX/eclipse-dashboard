import React from 'react';
import { useModalFocus } from '@/hooks/useModalFocus';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  const modalRef = useModalFocus(open);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-card border border-default rounded-xl shadow-2xl relative min-w-[350px] max-w-[90vw] max-h-[90vh] overflow-auto print-modal outline-none overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 no-print !text-muted hover:!text-primary transition-colors"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
