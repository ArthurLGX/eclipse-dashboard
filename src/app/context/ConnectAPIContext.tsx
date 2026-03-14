'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconKey,
  IconX,
  IconExternalLink,
} from '@tabler/icons-react';

interface ConnectAPIContextType {
  showConnectAPIModal: () => void;
  closeConnectAPIModal: () => void;
  isOpen: boolean;
}

const ConnectAPIContext = createContext<ConnectAPIContextType | null>(null);

export function ConnectAPIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const showConnectAPIModal = useCallback(() => setIsOpen(true), []);
  const closeConnectAPIModal = useCallback(() => setIsOpen(false), []);

  const goToSettings = () => {
    closeConnectAPIModal();
    router.push('/dashboard/settings/ai-keys');
  };

  return (
    <ConnectAPIContext.Provider value={{ showConnectAPIModal, closeConnectAPIModal, isOpen }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <div className="bg-card border border-default rounded-xl shadow-xl max-w-md mx-4 p-6 relative">
            <button
              onClick={closeConnectAPIModal}
              className="absolute top-4 right-4 p-1 rounded hover:bg-secondary text-muted hover:text-primary"
            >
              <IconX className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <IconKey className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Connectez votre clé API
                </h3>
                <p className="text-sm text-muted mb-4">
                  Pour utiliser les fonctionnalités IA (génération de contrats, suggestions d&apos;emails, etc.), 
                  vous devez connecter votre clé API OpenAI ou Anthropic dans les paramètres.
                </p>
                <button
                  onClick={goToSettings}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  <IconExternalLink className="w-4 h-4" />
                  Aller aux paramètres
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConnectAPIContext.Provider>
  );
}

export function useConnectAPIModal() {
  const context = useContext(ConnectAPIContext);
  return context;
}
