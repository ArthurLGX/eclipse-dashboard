'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface AIAssistantContextType {
  isOpen: boolean;
  openAssistant: (initialPrompt?: string) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  initialPrompt: string | null;
  clearInitialPrompt: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  const openAssistant = useCallback((prompt?: string) => {
    if (prompt) {
      setInitialPrompt(prompt);
    }
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const clearInitialPrompt = useCallback(() => {
    setInitialPrompt(null);
  }, []);

  // Global keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        const isInputElement = 
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable;
        
        // Only prevent if not in a typical search input (some apps use Cmd+K for search)
        // We'll allow toggle in most cases
        if (!isInputElement || target.getAttribute('data-ai-input') === 'true') {
          e.preventDefault();
          toggleAssistant();
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeAssistant();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleAssistant, closeAssistant]);

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        initialPrompt,
        clearInitialPrompt,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
}

