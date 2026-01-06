import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { Header } from '@/app/components/header';
import { AuthProvider } from '@/app/context/AuthContext';
import { Footer } from '@/app/components/footer';
import { PopupProvider } from './context/PopupContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { QuotaProvider } from './context/QuotaContext';
import TrialExpiredWrapper from './components/TrialExpiredWrapper';
import ChatbotProvider from './components/ChatbotProvider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.eclipsestudiodev.fr'),
  title: {
    default: 'Eclipse Dashboard',
    template: '%s | Eclipse Dashboard',
  },
  description: 'Gère ton entreprise de manière efficace et rapide',
  applicationName: 'Eclipse Dashboard',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Eclipse Dashboard',
    title: 'Eclipse Dashboard',
    description: 'Gère ton entreprise de manière efficace et rapide',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-title" content="Eclipse Dashboard" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('eclipse-theme') || 'dark';
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <PreferencesProvider>
              <SidebarProvider>
                <AuthProvider>
                  <QuotaProvider>
                    <PopupProvider>
                      <ChatbotProvider>
                        <TrialExpiredWrapper>
                          <Header />
                          {children}
                          <Footer />
                        </TrialExpiredWrapper>
                      </ChatbotProvider>
                    </PopupProvider>
                  </QuotaProvider>
                </AuthProvider>
              </SidebarProvider>
            </PreferencesProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
