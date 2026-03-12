/** Formate une feature (key, value) en texte lisible pour pricing/landing - gère boolean, number, string, array, object */
export function formatFeatureDisplay(
  key: string,
  value: boolean | number | string | unknown[] | Record<string, unknown>,
  t: (k: string, p?: Record<string, string | number>) => string
): string {
  if (typeof value === 'boolean') return value ? t(key) || key.replace(/_/g, ' ') : '';
  if (typeof value === 'number') {
    const count = value === 0 ? '∞' : value;
    if (key === 'storage') return value === 0 ? t('storage_unlimited') : value === 100 ? '100 MB' : `${value} GB`;
    if (key === 'max_active_projects') return t('projects_active_format', { count: String(count) });
    if (key === 'max_active_clients') return t('clients_active_format', { count: String(count) });
    if (key === 'max_prospects_active') return t('prospects_active_format', { count: String(count) });
    if (key === 'max_handle_mentors') return t('mentors_format', { count: String(count) });
    if (key === 'max_newsletters') return t('newsletters_month_format', { count: String(count) });
    return value === 0 ? '∞' : String(value);
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const label = t(key) !== key ? t(key) : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const content = value.map(String).join(', ');
    return `${label}: ${content}`;
  }
  if (value !== null && typeof value === 'object') return Object.entries(value).map(([k, v]) => `${k}: ${String(v)}`).join(', ');
  return String(value ?? '');
}

/** Formate la valeur d'une feature pour l'affichage dans le tableau comparatif selon son type */
export function formatFeatureValue(
  key: string,
  value: unknown
): { type: 'check'; value: boolean } | { type: 'text'; value: string } {
  if (typeof value === 'boolean') return { type: 'check', value };
  if (typeof value === 'number') {
    const text = key === 'storage'
      ? (value === 0 ? '∞' : value === 100 ? '100 MB' : `${value} GB`)
      : (value === 0 ? '∞' : String(value));
    return { type: 'text', value: text };
  }
  if (typeof value === 'string') return { type: 'text', value };
  if (Array.isArray(value)) return { type: 'text', value: value.map(String).join(', ') };
  if (value !== null && typeof value === 'object') {
    return { type: 'text', value: Object.entries(value).map(([k, v]) => `${k}: ${String(v)}`).join(', ') };
  }
  return { type: 'text', value: '-' };
}
