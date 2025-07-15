import React, { useState } from 'react';
import FloatingModal from '@/app/components/FloatingModal';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (client: {
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    website: string;
    processStatus: string;
    isActive: boolean;
  }) => Promise<void>;
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
  const [processStatus, setProcessStatus] = useState('client');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
    setLoading(false);
    onClose();
  };

  return (
    <FloatingModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-200 mb-6 text-center">
        {t('add_client')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 mb-1">{t('name')} *</label>
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">{t('email')} *</label>
            <input
              type="email"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">{t('phone')}</label>
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={number}
              onChange={e => setNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">
              {t('enterprise')}
            </label>
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={enterprise}
              onChange={e => setEnterprise(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">{t('address')}</label>
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={adress}
              onChange={e => setAdress(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">{t('website')}</label>
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <label className="block text-zinc-400 mb-1">{t('status')}</label>
            <select
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
              value={processStatus}
              onChange={e => setProcessStatus(e.target.value)}
            >
              <option value="client">{t('client')}</option>
              <option value="prospect">{t('prospect')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="accent-emerald-500 w-5 h-5"
            />
            <label htmlFor="isActive" className="text-zinc-400">
              {t('active')}
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-emerald-500 text-black px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 font-semibold"
          >
            {loading ? t('loading') : t('add_client')}
          </button>
        </div>
      </form>
    </FloatingModal>
  );
}
