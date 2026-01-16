'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  IconCopy,
  IconCheck,
  IconFileInvoice,
  IconExternalLink,
  IconCommand,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { useAIAssistant } from '@/app/context/AIAssistantContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ============================================================================
// TYPES
// ============================================================================

interface EmailData {
  subject: string;
  body: string;
}

interface TaskData {
  id?: string;
  title: string;
  dueDate?: string;
  projectId?: string;
  created?: boolean;
}

interface QuoteData {
  id?: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  amount?: number;
  created?: boolean;
}

interface ToolResult {
  success?: boolean;
  email?: EmailData;
  task?: TaskData;
  quote?: QuoteData;
  steps?: string[];
  error?: string;
  actionUrl?: string;
}

// ============================================================================
// TOOL RESULT COMPONENTS
// ============================================================================

const ToolResultCard: React.FC<{ 
  toolName: string; 
  result: ToolResult;
  onAction?: (action: string, data: ToolResult) => void;
}> = ({ toolName, result, onAction }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getIcon = () => {
    switch (toolName) {
      case 'generateRelanceEmail':
        return <IconMail size={16} className="text-info" />;
      case 'createTask':
        return <IconListCheck size={16} className="text-success" />;
      case 'createQuote':
        return <IconFileInvoice size={16} className="text-accent" />;
      case 'suggestNextSteps':
        return <IconArrowRight size={16} className="text-warning" />;
      default:
        return <IconSparkles size={16} className="text-accent" />;
    }
  };

  const getTitle = () => {
    switch (toolName) {
      case 'generateRelanceEmail':
        return t('email_generated') || 'Email de relance généré';
      case 'createTask':
        return result.task?.created 
          ? (t('task_created') || 'Tâche créée ✓')
          : (t('task_ready') || 'Tâche prête à créer');
      case 'createQuote':
        return result.quote?.created
          ? (t('quote_created') || 'Devis créé ✓')
          : (t('quote_ready') || 'Devis prêt à créer');
      case 'suggestNextSteps':
        return t('next_steps') || 'Prochaines étapes';
      default:
        return toolName;
    }
  };

  if (!result.success) {
    return (
      <div className="mt-2 p-3 bg-danger-light border border-danger rounded-lg">
        <div className="flex items-center gap-2">
          <IconX size={16} className="text-danger" />
          <span className="text-sm text-danger">{result.error || 'Une erreur est survenue'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-hover border border-default rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="text-sm font-medium text-primary">{getTitle()}</span>
      </div>
      
      {/* Email Result */}
      {toolName === 'generateRelanceEmail' && result.email && (
        <div className="space-y-2">
          <div className="text-xs text-muted">
            <strong>Objet:</strong> {result.email.subject}
          </div>
          <div className="text-xs text-secondary bg-card p-2 rounded border border-default max-h-32 overflow-y-auto whitespace-pre-wrap">
            {result.email.body}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleCopy(`Objet: ${result.email!.subject}\n\n${result.email!.body}`)}
              className="text-xs text-accent hover:underline flex items-center gap-1 px-2 py-1 rounded bg-accent-light"
            >
              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
              {copied ? 'Copié !' : (t('copy_email') || 'Copier l\'email')}
            </button>
            <button 
              onClick={() => onAction?.('openEmail', result)}
              className="text-xs text-info hover:underline flex items-center gap-1 px-2 py-1 rounded bg-info-light"
            >
              <IconExternalLink size={12} />
              {t('open_in_editor') || 'Ouvrir dans l\'éditeur'}
            </button>
          </div>
        </div>
      )}

      {/* Task Result */}
      {toolName === 'createTask' && result.task && (
        <div className="space-y-2">
          <div className="text-xs text-secondary">
            <p><strong>Tâche:</strong> {result.task.title}</p>
            {result.task.dueDate && (
              <p><strong>Échéance:</strong> {new Date(result.task.dueDate).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          {result.task.created ? (
            <p className="text-xs text-success flex items-center gap-1">
              <IconCheck size={12} />
              {t('task_created_success') || 'Tâche créée avec succès'}
            </p>
          ) : (
            <button 
              onClick={() => onAction?.('confirmTask', result)}
              className="w-full text-xs !text-white bg-success hover:bg-success-light hover:!text-success flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors"
            >
              <IconCheck size={14} />
              {t('confirm_create_task') || 'Confirmer la création'}
            </button>
          )}
        </div>
      )}

      {/* Quote Result */}
      {toolName === 'createQuote' && result.quote && (
        <div className="space-y-2">
          <div className="text-xs text-secondary">
            <p><strong>Client:</strong> {result.quote.clientName}</p>
            {result.quote.amount && (
              <p><strong>Montant estimé:</strong> {result.quote.amount.toLocaleString('fr-FR')} €</p>
            )}
          </div>
          {result.quote.created ? (
            <div className="space-y-2">
              <p className="text-xs text-success flex items-center gap-1">
                <IconCheck size={12} />
                {t('quote_created_success') || 'Devis créé avec succès'}
              </p>
              {result.actionUrl && (
                <button 
                  onClick={() => onAction?.('navigateToQuote', result)}
                  className="w-full text-xs !text-accent bg-accent-light hover:bg-accent hover:text-white flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors"
                >
                  <IconExternalLink size={14} />
                  {t('view_quote') || 'Voir le devis'}
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={() => onAction?.('confirmQuote', result)}
              className="w-full text-xs text-white bg-accent hover:bg-accent-light hover:!text-accent flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors"
            >
              <IconFileInvoice size={14} />
              {t('create_quote_now') || 'Créer le devis maintenant'}
            </button>
          )}
        </div>
      )}

      {/* Next Steps Result */}
      {toolName === 'suggestNextSteps' && result.steps && (
        <ul className="text-xs text-secondary space-y-1.5">
          {result.steps.map((step: string, i: number) => (
            <li key={i} className="flex items-start gap-2 p-1.5 rounded hover:bg-card cursor-pointer transition-colors">
              <span className="text-accent font-bold min-w-[16px]">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ============================================================================
// KEYBOARD SHORTCUT HINT
// ============================================================================

const KeyboardShortcutHint: React.FC = () => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted">
      <kbd className="px-1.5 py-0.5 rounded bg-card border border-default font-mono text-[10px]">
        {isMac ? '⌘' : 'Ctrl'}
      </kbd>
      <span>+</span>
      <kbd className="px-1.5 py-0.5 rounded bg-card border border-default font-mono text-[10px]">
        K
      </kbd>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIChatAssistant() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { isOpen, closeAssistant, openAssistant, initialPrompt, clearInitialPrompt } = useAIAssistant();
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pendingActions, setPendingActions] = useState<Map<string, ToolResult>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get token from localStorage for API calls
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // AI SDK v6 useChat hook with DefaultChatTransport
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    setMessages,
  } = useChat({
    id: 'eclipse-assistant',
    transport: new DefaultChatTransport({
      api: '/api/ai/assistant',
      headers: (): Record<string, string> => {
        const token = getAuthToken();
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
        return {};
      },
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

  // Handle initial prompt from context
  useEffect(() => {
    if (isOpen && initialPrompt) {
      sendMessage({ text: initialPrompt });
      clearInitialPrompt();
    }
  }, [isOpen, initialPrompt, sendMessage, clearInitialPrompt]);

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

  // Handle tool actions (confirm task, quote, etc.)
  const handleToolAction = useCallback(async (action: string, data: ToolResult) => {
    const token = getAuthToken();
    
    switch (action) {
      case 'confirmTask':
        if (data.task) {
          try {
            // Call API to actually create the task
            const response = await fetch('/api/ai/actions/create-task', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(data.task),
            });
            
            if (response.ok) {
              const result = await response.json();
              // Update the pending action to show success
              setPendingActions(prev => {
                const newMap = new Map(prev);
                newMap.set(`task-${data.task!.title}`, { ...data, task: { ...data.task!, id: result.id, created: true } });
                return newMap;
              });
            }
          } catch (err) {
            console.error('Failed to create task:', err);
          }
        }
        break;

      case 'confirmQuote':
        if (data.quote) {
          // Navigate to quote creation page with pre-filled data
          const params = new URLSearchParams();
          if (data.quote.clientId) params.set('client', data.quote.clientId);
          if (data.quote.projectId) params.set('project', data.quote.projectId);
          router.push(`/dashboard/factures/new?type=quote&${params.toString()}`);
          closeAssistant();
        }
        break;

      case 'navigateToQuote':
        if (data.actionUrl) {
          router.push(data.actionUrl);
          closeAssistant();
        }
        break;

      case 'openEmail':
        // Open email in a new window or modal
        if (data.email) {
          const subject = encodeURIComponent(data.email.subject);
          const body = encodeURIComponent(data.email.body);
          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        }
        break;
    }
  }, [router, closeAssistant]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setPendingActions(new Map());
  }, [setMessages]);

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
            onClick={() => openAssistant()}
            className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-full bg-accent-light border border-accent shadow-xl flex items-center justify-center hover:shadow-2xl transition-shadow group"
            title={`${t('ai_assistant') || 'Assistant IA Eclipse'} (⌘K)`}
          >
            <div className="relative">
              <Image
                src="/images/logo/eclipse-logo.png"
                alt="Eclipse AI"
                width={32}
                height={32}
                className="rounded-full bg-accent-light"
              />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-accent animate-pulse" />
            </div>
            {/* Keyboard shortcut tooltip on hover */}
            <div className="absolute left-full ml-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-card border border-default rounded-lg px-2 py-1 shadow-lg whitespace-nowrap">
                <KeyboardShortcutHint />
              </div>
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
                  className="rounded-full bg-accent-light"
                />
                <div>
                  <h3 className="font-semibold text-sm !text-white">Eclipse Copilot</h3>
                  <p className="text-xs !text-white opacity-70 flex items-center gap-2">
                    {t('ai_assistant_subtitle') || 'Votre assistant business'}
                    <span className="hidden sm:flex items-center gap-1 bg-accent-light text-accent px-1.5 py-0.5 rounded text-[10px]">
                      <IconCommand size={10} />K
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="p-1.5 rounded-lg hover:bg-accent-light hover:text-accent transition-colors"
                    title={t('clear_chat') || 'Nouvelle conversation'}
                  >
                    <IconRefresh size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg hover:bg-accent-light hover:text-accent transition-colors"
                  title={isExpanded ? 'Réduire' : 'Agrandir'}
                >
                  {isExpanded ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
                </button>
                <button
                  onClick={closeAssistant}
                  className="p-1.5 rounded-lg hover:bg-accent-light hover:text-accent transition-colors"
                  title="Fermer (Échap)"
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
                          // Handle tool invocations
                          if (part.type.startsWith('tool-')) {
                            const toolPart = part as unknown as { 
                              type: string; 
                              toolCallId: string;
                              toolName?: string;
                              state: string; 
                              output?: ToolResult;
                            };
                            const toolName = toolPart.toolName || toolPart.type.replace('tool-', '');
                            
                            // Check for pending action override
                            const pendingKey = toolPart.output?.task 
                              ? `task-${toolPart.output.task.title}` 
                              : toolPart.output?.quote 
                                ? `quote-${toolPart.output.quote.clientId}` 
                                : null;
                            const overriddenResult = pendingKey ? pendingActions.get(pendingKey) : null;
                            const resultToShow = overriddenResult || toolPart.output;
                            
                            if (toolPart.state === 'output' && resultToShow) {
                              return (
                                <ToolResultCard 
                                  key={i} 
                                  toolName={toolName} 
                                  result={resultToShow}
                                  onAction={handleToolAction}
                                />
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
                  data-ai-input="true"
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="p-2.5 rounded-xl bg-danger text-white hover:bg-danger-light hover:!text-danger transition-colors"
                  >
                    <IconX size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent-light hover:!text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
