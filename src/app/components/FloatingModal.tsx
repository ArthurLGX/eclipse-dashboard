import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  maxWidth = ' lg:max-w-4xl max-w-11/12',
}: FloatingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 min-h-screen bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`bg-zinc-900/50 flex flex-col items-center justify-center border border-zinc-800 rounded-xl p-6 w-full h-full overflow-y-auto ${maxWidth}`}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
