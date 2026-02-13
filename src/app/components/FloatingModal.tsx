import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalFocus } from '@/hooks/useModalFocus';

interface FloatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function FloatingModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: FloatingModalProps) {
  const modalRef = useModalFocus(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-hidden overscroll-contain"
          onClick={onClose}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`bg-card border border-default  p-6 w-full max-h-[90vh] overflow-y-auto outline-none overscroll-contain ${maxWidth}`}
            style={{ overscrollBehavior: 'contain' }}
            onClick={e => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
