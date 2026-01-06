'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { useChatbot } from '@/app/context/ChatbotContext';

interface SupportDropdownProps {
  userPlan: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function SupportDropdown({
  userPlan,
  isOpen,
  onToggle,
  onClose,
}: SupportDropdownProps) {
  const { t } = useLanguage();
  const { openChatbot } = useChatbot();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Définir les options de support selon le plan
  const getSupportOptions = () => {
    switch (userPlan) {
      case 'free':
        return [
          {
            type: 'chatbot',
            label: t('chatbot_support'),
            icon: '🤖',
            description: t('chatbot_support_description'),
            action: () => {
              openChatbot();
              onClose();
            },
          },
        ];
      case 'starter':
        return [
          {
            type: 'email',
            label: t('email_support'),
            icon: '📧',
            description: t('email_support_description'),
            action: () => {
              window.location.href = 'mailto:support@eclipse-studio.com';
              onClose();
            },
          },
          {
            type: 'chatbot',
            label: t('chatbot_support'),
            icon: '🤖',
            description: t('chatbot_support_description'),
            action: () => {
              openChatbot();
              onClose();
            },
          },
        ];
      case 'pro':
        return [
          {
            type: 'phone',
            label: t('phone_support'),
            icon: '📞',
            description: t('phone_support_description'),
            action: () => {
              window.location.href = 'tel:+33684446324';
              onClose();
            },
          },
          {
            type: 'email',
            label: t('email_support'),
            icon: '📧',
            description: t('email_support_description'),
            action: () => {
              window.location.href = 'arthur.legouix@gmail.com';
              onClose();
            },
          },
          {
            type: 'chatbot',
            label: t('chatbot_support'),
            icon: '🤖',
            description: t('chatbot_support_description'),
            action: () => {
              openChatbot();
              onClose();
            },
          },
        ];
      case 'expert':
        return [
          {
            type: 'phone',
            label: t('priority_phone_support'),
            icon: '📞',
            description: t('priority_phone_support_description'),
            action: () => {
              window.location.href = 'tel:+33684446324';
              onClose();
            },
          },
          {
            type: 'email',
            label: t('priority_email_support'),
            icon: '📧',
            description: t('priority_email_support_description'),
            action: () => {
              window.location.href = 'arthur.legouix@gmail.com';
              onClose();
            },
          },
          {
            type: 'chatbot',
            label: t('chatbot_support'),
            icon: '🤖',
            description: t('chatbot_support_description'),
            action: () => {
              openChatbot();
              onClose();
            },
          },
        ];
      default:
        return [
          {
            type: 'email',
            label: t('email_support'),
            icon: '📧',
            description: t('email_support_description'),
            action: () => {
              window.location.href = 'arthur.legouix@gmail.com';
              onClose();
            },
          },
        ];
    }
  };

  const supportOptions = getSupportOptions();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full bg-hover text-primary px-4 py-2 rounded-lg hover:bg-card border border-default transition-colors !text-sm flex items-center justify-between"
      >
        <span>{t('contact_support')}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="!text-xs"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute lg:top-full lg:bottom-auto bottom-full left-0 right-0 mb-2 bg-card border border-default rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {supportOptions.map((option, index) => (
                <motion.button
                  key={option.type}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={option.action}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-hover transition-colors !text-left group"
                >
                  <span className="!text-lg">{option.icon}</span>
                  <div className="flex-1">
                    <div className="text-primary font-medium !text-sm group-hover:text-accent transition-colors">
                      {option.label}
                    </div>
                    <div className="text-secondary !text-xs">
                      {option.description}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
