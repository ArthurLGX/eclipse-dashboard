import { useEffect, useRef } from 'react';

/**
 * Fonction utilitaire pour bloquer le scroll du body
 * Utilise la classe CSS modal-open avec !important pour garantir le blocage
 */
function lockBodyScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
  document.body.classList.add('modal-open');
}

/**
 * Fonction utilitaire pour débloquer le scroll du body
 */
function unlockBodyScroll() {
  document.body.classList.remove('modal-open');
  document.documentElement.style.removeProperty('--scrollbar-width');
}

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
      lockBodyScroll();

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
      unlockBodyScroll();

      // Restaurer le focus sur l'élément précédent
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  return modalRef;
}

/**
 * Hook simplifié pour juste bloquer le scroll et scrollTop
 * Utile pour les modales qui utilisent déjà leur propre ref
 */
export function useModalScroll(isOpen: boolean, containerRef?: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (isOpen) {
      // Bloquer le scroll du body
      lockBodyScroll();

      // Scroll vers le haut du container si fourni
      requestAnimationFrame(() => {
        if (containerRef?.current) {
          containerRef.current.scrollTop = 0;
        }
      });
    } else {
      // Restaurer le scroll du body
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen, containerRef]);
}

export default useModalFocus;


