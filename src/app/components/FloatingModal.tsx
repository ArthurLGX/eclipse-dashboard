import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center p-4 pt-8 md:pt-12 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`bg-card border border-default rounded-2xl p-6 w-full my-auto max-h-[90vh] overflow-y-auto ${maxWidth}`}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
