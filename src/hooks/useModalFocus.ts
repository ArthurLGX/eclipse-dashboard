import { useEffect, useRef } from 'react';

/**
 * Hook pour gérer le focus et le scroll des modales
 * - Bloque le scroll du body quand la modale s'ouvre
 * - Scroll vers le haut de la modale
 * - Focus sur le premier élément focusable
 * - Restaure le scroll quand la modale se ferme
 */
export function useModalFocus(isOpen: boolean) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Sauvegarder l'élément actuellement focusé
      previousActiveElement.current = document.activeElement;

      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden';

      // Attendre que le DOM soit mis à jour
      requestAnimationFrame(() => {
        if (modalRef.current) {
          // Scroll vers le haut de la modale
          modalRef.current.scrollTop = 0;

          // Focus sur le premier élément focusable
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstFocusable = focusableElements[0] as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            // Si pas d'élément focusable, focus sur la modale elle-même
            modalRef.current.focus();
          }
        }
      });
    } else {
      // Restaurer le scroll du body
      document.body.style.overflow = 'unset';

      // Restaurer le focus sur l'élément précédent
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return modalRef;
}

/**
 * Hook simplifié pour juste bloquer le scroll et scrollTop
 * Utile pour les modales qui utilisent déjà leur propre ref
 */
export function useModalScroll(isOpen: boolean, containerRef?: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (isOpen) {
      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden';

      // Scroll vers le haut du container si fourni
      requestAnimationFrame(() => {
        if (containerRef?.current) {
          containerRef.current.scrollTop = 0;
        }
      });
    } else {
      // Restaurer le scroll du body
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, containerRef]);
}

export default useModalFocus;


