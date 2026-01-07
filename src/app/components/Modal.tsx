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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-lg p-8 relative min-w-[350px] max-w-[90vw] max-h-[90vh] overflow-auto print-modal outline-none"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 no-print text-2xl font-bold"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
