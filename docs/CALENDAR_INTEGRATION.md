# 📅 Intégration des Calendriers Externes

Ce guide explique comment configurer l'intégration avec Google Calendar et Microsoft Outlook.

## 🔧 Configuration Google Calendar

### Étape 1: Créer un projet Google Cloud

1. Accédez à [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google Calendar:
   - Menu → APIs & Services → Library
   - Cherchez "Google Calendar API"
   - Cliquez sur "Enable"

### Étape 2: Configurer l'écran de consentement OAuth

1. Menu → APIs & Services → OAuth consent screen
2. Sélectionnez "External" (ou "Internal" si vous avez Google Workspace)
3. Remplissez les informations requises:
   - App name: `Eclipse Dashboard`
   - User support email: votre email
   - Developer contact: votre email
4. Ajoutez les scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Ajoutez votre email comme utilisateur test (si en mode test)

### Étape 3: Créer les identifiants OAuth

1. Menu → APIs & Services → Credentials
2. Cliquez sur "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Nom: `Eclipse Dashboard`
5. Authorized redirect URIs:
   - `http://localhost:3000/api/calendar/google/callback` (développement)
   - `https://votre-domaine.com/api/calendar/google/callback` (production)
6. Cliquez sur "Create"
7. Copiez le **Client ID** et **Client Secret**

### Étape 4: Ajouter les variables d'environnement

Dans votre fichier `.env.local`:

```env
GOOGLE_CLIENT_ID=votre_client_id_ici
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
```

---

## 🔧 Configuration Microsoft Outlook / Office 365

### Étape 1: Enregistrer une application Azure

1. Accédez au [Azure Portal](https://portal.azure.com/)
2. Menu → Azure Active Directory → App registrations
3. Cliquez sur "New registration"
4. Configurez l'application:
   - Name: `Eclipse Dashboard`
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web → `https://votre-domaine.com/api/calendar/outlook/callback`
5. Cliquez sur "Register"

### Étape 2: Configurer les permissions

1. Dans votre application, allez à "API permissions"
2. Cliquez sur "Add a permission"
3. Sélectionnez "Microsoft Graph"
4. Choisissez "Delegated permissions"
5. Ajoutez:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
   - `User.Read`
6. Cliquez sur "Grant admin consent" (si vous êtes admin)

### Étape 3: Créer un secret client

1. Allez à "Certificates & secrets"
2. Cliquez sur "New client secret"
3. Description: `Eclipse Dashboard`
4. Expiration: choisissez une durée
5. Cliquez sur "Add"
6. **Copiez immédiatement la valeur** (elle ne sera plus visible après)

### Étape 4: Ajouter les variables d'environnement

Dans votre fichier `.env.local`:

```env
MICROSOFT_CLIENT_ID=votre_application_id
MICROSOFT_CLIENT_SECRET=votre_client_secret
MICROSOFT_TENANT_ID=common  # ou votre tenant ID spécifique
```

---

## 🔧 Configuration CalDAV (iCloud, Fastmail, Nextcloud...)

Pour CalDAV, vous n'avez pas besoin d'OAuth. L'utilisateur fournit directement:
- URL du serveur CalDAV
- Nom d'utilisateur
- Mot de passe d'application

### iCloud

1. Accédez à [Apple ID](https://appleid.apple.com/)
2. Créez un "App-Specific Password"
3. URL CalDAV: `https://caldav.icloud.com/`
4. Utilisateur: votre email iCloud

### Fastmail

1. Accédez aux paramètres Fastmail → Passwords & Security
2. Créez un "App Password" pour CalDAV
3. URL: `https://caldav.fastmail.com/dav/calendars/user/votre@email.com/`

### Nextcloud

1. URL: `https://votre-nextcloud.com/remote.php/dav/calendars/USERNAME/`
2. Utilisez votre nom d'utilisateur et mot de passe Nextcloud

---

## 📝 Structure de la base de données Strapi

Créez un content-type `calendar-connection` dans Strapi:

```json
{
  "kind": "collectionType",
  "collectionName": "calendar_connections",
  "info": {
    "singularName": "calendar-connection",
    "pluralName": "calendar-connections",
    "displayName": "Calendar Connections"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "provider": {
      "type": "enumeration",
      "enum": ["google", "outlook", "caldav"],
      "required": true
    },
    "user_id": {
      "type": "integer",
      "required": true
    },
    "email": {
      "type": "string"
    },
    "access_token": {
      "type": "text",
      "private": true
    },
    "refresh_token": {
      "type": "text",
      "private": true
    },
    "expires_at": {
      "type": "datetime"
    },
    "caldav_url": {
      "type": "string"
    },
    "caldav_username": {
      "type": "string"
    },
    "caldav_password": {
      "type": "text",
      "private": true
    },
    "last_sync": {
      "type": "datetime"
    },
    "sync_enabled": {
      "type": "boolean",
      "default": true
    }
  }
}
```

---

## 🔒 Sécurité

- Les tokens OAuth sont stockés de manière chiffrée dans Strapi
- Les refresh tokens permettent de renouveler l'accès sans intervention de l'utilisateur
- Les mots de passe CalDAV doivent être des "App Passwords" spécifiques

---

## 🚀 Utilisation

1. Accédez à **Paramètres → Intégrations calendrier**
2. Cliquez sur "Connecter" pour le calendrier souhaité
3. Autorisez l'accès à Eclipse Dashboard
4. Vos événements seront automatiquement synchronisés

---

## 🔗 Liens utiles

- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [Azure Portal - App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Microsoft Graph Calendar API](https://docs.microsoft.com/en-us/graph/api/resources/calendar)

