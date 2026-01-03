'use client';

import React from 'react';
import DOMPurify from 'dompurify';
import {
  IconMail,
  IconInbox,
  IconStar,
  IconStarFilled,
  IconSend,
  IconArchive,
  IconTrash,
  IconSearch,
  IconPaperclip,
  IconDots,
  IconChevronDown,
  IconUser,
  IconCalendar,
} from '@tabler/icons-react';

// Types
interface EmailTemplate {
  id: string;
  primaryColor: string;
  accentColor: string;
}

interface SenderInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface NewsletterData {
  title: string;
  subject: string;
  content: string;
  template: string;
  send_at?: string | null;
  author?: {
    username?: string;
    email?: string;
  } | null;
}

interface MailboxPreviewProps {
  newsletter: NewsletterData;
  senderInfo?: SenderInfo;
  translations: {
    inbox: string;
    favorites: string;
    sent_folder: string;
    archives: string;
    trash: string;
    search_placeholder: string;
    now: string;
    to_me: string;
    no_content: string;
    special_offer?: string;
  };
}

// Configuration des templates
const TEMPLATE_CONFIG: Record<string, EmailTemplate> = {
  standard: { id: 'standard', primaryColor: '#8B9DC3', accentColor: '#A8B5D4' },
  promotional: { id: 'promotional', primaryColor: '#7BB8E0', accentColor: '#9DCEF0' },
  announcement: { id: 'announcement', primaryColor: '#9DD1CA', accentColor: '#B5DDD8' },
  custom: { id: 'custom', primaryColor: '#E8D9B5', accentColor: '#F9EDD8' },
};

// Fake emails pour la simulation
const FAKE_EMAILS = [
  { from: 'LinkedIn', subject: 'Nouvelles opportunités pour vous', time: '10:32', avatar: '#0A66C2' },
  { from: 'Stripe', subject: 'Votre facture mensuelle', time: '09:15', avatar: '#635BFF' },
  { from: 'GitHub', subject: 'Security alert: new sign-in', time: 'Hier', avatar: '#24292F' },
  { from: 'Google', subject: 'Alerte de sécurité', time: 'Hier', avatar: '#EA4335' },
  { from: 'Figma', subject: 'Quelqu\'un vous a mentionné', time: 'Lun.', avatar: '#F24E1E' },
  { from: 'Slack', subject: 'Messages non lus dans #general', time: 'Dim.', avatar: '#4A154B' },
];

