/**
 * Utilitaires pour récupérer les favicons de sites web
 */

/**
 * Extrait le domaine d'une URL
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

/**
 * Services de favicon disponibles (par ordre de fiabilité)
 */
export const FAVICON_SERVICES = {
  duckduckgo: (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  google: (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  direct: (domain: string) => `https://${domain}/favicon.ico`,
  clearbit: (domain: string) => `https://logo.clearbit.com/${domain}`,
} as const;

/**
 * Retourne l'URL du favicon pour un domaine donné
 * Utilise DuckDuckGo par défaut (le plus fiable)
 */
export const getFaviconUrl = (
  urlOrDomain: string,
  service: keyof typeof FAVICON_SERVICES = 'duckduckgo'
): string => {
  const domain = extractDomain(urlOrDomain);
  return FAVICON_SERVICES[service](domain);
};

/**
 * Composant Image avec fallback pour les favicons
 * Retourne les props pour un élément img avec gestion des erreurs
 */
export const getFaviconProps = (urlOrDomain: string) => {
  const domain = extractDomain(urlOrDomain);
  
  return {
    src: FAVICON_SERVICES.duckduckgo(domain),
    alt: `Favicon ${domain}`,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      // Fallback chain: DuckDuckGo -> Google -> Direct
      if (img.src.includes('duckduckgo.com')) {
        img.src = FAVICON_SERVICES.google(domain);
      } else if (img.src.includes('google.com')) {
        img.src = FAVICON_SERVICES.direct(domain);
      } else {
        // Fallback final: icône par défaut
        img.src = '/favicon.ico';
        img.style.opacity = '0.5';
      }
    },
  };
};

