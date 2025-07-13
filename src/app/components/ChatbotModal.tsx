'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconSend,
  IconRobot,
  IconUser,
  IconLoader,
  IconMinus,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useChatbot } from '@/app/context/ChatbotContext';
import Image from 'next/image';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatbotModal() {
  const { t, language } = useLanguage();
  const { chatbotState, openChatbot, closeChatbot, minimizeChatbot } =
    useChatbot();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        language === 'fr'
          ? "Bonjour ! Je suis votre assistant IA Eclipse. Comment puis-je vous aider aujourd'hui ?"
          : "Hello! I'm your Eclipse AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatbotState === 'open' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatbotState]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    // Utiliser directement le système local intelligent
    // Plus fiable et spécialisé pour Eclipse Dashboard
    return getFallbackResponse(userMessage);

    // Code API commenté pour éviter les erreurs
    /*
    const huggingFaceResponse = await tryHuggingFaceAPI(userMessage);
    if (huggingFaceResponse) {
      return huggingFaceResponse;
    }
    
    return getFallbackResponse(userMessage);
    */
  };

  /*
  const tryHuggingFaceAPI = async (userMessage: string): Promise<string | null> => {
    const API_URL =
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-small';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || 'hf_demo'}`,
        },
        body: JSON.stringify({
          inputs: userMessage,
          parameters: {
            max_length: 150,
            temperature: 0.7,
            do_sample: true,
          },
        }),
      });

      if (!response.ok) {
        console.log('Hugging Face API response not ok:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (data && data[0] && data[0].generated_text) {
        return data[0].generated_text;
      }

      return null;
    } catch (error) {
      console.error('Hugging Face API error:', error);
      return null;
    }
  };
  */

  const getFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (language === 'fr') {
      // Salutations
      if (
        lowerMessage.includes('bonjour') ||
        lowerMessage.includes('salut') ||
        lowerMessage.includes('hello')
      ) {
        return "Bonjour ! Je suis votre assistant IA Eclipse. Comment puis-je vous aider avec votre dashboard aujourd'hui ?";
      }

      // Aide générale
      if (
        lowerMessage.includes('aide') ||
        lowerMessage.includes('support') ||
        lowerMessage.includes('help')
      ) {
        return "Je peux vous aider avec toutes les fonctionnalités d'Eclipse Dashboard : gestion de projets, clients, prospects, mentors, newsletters, et plus encore. Que souhaitez-vous savoir ?";
      }

      // Projets
      if (lowerMessage.includes('projet') || lowerMessage.includes('project')) {
        return 'Eclipse Dashboard vous permet de créer et gérer vos projets freelance efficacement. Vous pouvez suivre leur progression, organiser les tâches, et gérer les délais. Voulez-vous savoir comment créer un nouveau projet ?';
      }

      // Clients
      if (
        lowerMessage.includes('client') ||
        lowerMessage.includes('customer')
      ) {
        return "La gestion de clients est simple avec Eclipse Dashboard. Vous pouvez ajouter des clients, suivre leurs informations, et organiser vos relations commerciales. Besoin d'aide pour ajouter un nouveau client ?";
      }

      // Prospects
      if (lowerMessage.includes('prospect') || lowerMessage.includes('lead')) {
        return 'Les prospects sont vos futurs clients potentiels. Eclipse Dashboard vous aide à les organiser, suivre vos contacts, et convertir les opportunités en clients.';
      }

      // Mentors
      if (
        lowerMessage.includes('mentor') ||
        lowerMessage.includes('coaching')
      ) {
        return 'Eclipse Dashboard vous permet de gérer vos relations avec vos mentors. Vous pouvez organiser des sessions, suivre vos objectifs, et optimiser votre développement professionnel.';
      }

      // Newsletters
      if (
        lowerMessage.includes('newsletter') ||
        lowerMessage.includes('email') ||
        lowerMessage.includes('communication')
      ) {
        return 'Les newsletters vous permettent de communiquer efficacement avec vos clients et prospects. Créez des campagnes personnalisées et suivez leur performance.';
      }

      // Prix et abonnements
      if (
        lowerMessage.includes('prix') ||
        lowerMessage.includes('tarif') ||
        lowerMessage.includes('abonnement') ||
        lowerMessage.includes('plan') ||
        lowerMessage.includes('subscription')
      ) {
        return "Nous proposons plusieurs plans adaptés à vos besoins :\n• Gratuit : 30 jours d'essai\n• Starter : Fonctionnalités de base\n• Pro : Fonctionnalités avancées\n• Expert : Support prioritaire et fonctionnalités premium";
      }

      // Fonctionnalités
      if (
        lowerMessage.includes('fonctionnalité') ||
        lowerMessage.includes('feature') ||
        lowerMessage.includes('outil') ||
        lowerMessage.includes('tool')
      ) {
        return 'Eclipse Dashboard offre de nombreuses fonctionnalités : gestion de projets, clients, prospects, mentors, newsletters, rapports, et plus encore. Quelle fonctionnalité vous intéresse ?';
      }

      // Problèmes techniques
      if (
        lowerMessage.includes('problème') ||
        lowerMessage.includes('erreur') ||
        lowerMessage.includes('bug') ||
        lowerMessage.includes('issue')
      ) {
        return 'Si vous rencontrez un problème technique, je peux vous aider à le résoudre. Pouvez-vous me décrire plus précisément le problème que vous rencontrez ?';
      }

      // Remerciements
      if (
        lowerMessage.includes('merci') ||
        lowerMessage.includes('thanks') ||
        lowerMessage.includes('thank')
      ) {
        return "De rien ! Je suis là pour vous aider. N'hésitez pas si vous avez d'autres questions sur Eclipse Dashboard.";
      }

      // Questions par défaut
      return 'Je comprends votre question. Eclipse Dashboard est un outil complet pour gérer votre activité freelance. Pouvez-vous me donner plus de détails sur ce que vous recherchez spécifiquement ?';
    } else {
      // English responses
      if (
        lowerMessage.includes('hello') ||
        lowerMessage.includes('hi') ||
        lowerMessage.includes('hey')
      ) {
        return "Hello! I'm your Eclipse AI assistant. How can I help you with your dashboard today?";
      }

      if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        return 'I can help you with all Eclipse Dashboard features: project management, clients, prospects, mentors, newsletters, and more. What would you like to know?';
      }

      if (lowerMessage.includes('project')) {
        return 'Eclipse Dashboard allows you to create and manage your freelance projects efficiently. You can track progress, organize tasks, and manage deadlines. Would you like to know how to create a new project?';
      }

      if (
        lowerMessage.includes('client') ||
        lowerMessage.includes('customer')
      ) {
        return 'Client management is simple with Eclipse Dashboard. You can add clients, track their information, and organize your business relationships. Need help adding a new client?';
      }

      if (lowerMessage.includes('prospect') || lowerMessage.includes('lead')) {
        return 'Prospects are your potential future clients. Eclipse Dashboard helps you organize them, track contacts, and convert opportunities into clients.';
      }

      if (
        lowerMessage.includes('mentor') ||
        lowerMessage.includes('coaching')
      ) {
        return 'Eclipse Dashboard allows you to manage your relationships with mentors. You can organize sessions, track goals, and optimize your professional development.';
      }

      if (
        lowerMessage.includes('newsletter') ||
        lowerMessage.includes('email') ||
        lowerMessage.includes('communication')
      ) {
        return 'Newsletters allow you to communicate effectively with clients and prospects. Create personalized campaigns and track their performance.';
      }

      if (
        lowerMessage.includes('price') ||
        lowerMessage.includes('plan') ||
        lowerMessage.includes('subscription')
      ) {
        return 'We offer several plans tailored to your needs:\n• Free: 30-day trial\n• Starter: Basic features\n• Pro: Advanced features\n• Expert: Priority support and premium features';
      }

      if (lowerMessage.includes('feature') || lowerMessage.includes('tool')) {
        return 'Eclipse Dashboard offers many features: project management, clients, prospects, mentors, newsletters, reports, and more. Which feature interests you?';
      }

      if (
        lowerMessage.includes('problem') ||
        lowerMessage.includes('error') ||
        lowerMessage.includes('bug') ||
        lowerMessage.includes('issue')
      ) {
        return "If you're experiencing a technical issue, I can help you resolve it. Can you describe the problem you're encountering more specifically?";
      }

      if (lowerMessage.includes('thank')) {
        return "You're welcome! I'm here to help. Don't hesitate if you have other questions about Eclipse Dashboard.";
      }

      return "I understand your question. Eclipse Dashboard is a comprehensive tool for managing your freelance activity. Can you give me more details about what you're looking for specifically?";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const botResponse = await generateResponse(userMessage.content);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          language === 'fr'
            ? 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer dans quelques instants.'
            : "Sorry, I'm experiencing technical difficulties. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([language === 'fr' ? 'fr-FR' : 'en-US'], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMinimize = () => {
    minimizeChatbot();
  };

  const handleClose = () => {
    closeChatbot();
  };

  // Si fermé, afficher seulement l'icône flottante
  if (chatbotState === 'closed') {
    return null;
  }

  // Si minimisé, afficher l'icône flottante
  if (chatbotState === 'minimized') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed lg:bottom-4 lg:right-4 bottom-1/2 translate-y-1/2 right-4 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={openChatbot}
          style={{
            boxShadow: '0 0 10px 0 rgba(243, 236, 236, 0.5)',
          }}
          className="cursor-pointer w-14 h-14 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-full shadow-lg flex items-center justify-center transition-colors"
        >
          <Image
            src="/images/logo/eclipse-logo.png"
            alt="Eclipse Logo"
            width={30}
            height={30}
          />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 lg:inset-auto lg:bottom-4 lg:right-4 lg:bg-transparent bg-black/50 backdrop-blur-sm z-[1000]"
        onClick={closeChatbot}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="lg:bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl lg:w-80 lg:h-[500px] w-11/12 h-11/12 lg:mt-0 mt-4 mx-auto flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className=" flex items-center justify-center">
                <Image
                  src="/images/logo/eclipse-logo.png"
                  alt="Eclipse Logo"
                  width={30}
                  height={30}
                />
              </div>
              <div>
                <h3 className="text-zinc-200 font-semibold text-sm">
                  {t('eclipse_chatbot_support')}
                </h3>
                <p className="text-zinc-400 text-xs">
                  {t('eclipse_chatbot_support_description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
                title={language === 'fr' ? 'Réduire' : 'Minimize'}
              >
                <IconMinus size={16} className="text-zinc-400" />
              </button>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
                title={language === 'fr' ? 'Fermer' : 'Close'}
              >
                <IconX size={16} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === 'bot' && (
                      <IconRobot
                        size={16}
                        className="text-emerald-400 mt-0.5 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === 'user'
                            ? 'text-emerald-100'
                            : 'text-zinc-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <IconUser
                        size={16}
                        className="text-emerald-100 mt-0.5 flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <IconRobot size={16} className="text-emerald-400" />
                    <div className="flex items-center gap-2">
                      <IconLoader
                        size={16}
                        className="text-zinc-400 animate-spin"
                      />
                      <span className="text-zinc-400 text-sm">
                        {language === 'fr'
                          ? "En train d'écrire..."
                          : 'Typing...'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  language === 'fr'
                    ? 'Tapez votre message...'
                    : 'Type your message...'
                }
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 text-sm placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-lg p-2 transition-colors"
              >
                <IconSend size={16} className="text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