// Composant Email Preview interne
function EmailPreviewContent({ 
  newsletter, 
  templateConfig,
  translations,
}: { 
  newsletter: NewsletterData; 
  templateConfig: EmailTemplate;
  translations: MailboxPreviewProps['translations'];
}) {
  const isPromo = newsletter.template === 'promotional';
  const isAnnouncement = newsletter.template === 'announcement';

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden text-gray-800 w-full">
      {/* Header with template-specific styling */}
      <div 
        className={`text-center ${isAnnouncement ? 'py-12' : 'py-8'}`}
        style={{ 
          background: `linear-gradient(135deg, ${templateConfig.primaryColor}, ${templateConfig.accentColor})` 
        }}
      >
        {isPromo && (
          <div className="inline-block px-4 py-1 bg-white/40 backdrop-blur rounded-full text-gray-800 text-sm font-bold mb-4">
            🎉 {translations.special_offer || 'Offre Spéciale'}
          </div>
        )}
        
        <h1 className={`font-bold text-gray-800 mb-2 px-6 ${isAnnouncement ? 'text-3xl' : 'text-2xl'}`}>
          {newsletter.title}
        </h1>
        
        {newsletter.subject && newsletter.subject !== newsletter.title && (
          <p className="text-gray-700/80 px-6">{newsletter.subject}</p>
        )}
      </div>

      {/* Email body */}
      <div className="p-8">
        {newsletter.content ? (
          <div 
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(newsletter.content, {
                ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'video', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'controls', 'width', 'height'],
                ALLOW_DATA_ATTR: false,
              })
            }}
          />
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            {translations.no_content}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <IconUser className="w-4 h-4" />
            <span>{newsletter.author?.username || newsletter.author?.email || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconCalendar className="w-4 h-4" />
            <span>
              {newsletter.send_at 
                ? new Date(newsletter.send_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : '-'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MailboxPreview({ 
  newsletter,
  senderInfo,
  translations,
}: MailboxPreviewProps) {
  const templateConfig = TEMPLATE_CONFIG[newsletter.template] || TEMPLATE_CONFIG.standard;
  
  // Utiliser les infos de l'auteur si senderInfo n'est pas fourni
  const sender = senderInfo || {
    firstName: newsletter.author?.username?.split(' ')[0] || 'Eclipse',
    lastName: newsletter.author?.username?.split(' ')[1] || '',
    email: newsletter.author?.email || 'email@example.com',
  };

  const sendTime = newsletter.send_at 
    ? new Date(newsletter.send_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : translations.now;

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[700px]">
      {/* Mailbox Header */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <IconMail className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Aperçu Boîte Mail</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar - Folders */}
        <div className="w-16 md:w-48 bg-gray-50 border-r border-gray-200 flex-shrink-0 hidden sm:block">
          <div className="p-2 md:p-4 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
              <IconInbox className="w-5 h-5" />
              <span className="hidden md:inline">{translations.inbox}</span>
              <span className="hidden md:inline ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconStar className="w-5 h-5" />
              <span className="hidden md:inline">{translations.favorites}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconSend className="w-5 h-5" />
              <span className="hidden md:inline">{translations.sent_folder}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconArchive className="w-5 h-5" />
              <span className="hidden md:inline">{translations.archives}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconTrash className="w-5 h-5" />
              <span className="hidden md:inline">{translations.trash}</span>
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="w-64 lg:w-80 border-r border-gray-200 flex-shrink-0 flex flex-col bg-white">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={translations.search_placeholder}
                className="w-full !pl-10 !pr-4 py-2 !bg-gray-100 rounded-lg text-sm !text-gray-700 placeholder:!text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 !border-zinc-400"
                readOnly
              />
            </div>
          </div>

          {/* Email items */}
          <div className="flex-1 overflow-y-auto">
            {/* Current newsletter - highlighted */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 cursor-pointer">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
                  style={{ backgroundColor: templateConfig.primaryColor }}
                >
                  {(sender.firstName?.[0] || 'E').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 truncate">
                      {sender.firstName} {sender.lastName}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{sendTime}</span>
                  </div>
                  <p className="font-medium text-gray-800 text-sm truncate mb-0.5">
                    {newsletter.subject}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {newsletter.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-13">
                <IconPaperclip className="w-3 h-3 text-gray-400" />
                <IconStarFilled className="w-3 h-3 text-yellow-400" />
              </div>
            </div>

            {/* Fake emails */}
            {FAKE_EMAILS.map((email, idx) => (
              <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                    style={{ backgroundColor: email.avatar }}
                  >
                    {email.from[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700 truncate">{email.from}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{email.time}</span>
                    </div>
                    <p className="text-gray-600 text-sm truncate">{email.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
          {/* Email header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {newsletter.subject}
              </h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <IconArchive className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <IconTrash className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <IconDots className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: templateConfig.primaryColor }}
              >
                {(sender.firstName?.[0] || 'E').toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {sender.firstName} {sender.lastName}
                  </span>
                  <span className="text-gray-400 text-sm">
                    &lt;{sender.email}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{translations.to_me}</span>
                  <IconChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Email body - scrollable */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-w-0">
            <div className="w-full max-w-2xl mx-auto">
              <EmailPreviewContent 
                newsletter={newsletter} 
                templateConfig={templateConfig}
                translations={translations}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

