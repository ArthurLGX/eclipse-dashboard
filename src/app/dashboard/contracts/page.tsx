'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { IconFileText, IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';

export default function ContractsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Pour l'instant, page placeholder - les contrats seront implémentés plus tard
  const contracts: unknown[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {t('contracts') || 'Contrats'}
          </h1>
          <p className="text-secondary mt-1">
            {t('contracts_description') || 'Gérez vos contrats, CGV et documents légaux'}
          </p>
        </div>
        <button 
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => {
            // TODO: Ouvrir modal de création
          }}
        >
          <IconPlus size={18} />
          {t('add_contract') || 'Nouveau contrat'}
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder={t('search') || 'Rechercher...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full !pl-10 pr-4 py-2.5 bg-background border border-default rounded-lg focus:ring-1 focus:ring-accent focus:border-transparent"
        />
      </div>

      {/* État vide */}
      {contracts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-info-light rounded-full flex items-center justify-center mb-6">
            <IconFileText size={40} className="text-info" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">
            {t('no_contracts') || 'Aucun contrat'}
          </h3>
          <p className="text-secondary text-center max-w-md mb-6">
            {t('no_contracts_description') || 'Créez votre premier contrat pour commencer'}
          </p>
          <button 
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            onClick={() => {
              // TODO: Ouvrir modal de création
            }}
          >
            <IconPlus size={18} />
            {t('add_contract') || 'Nouveau contrat'}
          </button>
          
          {/* Badge "Bientôt disponible" */}
          <div className="mt-8 px-4 py-2 bg-warning-light border border-warning rounded-lg">
            <p className="text-warning text-sm font-medium">
              🚧 Module en cours de développement
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

