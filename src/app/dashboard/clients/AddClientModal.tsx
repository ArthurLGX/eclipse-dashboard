import React, { useState, useEffect, useRef } from 'react';
import FloatingModal from '@/app/components/FloatingModal';
import {
  IconUser,
  IconMail,
  IconPhone,
  IconBuilding,
  IconMapPin,
  IconWorld,
  IconCheck,
  IconLoader2,
  IconUserPlus,
} from '@tabler/icons-react';
import type { CreateClientData } from '@/types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (client: CreateClientData) => Promise<void>;
  t: (key: string) => string;
}

export default function AddClientModal({
  isOpen,
  onClose,
  onAdd,
  t,
}: AddClientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [enterprise, setEnterprise] = useState('');
  const [adress, setAdress] = useState('');
  const [website, setWebsite] = useState('');
  const [processStatus, setProcessStatus] = useState<'client' | 'prospect'>('client');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus sur le premier champ à l'ouverture
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset du formulaire à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setName('');
        setEmail('');
        setNumber('');
        setEnterprise('');
        setAdress('');
        setWebsite('');
        setProcessStatus('client');
        setIsActive(true);
        setSuccess(false);
        setError(null);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onAdd({
        name,
        email,
        number,
        enterprise,
        adress,
        website,
        processStatus,
        isActive,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <FloatingModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      {/* Header compact */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-accent-light rounded-lg border border-accent">
          <IconUserPlus size={22} className="!text-white" />
        </div>
        <h2 className="text-xl font-bold text-primary">
          {t('add_client')}
        </h2>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-3 p-2.5 bg-danger-light border border-danger rounded-lg text-danger text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ligne 1: Nom et Email (requis) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconUser size={14} className="text-muted" />
              {t('name')} <span className="text-accent">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Jean Dupont"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconMail size={14} className="text-muted" />
              {t('email')} <span className="text-accent">*</span>
            </label>
            <input
              type="email"
              placeholder="jean@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Ligne 2: Téléphone et Entreprise */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconPhone size={14} className="text-muted" />
              {t('phone')}
            </label>
            <input
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconBuilding size={14} className="text-muted" />
              {t('enterprise')}
            </label>
            <input
              type="text"
              placeholder="Nom de l'entreprise"
              value={enterprise}
              onChange={(e) => setEnterprise(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Ligne 3: Adresse et Site web */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconMapPin size={14} className="text-muted" />
              {t('address')}
            </label>
            <input
              type="text"
              placeholder="123 Rue de Paris"
              value={adress}
              onChange={(e) => setAdress(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconWorld size={14} className="text-muted" />
              {t('website')}
            </label>
            <input
              type="url"
              placeholder="https://exemple.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Section Statut et Actif - compact */}
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg border border-default">
          {/* Sélecteur de statut */}
          <div className="flex-1">
            <label className="text-secondary text-xs mb-2 font-medium block">
              {t('status')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProcessStatus('client')}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  processStatus === 'client'
                    ? 'bg-success text-accent-text'
                    : 'bg-hover text-secondary hover:bg-card'
                }`}
              >
                {t('client')}
              </button>
              <button
                type="button"
                onClick={() => setProcessStatus('prospect')}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  processStatus === 'prospect'
                    ? 'bg-info text-accent-text'
                    : 'bg-hover text-secondary hover:bg-card'
                }`}
              >
                {t('prospect')}
              </button>
            </div>
          </div>

          {/* Toggle Actif */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isActive ? 'bg-success' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${isActive ? 'text-success' : 'text-muted'}`}>
              {t('active')}
            </span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-ghost flex-1 px-4 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !name || !email}
            className={`btn-primary flex-1 px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                <span>{t('loading')}</span>
              </>
            ) : success ? (
              <>
                <IconCheck size={16} />
                <span>Ajouté !</span>
              </>
            ) : (
              <>
                <IconUserPlus size={16} />
                <span>{t('add_client')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </FloatingModal>
  );
}
