# Publication sur Meta for Developers

Ce document décrit les pages et configurations nécessaires pour publier l'app Eclipse sur Meta (Facebook, Instagram, WhatsApp).

## Pages légales (FR + EN)

| Page | URL | Usage |
|------|-----|-------|
| Politique de confidentialité | `/privacy` | Privacy Policy pour Meta, boîte de dialogue login |
| Conditions de service | `/terms` | Terms of Service pour Meta |
| Cookies & Données | `/cookies` | Gestion des cookies et données utilisateur |
| Suppression de compte | `/delete-account` | Demande de suppression RGPD + Meta |

Liens présents dans :
- Footer de la landing page
- Footer de la page login
- Paramètres du compte (Supprimer mon compte)

## Data Deletion Callback (Meta)

Requis si l'app utilise Facebook Login ou accède aux données utilisateur Meta.

**URL à configurer dans Meta for Developers → Paramètres de l'app :**

```
https://dashboard.eclipsestudiodev.fr/api/meta/data-deletion
```

**Variable d'environnement :**
```env
META_APP_SECRET=<votre_app_secret_meta>
```

Le callback reçoit un POST avec `signed_request`, extrait le `user_id` (Facebook app-scoped ID) et retourne `{ url, confirmation_code }` comme demandé par Meta.

Référence : [Meta Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)

## Suppression de compte

Trois méthodes disponibles pour l'utilisateur :
1. **Depuis le compte (connecté)** : formulaire sur `/delete-account` avec phrase de confirmation
2. **Par email** : privacy@eclipsestudiodev.fr
3. **Via Facebook** : Paramètres → Applications et sites web → Eclipse → Envoyer une demande

## Backend Strapi (optionnel)

Pour automatiser la suppression, implémenter :

```
POST /api/users/me/request-deletion
Body: { confirmPhrase: string }
Authorization: Bearer <jwt>
```

Cet endpoint crée une demande de suppression et peut déclencher un email de confirmation.
