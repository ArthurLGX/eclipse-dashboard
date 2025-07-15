'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { IconChevronRight } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';

export const BreadCrumb = () => {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  // Filtrer les segments vides et créer les chemins
  const pathSegments = pathname.split('/').filter(segment => segment !== '');

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;

    return {
      segment,
      path,
      isLast,
      label: getSegmentLabel(segment, pathSegments, index),
    };
  });

  // Fonction pour obtenir le label approprié pour chaque segment
  function getSegmentLabel(segment: string, segments: string[], index: number) {
    // Si c'est un nombre (ID), on peut essayer de récupérer le nom depuis le contexte
    // ou afficher "ID: {segment}" ou juste le segment
    if (!isNaN(Number(segment))) {
      // Pour les IDs, vous pouvez personnaliser selon votre logique
      // Par exemple, si c'est dans clients/[id], afficher "Client #{id}"
      if (segments[index - 1] === 'clients') {
        return `Client #${segment}`;
      }
      return segment;
    }

    // Utiliser la traduction pour les segments textuels
    return t(segment) || segment;
  }

  const handleNavigation = (path: string, isLast: boolean) => {
    if (!isLast) {
      router.push(path);
    }
  };

  return (
    <nav
      className="flex flex-row items-center gap-2 py-4"
      aria-label="Breadcrumb"
    >
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex flex-row items-center gap-2">
          <p
            onClick={() => handleNavigation(item.path, item.isLast)}
            className={`text-sm transition-colors capitalize ${
              item.isLast
                ? '!text-emerald-300 font-medium cursor-default' // Page active en vert
                : '!text-zinc-600 hover:!text-zinc-300 hover:underline cursor-pointer'
            }`}
            aria-current={item.isLast ? 'page' : undefined}
          >
            {item.label}
          </p>

          {/* Afficher la flèche seulement si ce n'est pas le dernier élément */}
          {!item.isLast && (
            <IconChevronRight className="!text-zinc-600" size={16} />
          )}
        </div>
      ))}
    </nav>
  );
};
