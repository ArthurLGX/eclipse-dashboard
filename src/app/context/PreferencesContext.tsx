'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';
export type NotificationFrequency = 'instant' | 'daily' | 'weekly' | 'never';

export interface NotificationPreferences {
  emailNewProject: boolean;
  emailNewInvoice: boolean;
  emailInvoicePaid: boolean;
  emailCollaboration: boolean;
  emailNewsletter: boolean;
  frequency: NotificationFrequency;
}

export interface InvoicePreferences {
  defaultPaymentDays: number;
  defaultTaxRate: number;
  legalMentions: string;
  autoNumbering: boolean;
  invoicePrefix: string;
  quotePrefix: string;
}

export interface FormatPreferences {
  dateFormat: DateFormat;
  currency: Currency;
  timezone: string;
}

export interface Preferences {
  notifications: NotificationPreferences;
  invoice: InvoicePreferences;
  format: FormatPreferences;
}

const defaultPreferences: Preferences = {
  notifications: {
    emailNewProject: true,
    emailNewInvoice: true,
    emailInvoicePaid: true,
    emailCollaboration: true,
    emailNewsletter: false,
    frequency: 'instant',
  },
  invoice: {
    defaultPaymentDays: 30,
    defaultTaxRate: 20,
    legalMentions: '',
    autoNumbering: true,
    invoicePrefix: 'FAC-',
    quotePrefix: 'DEV-',
  },
  format: {
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
};

interface PreferencesContextType {
  preferences: Preferences;
  updateNotifications: (notifications: Partial<NotificationPreferences>) => void;
  updateInvoice: (invoice: Partial<InvoicePreferences>) => void;
  updateFormat: (format: Partial<FormatPreferences>) => void;
  resetPreferences: () => void;
  formatDate: (date: Date | string) => string;
  formatCurrency: (amount: number) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'user-preferences';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences, isLoaded]);

  const updateNotifications = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates },
    }));
  }, []);

  const updateInvoice = useCallback((updates: Partial<InvoicePreferences>) => {
    setPreferences(prev => ({
      ...prev,
      invoice: { ...prev.invoice, ...updates },
    }));
  }, []);

  const updateFormat = useCallback((updates: Partial<FormatPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      format: { ...prev.format, ...updates },
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    switch (preferences.format.dateFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`;
    }
  }, [preferences.format.dateFormat]);

  const formatCurrency = useCallback((amount: number): string => {
    const currencySymbols: Record<Currency, string> = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      CHF: 'CHF',
    };

    const formatted = amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const symbol = currencySymbols[preferences.format.currency];
    
    if (preferences.format.currency === 'USD' || preferences.format.currency === 'GBP') {
      return `${symbol}${formatted}`;
    }
    return `${formatted} ${symbol}`;
  }, [preferences.format.currency]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updateNotifications,
        updateInvoice,
        updateFormat,
        resetPreferences,
        formatDate,
        formatCurrency,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

