'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ChatbotState = 'open' | 'closed' | 'minimized';

interface ChatbotContextType {
  chatbotState: ChatbotState;
  openChatbot: () => void;
  closeChatbot: () => void;
  minimizeChatbot: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [chatbotState, setChatbotState] = useState<ChatbotState>('closed');

  const openChatbot = () => {
    setChatbotState('open');
  };

  const closeChatbot = () => {
    setChatbotState('closed');
  };

  const minimizeChatbot = () => {
    setChatbotState('minimized');
  };

  return (
    <ChatbotContext.Provider
      value={{
        chatbotState,
        openChatbot,
        closeChatbot,
        minimizeChatbot,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}
