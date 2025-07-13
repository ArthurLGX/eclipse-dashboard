import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { Header } from '@/app/components/header';
import { AuthProvider } from '@/app/context/AuthContext';
import { Footer } from '@/app/components/footer';
import { PopupProvider } from './context/PopupContext';
import { LanguageProvider } from './context/LanguageContext';
import TrialExpiredWrapper from './components/TrialExpiredWrapper';
import ChatbotProvider from './components/ChatbotProvider';

export const metadata: Metadata = {
  title: 'Eclipse Development Dashboard',
  description: 'Gère ton entreprise de manière efficace et rapide',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased bg-zinc-900`}>
        <LanguageProvider>
          <AuthProvider>
            <PopupProvider>
              <ChatbotProvider>
                <TrialExpiredWrapper>
                  <Header />
                  {children}
                  <Footer />
                </TrialExpiredWrapper>
              </ChatbotProvider>
            </PopupProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
