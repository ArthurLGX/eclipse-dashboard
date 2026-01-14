'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { IconFileText, IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import Image from 'next/image';
import AIContractGenerator from '@/app/components/AIContractGenerator';
import { useCompany } from '@/hooks/useApi';

export default function ContractsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Récupérer les données de l'entreprise
  const { data: companyData } = useCompany(user?.id);
  const company = Array.isArray(companyData) ? companyData[0] : companyData;

  // Pour l'instant, page placeholder - les contrats seront implémentés plus tard
  const contracts: unknown[] = [];

  const handleContractGenerated = (contract: { title: string }) => {
    showGlobalPopup(
      `${t('contract_generated') || 'Contrat généré'}: ${contract.title}`,
      'success'
    );
    // TODO: Sauvegarder le contrat dans la base de données
  };

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
        <div className="flex items-center gap-3">
          {/* Bouton Eclipse Assistant */}
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-accent-light text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-all"
            onClick={() => setShowAIGenerator(true)}
          >
            <Image 
              src="/images/logo/eclipse-logo.png" 
              alt="Eclipse Assistant" 
              width={18} 
              height={18}
              className="w-4.5 h-4.5"
            />
            Eclipse Assistant
          </button>
          {/* Bouton créer manuellement */}
          <button 
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            onClick={() => {
              // TODO: Ouvrir modal de création manuelle
              showGlobalPopup(t('coming_soon') || 'Bientôt disponible', 'info');
            }}
          >
            <IconPlus size={18} />
            {t('add_contract') || 'Nouveau contrat'}
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder={t('search') || 'Rechercher...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-input border border-default rounded-lg focus:ring-1 focus:ring-accent focus:border-transparent"
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
            {t('no_contracts_description') || 'Générez votre premier contrat avec Eclipse Assistant'}
          </p>
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:opacity-90 transition-all"
            onClick={() => setShowAIGenerator(true)}
          >
            <Image 
              src="/images/logo/eclipse-logo.png" 
              alt="Eclipse Assistant" 
              width={20} 
              height={20}
              className="w-5 h-5"
            />
            {t('generate_with_ai') || 'Générer avec Eclipse Assistant'}
          </button>
        </div>
      )}

      {/* Modal AI Contract Generator */}
      <AIContractGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        company={company}
        onContractGenerated={handleContractGenerated}
      />
    </div>
  );
}
