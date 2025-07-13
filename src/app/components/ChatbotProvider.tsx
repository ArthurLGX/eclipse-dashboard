'use client';

import React from 'react';
import { ChatbotProvider as ChatbotContextProvider } from '@/app/context/ChatbotContext';
import ChatbotModalWrapper from './ChatbotModalWrapper';

interface ChatbotProviderProps {
  children: React.ReactNode;
}

export default function ChatbotProvider({ children }: ChatbotProviderProps) {
  return (
    <ChatbotContextProvider>
      {children}
      <ChatbotModalWrapper />
    </ChatbotContextProvider>
  );
}
