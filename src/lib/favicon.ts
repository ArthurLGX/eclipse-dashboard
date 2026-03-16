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
 * Extrait le domaine d'un email (partie après le @)
 * Ex: contact@nordicnexus.com → nordicnexus.com
 */
export const extractDomainFromEmail = (email: string): string | null => {
  if (!email || !email.includes('@')) return null;
  const part = email.split('@')[1]?.trim().toLowerCase();
  if (!part || part.length < 3) return null;
  return part;
};

/**
 * Domaine pour favicon : site web en priorité, sinon domaine de l'email
 */
export const getFaviconDomain = (
  website?: string | null,
  email?: string | null
): string | null => {
  if (website) {
    const domain = extractDomain(website);
    if (domain) return domain;
  }
  if (email) return extractDomainFromEmail(email);
  return null;
};

/**
 * Website à enregistrer : si vide, dérive depuis le domaine de l'email (https://domaine)
 */
export const deriveWebsite = (
  website?: string | null,
  email?: string | null
): string => {
  const trimmed = (website ?? '').trim();
  if (trimmed) return trimmed;
  const domain = email ? extractDomainFromEmail(email) : null;
  return domain ? `https://${domain}` : '';
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

