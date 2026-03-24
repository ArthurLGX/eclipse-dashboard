import type { AutomationSettings } from '@/types/smart-follow-up';
import type { SmtpConfig } from '@/types';

/**
 * Affiche l’onboarding pleine page tant que l’email entrant n’est pas configuré
 * et que l’utilisateur n’a pas terminé l’onboarding.
 */
export function shouldShowSfuFullPageOnboarding(
  settings: AutomationSettings | null | undefined,
  smtpConfig: SmtpConfig | null | undefined
): boolean {
  if (settings?.onboarding_completed) return false;
  if (settings?.gmail_configured || settings?.imap_configured) return false;
  const imapOk =
    smtpConfig?.imap_enabled === true &&
    smtpConfig.imap_verified === true &&
    !!(smtpConfig.imap_host?.trim() && smtpConfig.imap_user?.trim());
  if (imapOk) return false;
  return true;
}
