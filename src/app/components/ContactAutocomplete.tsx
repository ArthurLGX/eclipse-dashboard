'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconUser, IconSearch, IconX, IconBuilding, IconMail } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { Client } from '@/types';

interface ContactAutocompleteProps {
  contacts: Client[];
  selectedEmails: string[]; // Emails déjà sélectionnés
  onSelect: (contact: Client) => void;
  onManualAdd: (email: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function ContactAutocomplete({
  contacts,
  selectedEmails,
  onSelect,
  onManualAdd,
  placeholder,
  loading = false,
}: ContactAutocompleteProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrer les contacts selon la recherche (exclure ceux déjà sélectionnés)
  const filteredContacts = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return contacts
      .filter(contact => {
        // Exclure les contacts déjà sélectionnés
        if (selectedEmails.includes(contact.email?.toLowerCase())) return false;
        
        // Rechercher dans nom, email, entreprise
        return (
          contact.name?.toLowerCase().includes(lowerQuery) ||
          contact.email?.toLowerCase().includes(lowerQuery) ||
          contact.enterprise?.toLowerCase().includes(lowerQuery)
        );
      })
      .slice(0, 8); // Limiter à 8 résultats
  }, [query, contacts, selectedEmails]);

  // Ouvrir le dropdown quand on tape
  useEffect(() => {
    if (query.trim() && filteredContacts.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [query, filteredContacts.length]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sélectionner un contact
  const handleSelect = useCallback((contact: Client) => {
    onSelect(contact);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onSelect]);

  // Ajouter manuellement un email
  const handleManualAdd = useCallback(() => {
    const email = query.trim().toLowerCase();
    if (email && email.includes('@') && email.includes('.')) {
      onManualAdd(email);
      setQuery('');
      setIsOpen(false);
    }
  }, [query, onManualAdd]);

  // Gestion du clavier
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleManualAdd();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredContacts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredContacts[highlightedIndex]) {
          handleSelect(filteredContacts[highlightedIndex]);
        } else {
          handleManualAdd();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredContacts, highlightedIndex, handleSelect, handleManualAdd]);

  // Générer les initiales pour l'avatar
  const getInitials = (name: string, enterprise: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (enterprise) {
      return enterprise.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Générer une couleur basée sur le nom
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
      'bg-purple-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
    ];
    const index = name?.charCodeAt(0) || 0;
    return colors[index % colors.length];
  };

  return (
    <div className="relative flex-1">
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && filteredContacts.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder || t('search_contact_placeholder') || 'Rechercher un contact ou entrer un email...'}
          className="input w-full pl-9"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary rounded transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && filteredContacts.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-default rounded-xl shadow-lg overflow-hidden"
          >
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredContacts.map((contact, index) => (
                <button
                  key={contact.documentId}
                  onClick={() => handleSelect(contact)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === highlightedIndex
                      ? 'bg-accent-light'
                      : 'hover:bg-hover'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${getAvatarColor(contact.name || contact.enterprise)}`}>
                    {contact.profile_picture?.url ? (
                      <img
                        src={contact.profile_picture.url}
                        alt={contact.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(contact.name, contact.enterprise)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary truncate">
                        {contact.name || contact.enterprise || 'Sans nom'}
                      </span>
                      {contact.enterprise && contact.name && (
                        <span className="flex items-center gap-1 text-xs text-muted bg-hover px-1.5 py-0.5 rounded">
                          <IconBuilding className="w-3 h-3" />
                          {contact.enterprise}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted truncate">
                      <IconMail className="w-3.5 h-3.5 flex-shrink-0" />
                      {contact.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 bg-hover border-t border-default text-xs text-muted flex items-center justify-between">
              <span>↑↓ pour naviguer, Entrée pour sélectionner</span>
              <span>Esc pour fermer</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

