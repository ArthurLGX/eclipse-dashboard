# Intégration extraction profil Walego

## Vue d'ensemble

Quand un mail Walego arrive et est parsé par le pipeline Smart Follow-Up, appelez l'API d'extraction pour :
1. Extraire photo, nom, titre et lien LinkedIn du HTML
2. Télécharger et cacher la photo (les URLs Brevo expirent)
3. Mettre à jour le lead/client avec ces données

## API

**POST** `/api/smart-follow-up/extract-walego-profile`

```json
// Request
{
  "htmlBody": "<div>...contenu HTML du mail Walego...</div>",
  "leadId": "abc123"  // documentId du lead ou automation-action
}

// Response
{
  "profilePicUrl": "https://...",
  "name": "Charlotte Joseph",
  "title": "Creative Project Manager & Operations",
  "linkedinUrl": "https://linkedin.com/in/...",
  "avatarPath": "/leads/avatars/abc123.jpg"  // null si téléchargement échoue
}
```

## Intégration Strapi

**L'intégration est déjà en place** dans `eclipsestudiodev-backend` : `src/services/action-proposer.ts`.

Après la création de chaque automation-action, le backend appelle automatiquement l'API d'extraction.

### Variable d'environnement requise (backend)

Ajoutez dans `.env` du backend Strapi :

```
DASHBOARD_APP_URL=https://dashboard.eclipsestudiodev.fr
```

Ou `APP_URL` en fallback. En local : `http://localhost:3000`.

---

<details>
<summary>Intégration manuelle (référence)</summary>

Si vous souhaitez l'intégrer ailleurs (controller/lifecycle) :

```javascript
// Récupérer le HTML du mail reçu
const htmlBody = receivedEmail.content_html || receivedEmail.content_text || '';

// Appeler l'API d'extraction (Next.js / dashboard)
const baseUrl = process.env.DASHBOARD_APP_URL || process.env.APP_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/smart-follow-up/extract-walego-profile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    htmlBody,
    leadId: automationAction.documentId  // ou client.documentId
  })
});

const { avatarPath, name, title, linkedinUrl } = await response.json();

// Mettre à jour l'automation-action (champs avatar_path, lead_title, linkedin_url)
await strapi.entityService.update('api::automation-action.automation-action', id, {
  data: {
    avatar_path: avatarPath,
    lead_title: title,
    linkedin_url: linkedinUrl
  }
});
```
</details>

## Champs Strapi (automation-action)

- `avatar_path` (string, nullable)
- `lead_title` (string, nullable)
- `linkedin_url` (string, nullable)
