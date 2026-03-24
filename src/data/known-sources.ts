import type { LeadSourceDetection } from '@/types/lead-source';

export interface KnownSourceTemplate {
  id: string;
  name: string;
  domain: string;
  detection: LeadSourceDetection;
}

export const KNOWN_SOURCES: KnownSourceTemplate[] = [
  {
    id: 'lemlist',
    name: 'Lemlist',
    domain: 'lemlist.com',
    detection: {
      from_email_contains: ['lemlist.com'],
      subject_contains: ['replied to your campaign', 'new reply'],
    },
  },
  {
    id: 'instantly',
    name: 'Instantly',
    domain: 'instantly.ai',
    detection: {
      from_email_contains: ['instantly.ai'],
      subject_contains: ['new reply', 'replied to'],
    },
  },
  {
    id: 'apollo',
    name: 'Apollo',
    domain: 'apollo.io',
    detection: {
      from_email_contains: ['apollo.io', 'apolloapp.io'],
      subject_contains: ['new reply in your sequence'],
    },
  },
  {
    id: 'hunter',
    name: 'Hunter Campaigns',
    domain: 'hunter.io',
    detection: {
      from_email_contains: ['hunter.io'],
      subject_contains: ['new reply from'],
    },
  },
  {
    id: 'salesloft',
    name: 'Salesloft',
    domain: 'salesloft.com',
    detection: { from_email_contains: ['salesloft.com'] },
  },
  {
    id: 'outreach',
    name: 'Outreach',
    domain: 'outreach.io',
    detection: { from_email_contains: ['outreach.io'] },
  },
  {
    id: 'woodpecker',
    name: 'Woodpecker',
    domain: 'woodpecker.co',
    detection: { from_email_contains: ['woodpecker.co'] },
  },
  {
    id: 'mailshake',
    name: 'Mailshake',
    domain: 'mailshake.com',
    detection: { from_email_contains: ['mailshake.com'] },
  },
  {
    id: 'reply',
    name: 'Reply.io',
    domain: 'reply.io',
    detection: { from_email_contains: ['reply.io'] },
  },
  {
    id: 'klenty',
    name: 'Klenty',
    domain: 'klenty.com',
    detection: { from_email_contains: ['klenty.com'] },
  },
];
