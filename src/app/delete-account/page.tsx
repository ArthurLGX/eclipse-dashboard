'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LegalPageLayout from '@/app/components/LegalPageLayout';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { getToken } from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.eclipsestudiodev.fr';

export default function DeleteAccountPage() {
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  const isFr = language === 'fr';
  const confirmPhrase = isFr ? 'SUPPRIMER MON COMPTE' : 'DELETE MY ACCOUNT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.toUpperCase() !== confirmPhrase) {
      showGlobalPopup(isFr ? 'Veuillez saisir exactement la phrase de confirmation.' : 'Please enter the confirmation phrase exactly.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch('/api/users/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmPhrase: confirmText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isFr ? 'Erreur lors de la demande' : 'Request failed'));
      }
      setDeletionRequested(true);
      if (token) logout();
      showGlobalPopup(isFr ? 'Demande enregistrée. Vous recevrez un email de confirmation.' : 'Request registered. You will receive a confirmation email.', 'success');
    } catch (err) {
      showGlobalPopup(err instanceof Error ? err.message : (isFr ? 'Erreur' : 'Error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = isFr ? (
    <>
      <h2>Demande de suppression de compte</h2>
      <p>
        Conformément au RGPD et aux exigences Meta, vous pouvez demander la suppression de votre compte et de toutes les données associées.
      </p>

      <h2>Méthodes disponibles</h2>

      <h3>1. Depuis votre compte (connecté)</h3>
      {user ? (
        <div className="my-4 p-4 rounded-lg border" style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-surface)' }}>
          <p className="mb-3">Vous êtes connecté en tant que <strong>{user.email}</strong>.</p>
          <form onSubmit={handleSubmit}>
            <p className="text-sm mb-3">
              Pour confirmer, saisissez exactement : <code className="px-2 py-0.5 rounded bg-black/10 font-mono text-xs">{confirmPhrase}</code>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              className="w-full px-4 py-2 mb-3 rounded border font-mono text-sm"
              style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-bg)' }}
            />
            <button
              type="submit"
              disabled={isSubmitting || confirmText.toUpperCase() !== confirmPhrase}
              className="px-4 py-2 rounded font-medium text-sm disabled:opacity-50"
              style={{ background: 'var(--color-danger)', color: 'white' }}
            >
              {isSubmitting ? '…' : 'Envoyer la demande de suppression'}
            </button>
          </form>
        </div>
      ) : (
        <p><Link href="/login" className="underline">Connectez-vous</Link> pour demander la suppression depuis votre compte.</p>
      )}

      <h3>2. Par email</h3>
      <p>
        Envoyez votre demande à <a href="mailto:privacy@eclipsestudiodev.fr" className="underline">privacy@eclipsestudiodev.fr</a> en indiquant l&apos;email de votre compte. Nous traiterons votre demande sous 30 jours.
      </p>

      <h3>3. Si vous avez connecté Facebook</h3>
      <p>
        Vous pouvez également demander la suppression via Paramètres Facebook → Applications et sites web → Eclipse → Envoyer une demande.
      </p>

      <h2>Délai de traitement</h2>
      <p>Les demandes sont traitées sous 30 jours. Vous recevrez une confirmation une fois la suppression effectuée.</p>

      <h2>URL de statut (Meta)</h2>
      <p>
        Si vous avez initié une suppression via Facebook/Meta, vous pouvez vérifier le statut sur cette page : <a href="/delete-account" className="underline">{APP_URL}/delete-account</a>
      </p>
    </>
  ) : (
    <>
      <h2>Account Deletion Request</h2>
      <p>
        In accordance with GDPR and Meta requirements, you can request deletion of your account and all associated data.
      </p>

      <h2>Available Methods</h2>

      <h3>1. From Your Account (logged in)</h3>
      {user ? (
        <div className="my-4 p-4 rounded-lg border" style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-surface)' }}>
          <p className="mb-3">You are logged in as <strong>{user.email}</strong>.</p>
          <form onSubmit={handleSubmit}>
            <p className="text-sm mb-3">
              To confirm, enter exactly: <code className="px-2 py-0.5 rounded bg-black/10 font-mono text-xs">{confirmPhrase}</code>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              className="w-full px-4 py-2 mb-3 rounded border font-mono text-sm"
              style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-bg)' }}
            />
            <button
              type="submit"
              disabled={isSubmitting || confirmText.toUpperCase() !== confirmPhrase}
              className="px-4 py-2 rounded font-medium text-sm disabled:opacity-50"
              style={{ background: 'var(--color-danger)', color: 'white' }}
            >
              {isSubmitting ? '…' : 'Submit deletion request'}
            </button>
          </form>
        </div>
      ) : (
        <p><Link href="/login" className="underline">Log in</Link> to request deletion from your account.</p>
      )}

      <h3>2. By Email</h3>
      <p>
        Send your request to <a href="mailto:privacy@eclipsestudiodev.fr" className="underline">privacy@eclipsestudiodev.fr</a> with your account email. We will process your request within 30 days.
      </p>

      <h3>3. If You Connected Facebook</h3>
      <p>
        You can also request deletion via Facebook Settings → Apps and Websites → Eclipse → Send Request.
      </p>

      <h2>Processing Time</h2>
      <p>Requests are processed within 30 days. You will receive confirmation once deletion is complete.</p>

      <h2>Status URL (Meta)</h2>
      <p>
        If you initiated deletion via Facebook/Meta, you can check the status on this page: <a href="/delete-account" className="underline">{APP_URL}/delete-account</a>
      </p>
    </>
  );

  return (
    <LegalPageLayout title="Supprimer mon compte" titleEn="Delete my account">
      {deletionRequested ? (
        <div className="p-6 rounded-lg border" style={{ borderColor: 'var(--landing-accent)', background: 'color-mix(in srgb, var(--landing-accent) 10%, transparent)' }}>
          <p className="font-medium mb-2">{isFr ? 'Demande enregistrée' : 'Request registered'}</p>
          <p className="text-sm">{isFr ? 'Nous traitons votre demande. Vous recevrez un email de confirmation sous 30 jours.' : 'We are processing your request. You will receive a confirmation email within 30 days.'}</p>
        </div>
      ) : (
        content
      )}
    </LegalPageLayout>
  );
}
