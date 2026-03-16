# Lier les comptes Google aux comptes existants (Strapi)

## Problème

Quand un utilisateur s'est déjà inscrit avec email/mot de passe, puis essaie de se connecter via Google avec le même email, Strapi renvoie : `"Email is already taken"`.

## Solution côté Backend Strapi (implémenté dans `eclipsestudiodev-backend`)

Le fichier `src/extensions/users-permissions/strapi-server.ts` a été modifié pour :
1. **Recherche insensible à la casse** : requête SQL `LOWER(email)` si l'email exact ne matche pas
2. **Fallback** : si la création échoue (conflit email/username), récupérer l'utilisateur existant et le connecter
3. **Liaison du provider** : mettre à jour le champ `provider` lors de la connexion d'un compte existant

## Solution côté Next.js (déjà implémenté)

- Message d'erreur plus explicite sur la page de login
- Passage automatique en mode connexion (email + mot de passe)
- Message : « Vous avez déjà un compte avec cet email. Connectez-vous avec votre mot de passe ci-dessous. »

## Solution côté Strapi (à mettre en place)

Pour permettre la connexion via Google même quand le compte existe déjà (liaison de compte), il faut étendre le plugin `users-permissions` dans Strapi.

### 1. Créer l’extension

À la racine de votre projet Strapi :

```
src/
  extensions/
    users-permissions/
      strapi-server.js   (ou .ts si vous utilisez TypeScript)
```

### 2. Contenu de `strapi-server.js`

Adapter la logique à votre version de Strapi (v4 ou v5). L’idée est d’intercepter le callback OAuth : si l’email Google existe déjà, récupérer l’utilisateur existant, le lier au provider Google, puis renvoyer un JWT.

**Exemple pour Strapi v4 :**

```javascript
'use strict';

module.exports = (plugin) => {
  const originalCallback = plugin.controllers.auth.callback;

  plugin.controllers.auth.callback = async (ctx) => {
    try {
      return await originalCallback(ctx);
    } catch (err) {
      // Si l'erreur est "Email is already taken", tenter de lier le compte
      const isEmailTaken =
        err.message?.includes('already taken') ||
        err.message?.includes('Email is already taken');

      if (!isEmailTaken) throw err;

      // Récupérer les infos du provider (disponibles dans le contexte)
      const { provider } = ctx.params;
      const providerUser = ctx.request.body || ctx.query;

      if (!providerUser?.email) throw err;

      const { getService } = require('@strapi/plugin-users-permissions/server/utils');
      const userService = getService('user');
      const authService = getService('auth');

      // Chercher l'utilisateur existant par email
      const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: providerUser.email.toLowerCase() },
      });

      if (!existingUser) throw err;

      // Mettre à jour l'utilisateur pour lier le provider Google
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: existingUser.id },
        data: {
          provider: provider || 'google',
          providerId: providerUser.id || providerUser.sub,
          confirmed: true,
        },
      });

      // Générer un JWT pour cet utilisateur
      const jwt = authService.issue({ id: existingUser.id });
      const user = await userService.fetch(existingUser.id);

      return ctx.send({
        jwt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          confirmed: user.confirmed,
          blocked: user.blocked,
          // ... autres champs nécessaires
        },
      });
    }
  };

  return plugin;
};
```

**Remarque :** Le code exact dépend de la structure du callback et des services Strapi. Consultez le code source du plugin `users-permissions` pour adapter :

- [Strapi v4 auth controller](https://github.com/strapi/strapi/blob/main/packages/plugins/users-permissions/server/controllers/auth.js)
- [Strapi v5 auth controller](https://github.com/strapi/strapi/tree/main/packages/plugins/users-permissions/server/src/controllers)

### 3. Charger l’extension

Dans `config/plugins.js` ou via le fichier de configuration des plugins, s’assurer que l’extension est chargée (souvent automatique si le fichier est au bon endroit).

### 4. Configuration du provider Google

Dans l’admin Strapi : **Settings → Users & Permissions → Providers → Google** :

- Activer le provider
- Renseigner Client ID et Secret
- S’assurer que l’URL de callback pointe vers votre frontend (ex. `https://dashboard.eclipsestudiodev.fr/api/auth/google/callback`)

### 5. Références

- [Strapi – Override controllers](https://docs.strapi.io/dev-docs/plugins/users-permissions#customization)
- [GitHub Issue #12907 – Application errors on external login providers](https://github.com/strapi/strapi/issues/12907)
- [GitHub Issue #15257 – Duplicating users with same emails](https://github.com/strapi/strapi/issues/15257)

---

**En attendant la modification Strapi**, les utilisateurs concernés doivent se connecter avec leur mot de passe, puis peuvent éventuellement lier leur compte Google dans les paramètres du compte (si cette fonctionnalité existe).
