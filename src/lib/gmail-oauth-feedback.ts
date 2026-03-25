/**
 * Messages utilisateur pour les codes d'erreur renvoyés par /api/auth/gmail/callback (?gmail_err=…).
 */

export function getGmailOAuthErrorMessage(code: string | null): string {
  switch (code) {
    case 'access_denied':
      return 'Connexion annulée : vous avez refusé l’accès dans la fenêtre Google.';
    case 'redirect_uri_mismatch':
      return 'OAuth : l’URI de redirection ne correspond pas. Vérifiez Google Cloud Console et la variable GMAIL_REDIRECT_URI (doit être identique à celle enregistrée chez Google).';
    case 'oauth_not_configured':
      return 'OAuth Google non configuré sur le serveur (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).';
    case 'invalid_state':
      return 'Session OAuth invalide. Reconnectez-vous au tableau de bord et réessayez « Connecter Gmail ».';
    case 'token_exchange_failed':
      return 'Échange du code OAuth impossible (code expiré ou déjà utilisé). Réessayez depuis les paramètres.';
    case 'strapi_read_failed':
    case 'no_automation_settings':
      return 'Impossible de lire vos paramètres Smart Follow-Up côté serveur. Vérifiez que la configuration SFU existe pour votre compte.';
    case 'strapi_save_failed':
      return 'Impossible d’enregistrer le jeton Gmail. Réessayez ou contactez le support.';
    case 'missing_code':
      return 'Réponse Google incomplète. Réessayez la connexion Gmail.';
    case 'server_error':
      return 'Erreur serveur pendant la connexion Gmail. Réessayez plus tard.';
    default:
      return 'La connexion Gmail a échoué ou a été annulée. Vous pouvez utiliser une configuration IMAP manuelle.';
  }
}
