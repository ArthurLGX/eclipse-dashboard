'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { IconChevronRight } from '@tabler/icons-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchFactureFromDocumentId, fetchFactureFromId } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';

interface FactureForBreadcrumb {
  reference?: string;
  client_id?: { name?: string };
  project?: { title?: string };
  document_type?: 'invoice' | 'quote';
}

export const BreadCrumb = () => {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [factureData, setFactureData] = useState<{ [key: string]: string }>({});
  const [documentType, setDocumentType] = useState<'invoice' | 'quote' | null>(null);
  
  // Détecter le type depuis les searchParams (pour création)
  const typeFromUrl = searchParams.get('type') as 'invoice' | 'quote' | null;

  // Filtrer les segments vides et créer les chemins
  const pathSegments = pathname.split('/').filter(segment => segment !== '');

  // Récupérer les données des factures pour les IDs
  useEffect(() => {
    const fetchFactureData = async () => {
      const factureIds = pathSegments
        .map((segment, index) => {
          // Détecter les IDs de facture (numériques ou documentId strings)
          if (pathSegments[index - 1] === 'factures') {
            // Si c'est un nombre ou une chaîne qui ressemble à un documentId
            if (!isNaN(Number(segment)) || segment.length > 10) {
              return segment;
            }
          }
          return null;
        })
        .filter((id): id is string => id !== null);

      const factureDataMap: { [key: string]: string } = {};

      for (const id of factureIds) {
        try {
          //si id est un string, on fait une requete pour récupérer l'id
          if (typeof id === 'string') {
            const facture = await fetchFactureFromDocumentId(id);
            const factureItem = facture?.data?.[0] as FactureForBreadcrumb | undefined;
            if (factureItem) {
              // Sauvegarder le type de document
              if (factureItem.document_type) {
                setDocumentType(factureItem.document_type);
              }
              if (factureItem.client_id?.name) {
                factureDataMap[id] = factureItem.client_id.name;
              } else if (factureItem.project?.title) {
                factureDataMap[id] = factureItem.project.title;
              } else if (factureItem.reference) {
                factureDataMap[id] = factureItem.reference;
              } else {
                const label = factureItem.document_type === 'quote' ? 'Devis' : 'Facture';
                factureDataMap[id] = `${label} #${id}`;
              }
            }
          } else {
            const facture = await fetchFactureFromId(id);
            const factureItem = facture?.data?.[0] as FactureForBreadcrumb | undefined;
            if (factureItem) {
              // Sauvegarder le type de document
              if (factureItem.document_type) {
                setDocumentType(factureItem.document_type);
              }
              // Priorité 1: Nom du client
              if (factureItem.reference) {
                factureDataMap[id] = factureItem.reference;
              } else {
                const label = factureItem.document_type === 'quote' ? 'Devis' : 'Facture';
                factureDataMap[id] = `${label} #${id}`;
              }
            }
          }
        } catch (error) {
          console.error(
            `Erreur lors de la récupération de la facture ${id}:`,
            error
          );
          factureDataMap[id] = `Facture #${id}`;
        }
      }

      setFactureData(factureDataMap);
    };

    if (user?.id) {
      fetchFactureData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.id]);

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;

    return {
      segment,
      path,
      isLast,
      label: getSegmentLabel(segment, pathSegments, index, factureData),
    };
  });

  // Fonction pour extraire le titre d'un slug (format: titre-du-projet--documentId)
  function extractTitleFromSlug(slug: string): string {
    // Nouveau format avec double tiret : titre--documentId
    if (slug.includes('--')) {
      const titlePart = slug.split('--')[0];
      return titlePart
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    // Ancien format avec ID numérique : titre-123
    const parts = slug.split('-');
    if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
      parts.pop();
    }
    return parts
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Déterminer le type effectif (depuis URL ou depuis les données)
  const effectiveType = typeFromUrl || documentType;

  // Fonction pour obtenir le label approprié pour chaque segment
  function getSegmentLabel(
    segment: string,
    segments: string[],
    index: number,
    factureData: { [key: string]: string }
  ) {
    // Si c'est le segment "factures", afficher "Devis" ou "Factures" selon le type
    if (segment === 'factures') {
      if (effectiveType === 'quote') {
        return t('quotes') || 'Devis';
      }
      return t('invoices') || 'Factures';
    }

    // Si c'est dans le segment factures, vérifier si c'est un ID (numérique ou documentId)
    if (segments[index - 1] === 'factures') {
      // Si c'est un nombre ou une chaîne qui ressemble à un documentId
      if (!isNaN(Number(segment)) || segment.length > 10) {
        return factureData[segment] || (effectiveType === 'quote' ? `Devis #${segment}` : `Facture #${segment}`);
      }
      // Si c'est "new" ou "add" ou "ajouter", afficher le bon label
      if (segment.toLowerCase() === 'new' || segment.toLowerCase() === 'add' || segment.toLowerCase() === 'ajouter') {
        return effectiveType === 'quote' ? t('new_quote') || 'Nouveau devis' : t('new_invoice') || 'Nouvelle facture';
      }
    }

    // Si c'est un slug de projet (contient double tiret ou tirets et le parent est "projects")
    if (segments[index - 1] === 'projects' && (segment.includes('--') || segment.includes('-'))) {
      return extractTitleFromSlug(segment);
    }

    // Si c'est un slug de client (contient des tirets et le parent est "clients")
    if (segments[index - 1] === 'clients' && (segment.includes('--') || segment.includes('-'))) {
      return extractTitleFromSlug(segment);
    }

    // Si c'est un nombre (ID), on peut essayer de récupérer le nom depuis le contexte
    if (!isNaN(Number(segment))) {
      // Pour les clients, afficher "Client #{id}"
      if (segments[index - 1] === 'clients') {
        return `Client #${segment}`;
      }
      return segment;
    }

    // Utiliser la traduction pour les segments textuels
    return t(segment) || segment;
  }

  // Segments qui n'ont pas de page (chemins intermédiaires uniquement)
  const nonClickableSegments = ['profile'];

  const isSegmentClickable = (segment: string, isLast: boolean) => {
    if (isLast) return false;
    return !nonClickableSegments.includes(segment);
  };

  const handleNavigation = (path: string, segment: string, isLast: boolean) => {
    if (isSegmentClickable(segment, isLast)) {
      router.push(path);
    }
  };

  return (
    <nav
      className="flex flex-row items-center gap-2 py-4"
      aria-label="Breadcrumb"
    >
      {breadcrumbItems.map((item, index) => {
        const clickable = isSegmentClickable(item.segment, item.isLast);
        return (
          <div key={index} className="flex flex-row items-center gap-2">
            <p
              onClick={() => handleNavigation(item.path, item.segment, item.isLast)}
              className={`text-sm transition-colors capitalize ${
                item.isLast
                  ? '!text-violet-400 font-medium cursor-default' // Page active en violet
                  : clickable
                    ? 'text-zinc-600 hover:text-zinc-300 hover:underline cursor-pointer'
                    : 'text-zinc-500 cursor-default' // Non-cliquable
              }`}
              aria-current={item.isLast ? 'page' : undefined}
            >
              {item.label}
            </p>

            {/* Afficher la flèche seulement si ce n'est pas le dernier élément */}
            {!item.isLast && (
              <IconChevronRight className="text-zinc-600" size={16} />
            )}
          </div>
        );
      })}
    </nav>
  );
};
