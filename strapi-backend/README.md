# Configuration Strapi - Planification d'envoi

Ce dossier contient les fichiers à ajouter à votre backend Strapi pour activer la planification d'envoi des emails et newsletters.

## Installation

### 1. Copier les fichiers de configuration

Copiez le fichier `config/cron-tasks.ts` dans votre dossier Strapi :

```
strapi-project/
├── config/
│   ├── cron-tasks.ts    <-- Copier ici
│   ├── server.ts        <-- Modifier ce fichier
│   └── ...
```

### 2. Activer les cron tasks dans `config/server.ts`

Modifiez votre fichier `config/server.ts` pour inclure les cron tasks :

```typescript
import cronTasks from './cron-tasks';

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
});
```

### 3. Assurez-vous d'avoir les dépendances

Le backend Strapi doit avoir `nodemailer` installé :

```bash
npm install nodemailer
# ou
yarn add nodemailer
```

### 4. Ajouter le champ `html_content` aux newsletters

Dans le content-type `newsletter`, ajoutez un nouveau champ :
- Nom : `html_content`
- Type : `Rich Text` ou `Text` (long)
- Description : Contenu HTML complet pour l'envoi différé

### 5. Redémarrer Strapi

```bash
npm run develop
# ou
yarn develop
```

## Fonctionnement

Les cron jobs s'exécutent **toutes les minutes** et vérifient :

1. **Emails planifiés** (`sent-email`) :
   - Filtre : `status_mail = 'scheduled'` ET `scheduled_at <= maintenant`
   - Action : Récupère la config SMTP de l'utilisateur, envoie l'email, met à jour le statut

2. **Newsletters planifiées** (`newsletter`) :
   - Filtre : `n_status = 'scheduled'` ET `send_at <= maintenant`
   - Action : Récupère la config SMTP de l'auteur, envoie aux abonnés, met à jour le statut

## Logs

Les cron jobs affichent des logs dans la console Strapi :

```
[CRON] Found 2 scheduled emails to send
[CRON] Successfully sent scheduled email 123
[CRON] Found 1 scheduled newsletters to send
[CRON] Successfully sent newsletter 456 to 15/15 subscribers
```

## Dépannage

### Les emails ne sont pas envoyés

1. Vérifiez que les cron jobs sont activés (`cron.enabled: true`)
2. Vérifiez les logs Strapi pour les erreurs
3. Vérifiez que la configuration SMTP de l'utilisateur est correcte
4. Vérifiez que `ENCRYPTION_KEY` est défini dans `.env`

### Erreurs de décryptage du mot de passe

Assurez-vous que :
1. Le fichier `src/utils/encryption.ts` existe
2. La variable `ENCRYPTION_KEY` est définie dans `.env`
3. Les mots de passe ont été sauvegardés après l'ajout du cryptage


