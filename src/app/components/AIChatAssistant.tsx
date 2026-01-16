'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconSend,
  IconLoader2,
  IconSparkles,
  IconMail,
  IconListCheck,
  IconArrowRight,
  IconRefresh,
  IconMinimize,
  IconMaximize,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';

// ============================================================================
// TYPES
// ============================================================================

interface EmailData {
  subject: string;
  body: string;
}

interface TaskData {
  title: string;
  dueDate?: string;
}

interface ToolResult {
  success?: boolean;
  email?: EmailData;
  task?: TaskData;
  steps?: string[];
}

// ============================================================================
// TOOL RESULT COMPONENTS
// ============================================================================

const ToolResultCard: React.FC<{ toolName: string; result: ToolResult }> = ({ toolName, result }) => {
  const { t } = useLanguage();

  const getIcon = () => {
    switch (toolName) {
      case 'generateRelanceEmail':
        return <IconMail size={16} className="text-info" />;
      case 'createTask':
        return <IconListCheck size={16} className="text-success" />;
      case 'suggestNextSteps':
        return <IconArrowRight size={16} className="text-warning" />;
      default:
        return <IconSparkles size={16} className="text-accent" />;
    }
  };

  const getTitle = () => {
    switch (toolName) {
      case 'generateRelanceEmail':
        return t('email_generated') || 'Email généré';
      case 'createTask':
        return t('task_created') || 'Tâche créée';
      case 'suggestNextSteps':
        return t('next_steps') || 'Prochaines étapes';
      default:
        return toolName;
    }
  };

  return (
    <div className="mt-2 p-3 bg-hover border border-default rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="text-sm font-medium text-primary">{getTitle()}</span>
      </div>
      
      {toolName === 'generateRelanceEmail' && result.email && (
        <div className="space-y-2">
          <div className="text-xs text-muted">
            <strong>Objet:</strong> {result.email.subject}
          </div>
          <div className="text-xs text-secondary bg-card p-2 rounded border border-default max-h-32 overflow-y-auto whitespace-pre-wrap">
            {result.email.body}
          </div>
          <button className="text-xs text-accent hover:underline flex items-center gap-1">
            <IconMail size={12} />
            {t('copy_email') || 'Copier l\'email'}
          </button>
        </div>
      )}

      {toolName === 'createTask' && result.task && (
        <div className="text-xs text-secondary">
          <p><strong>Tâche:</strong> {result.task.title}</p>
          {result.task.dueDate && (
            <p><strong>Échéance:</strong> {result.task.dueDate}</p>
          )}
          <p className="text-success mt-1">✓ {t('task_created_success') || 'Tâche créée avec succès'}</p>
        </div>
      )}

      {toolName === 'suggestNextSteps' && result.steps && (
        <ul className="text-xs text-secondary space-y-1">
          {result.steps.map((step: string, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-accent font-bold">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIChatAssistant() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI SDK v6 useChat hook with DefaultChatTransport
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
  } = useChat({
    id: 'eclipse-assistant',
    transport: new DefaultChatTransport({
      api: '/api/ai/assistant',
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage({ text: message });
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      blocked: t('ai_prompt_blocked') || 'Je suis bloqué sur un projet, peux-tu m\'aider à comprendre la situation ?',
      relance: t('ai_prompt_relance') || 'Quels clients devrais-je relancer en priorité ?',
      next: t('ai_prompt_next') || 'Que devrais-je faire maintenant pour avancer ?',
    };
    
    sendMessage({ text: prompts[action] || action });
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        const textPart = lastUserMessage.parts?.find(p => p.type === 'text');
        if (textPart && 'text' in textPart) {
          sendMessage({ text: textPart.text });
        }
      }
    }
  };

  const panelWidth = isExpanded ? 'w-[500px]' : 'w-[380px]';
  const panelHeight = isExpanded ? 'h-[600px]' : 'h-[500px]';

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-full bg-accent shadow-xl flex items-center justify-center hover:shadow-2xl transition-shadow group"
            title={t('ai_assistant') || 'Assistant IA Eclipse'}
          >
            <div className="relative">
              <Image
                src="/images/logo/eclipse-logo.png"
                alt="Eclipse AI"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-accent animate-pulse" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-6 left-6 z-[9999] ${panelWidth} ${panelHeight} bg-card border border-default rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 bg-accent text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/logo/eclipse-logo.png"
                  alt="Eclipse AI"
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-sm">Eclipse Copilot</h3>
                  <p className="text-xs text-white/70">
                    {t('ai_assistant_subtitle') || 'Votre assistant business'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title={isExpanded ? 'Réduire' : 'Agrandir'}
                >
                  {isExpanded ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <IconX size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mb-4">
                    <IconSparkles size={32} className="text-accent" />
                  </div>
                  <h4 className="font-semibold text-primary mb-2">
                    {t('ai_welcome_title') || 'Salut'} {user?.username || ''} ! 👋
                  </h4>
                  <p className="text-sm text-secondary mb-6">
                    {t('ai_welcome_message') || 'Je suis là pour t\'aider à avancer sur tes projets et clients. Pose-moi une question ou choisis une action rapide.'}
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="space-y-2 w-full">
                    <button
                      onClick={() => handleQuickAction('blocked')}
                      className="w-full p-3 text-left rounded-xl bg-hover border border-default hover:border-accent transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🚧</span>
                        <div>
                          <p className="text-sm font-medium text-primary group-hover:text-accent">
                            {t('ai_action_blocked') || 'Je suis bloqué'}
                          </p>
                          <p className="text-xs text-muted">
                            {t('ai_action_blocked_desc') || 'Analyser un blocage projet'}
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleQuickAction('relance')}
                      className="w-full p-3 text-left rounded-xl bg-hover border border-default hover:border-accent transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📧</span>
                        <div>
                          <p className="text-sm font-medium text-primary group-hover:text-accent">
                            {t('ai_action_relance') || 'Relances prioritaires'}
                          </p>
                          <p className="text-xs text-muted">
                            {t('ai_action_relance_desc') || 'Voir les clients à relancer'}
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleQuickAction('next')}
                      className="w-full p-3 text-left rounded-xl bg-hover border border-default hover:border-accent transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎯</span>
                        <div>
                          <p className="text-sm font-medium text-primary group-hover:text-accent">
                            {t('ai_action_next') || 'Quoi faire maintenant ?'}
                          </p>
                          <p className="text-xs text-muted">
                            {t('ai_action_next_desc') || 'Prochaines étapes recommandées'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-accent text-white rounded-br-md'
                            : 'bg-hover border border-default rounded-bl-md'
                        }`}
                      >
                        {/* Render message parts */}
                        {message.parts?.map((part, i) => {
                          if (part.type === 'text') {
                            return (
                              <p key={i} className="text-sm whitespace-pre-wrap">
                                {part.text}
                              </p>
                            );
                          }
                          // Handle tool invocations - check if it's a tool-* type
                          if (part.type.startsWith('tool-')) {
                            const toolPart = part as unknown as { 
                              type: string; 
                              toolCallId: string;
                              toolName?: string;
                              state: string; 
                              output?: ToolResult;
                            };
                            const toolName = toolPart.toolName || toolPart.type.replace('tool-', '');
                            if (toolPart.state === 'output' && toolPart.output) {
                              return (
                                <ToolResultCard key={i} toolName={toolName} result={toolPart.output} />
                              );
                            }
                            if (toolPart.state === 'call' || toolPart.state === 'input-streaming') {
                              return (
                                <div key={i} className="flex items-center gap-2 text-xs text-muted mt-2">
                                  <IconLoader2 size={14} className="animate-spin" />
                                  <span>Exécution de {toolName}...</span>
                                </div>
                              );
                            }
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-hover border border-default rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <IconLoader2 size={16} className="animate-spin text-accent" />
                          <span className="text-sm text-muted">
                            {t('ai_thinking') || 'Réflexion en cours...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="flex justify-center">
                      <div className="bg-danger-light border border-danger rounded-lg px-4 py-2 flex items-center gap-2">
                        <span className="text-sm text-danger">{error.message}</span>
                        <button onClick={handleRetry} className="text-danger hover:underline">
                          <IconRefresh size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex-shrink-0 p-3 border-t border-default bg-card">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t('ai_input_placeholder') || 'Écris ton message...'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-hover border border-default text-primary placeholder:text-muted focus:outline-none focus:border-accent text-sm"
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="p-2.5 rounded-xl bg-danger text-white hover:bg-danger/90 transition-colors"
                  >
                    <IconX size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IconSend size={18} />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
