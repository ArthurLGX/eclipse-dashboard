import { useEffect } from 'react';

const BASE_TITLE = 'Eclipse Dashboard';

/**
 * Hook pour mettre à jour dynamiquement le titre de l'onglet du navigateur
 * @param title - Le titre à afficher (sera préfixé au titre de base)
 * @param dependencies - Dépendances pour recalculer le titre
 * 
 * @example
 * // Affichera "Mon Projet | Eclipse Dashboard"
 * useDocumentTitle(project?.title);
 * 
 * @example
 * // Avec un préfixe personnalisé : "Facture - FA-2024-001 | Eclipse Dashboard"
 * useDocumentTitle(facture?.number, { prefix: 'Facture' });
 */
export function useDocumentTitle(
  title: string | null | undefined,
  options: {
    prefix?: string;
    suffix?: string;
  } = {}
) {
  const { prefix, suffix } = options;

  useEffect(() => {
    // Sauvegarder le titre original pour le restaurer au démontage
    const originalTitle = document.title;

    if (title) {
      const parts: string[] = [];
      
      if (prefix) {
        parts.push(`${prefix} - ${title}`);
      } else {
        parts.push(title);
      }
      
      if (suffix) {
        parts.push(suffix);
      }
      
      parts.push(BASE_TITLE);
      
      document.title = parts.join(' | ');
    }

    // Restaurer le titre original au démontage du composant
    return () => {
      document.title = originalTitle;
    };
  }, [title, prefix, suffix]);
}

export default useDocumentTitle;

