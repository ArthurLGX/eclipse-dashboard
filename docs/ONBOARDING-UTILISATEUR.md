# Parcours d'onboarding — Nouvel utilisateur Eclipse

## Vue d'ensemble

Document décrivant le parcours complet d'un **nouvel utilisateur** depuis son arrivée sur la plateforme jusqu'à sa première utilisation. L'objectif est de comprendre l'ergonomie actuelle et identifier les pistes d'amélioration.

---

## 1. Parcours complet (séquence chronologique)

### Phase A — Inscription et authentification

| Étape | URL / action | Description |
|-------|--------------|-------------|
| 1 | Landing (`/`) ou `/login` | L'utilisateur arrive via le site ou un lien direct |
| 2 | Clic « Inscription » | Redirection vers `/login?type=register` |
| 3 | Formulaire d'inscription | Champs : **Username**, **Email**, **Mot de passe**, **Confirmer mot de passe** |
| 4 | Validation du mot de passe | Contrôles : majuscule, minuscule, chiffre, caractère spécial, 8+ caractères |
| 5 | Création du compte | Appel `POST /api/auth/local/register` |
| 6 | Redirection | **→ `/login`** (pas de connexion automatique) |
| 7 | Toast de succès | « Inscription réussie, connectez-vous pour continuer » |

**Point d’attention** : Après inscription, l’utilisateur doit **se connecter manuellement**. Il n’est pas connecté automatiquement.

---

### Phase B — Connexion

| Étape | Mode | Description |
|-------|------|-------------|
| 1 | **Magic link (email)** | Saisie de l’email → réception d’un code à 6 chiffres → saisie du code |
| 2 | **Google OAuth** | Redirection vers Strapi `/api/connect/google` → callback `/auth/callback` |

**Après connexion réussie :**

| Condition | Redirection |
|-----------|-------------|
| Abonnement actif ou en essai | `/dashboard` |
| Pas d’abonnement / Nouveau compte | `/pricing` |

---

### Phase C — Choix du plan (nouveaux utilisateurs)

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Affichage de la page `/pricing` | Plans disponibles (free, payants) |
| 2 | Choix du plan **gratuit** | Ouverture de `FreePlanModal` |
| 3 | Confirmation | Création d’un abonnement en essai (30 jours) |
| 4 | Redirection | **→ `/dashboard/profile/your-subscription`** |

Pour un plan payant, le flux passe par `PaymentModal` (Stripe) puis redirection vers le dashboard.

---

### Phase D — Onboarding unifié (premier accès au dashboard)

Dès que l’utilisateur accède à **n’importe quelle page** `/dashboard/*`, le composant `UnifiedOnboardingModal` s’affiche en **plein écran** si :

- `user.id` existe
- `preferences.onboarding_completed !== true`
- `localStorage.eclipse_unified_onboarding_completed !== 'true'`

#### Étapes de l’onboarding unifié (4 écrans)

| Écran | Contenu | Données collectées / actions |
|-------|---------|-----------------------------|
| **1. Métier** | « Quel est votre métier ? » | Choix parmi : Développeur web, Agence, Designer, Consultant, Photographe, Coach, Artisan, Autre |
| **2. Objectif** | « Quel est votre objectif ? » | Choix d’un type de projet (ex : Refonte de site, Site vitrine, E-commerce, Maintenance, etc.) selon le métier |
| **3. Projet** | « Créez votre premier projet » | Formulaire : **Nom du client**, **Nom du projet** (pré-rempli), **Taux horaire (€/h)**. Aperçu du template (tâches, durée, phases, valeur estimée) |
| **4. Succès** | « Votre espace est prêt ! » | Récapitulatif : Client créé, Projet créé, X tâches. Actions : « Voir mon projet » ou « Explorer le dashboard » |

#### Actions API déclenchées à la fin de l’étape 3

1. Enregistrement des préférences utilisateur (métier, modules)
2. Création ou réutilisation d’un **client** (nom saisi ou « Mon premier client »)
3. Création d’un **projet** lié au client
4. Création des **tâches** à partir du template choisi
5. Marquer `onboarding_completed` en base et dans `localStorage`

#### Option « Configurer plus tard »

- Disponible uniquement à l’écran 1 (Métier)
- Crée des préférences avec type « Autre » et marque l’onboarding comme terminé
- Ferme le modal sans créer de client/projet

---

### Phase E — Tours d’onboarding contextuels

Une fois l’onboarding unifié terminé, d’autres guides contextuels peuvent s’afficher selon les pages visitées.

#### E1. Tour « Projet » (workflow projet)

- **Déclencheur** : Clic sur « Voir mon projet » + présence de `localStorage.eclipse_show_project_tour = true`
- **Page** : `/dashboard/projects/[documentId]` (vue workflow)
- **Composant** : `OnboardingTour` avec steps (breadcrumb, ligne principale, étapes, etc.)
- **Stockage** : `localStorage.onboarding_project-workflow-tour_completed`

#### E2. Tour « Pipeline »

- **Déclencheur** : Visite de `/dashboard/pipeline` **et** au moins un contact en pipeline
- **Délai** : 1 seconde après chargement
- **Composant** : `OnboardingTour` — 2 étapes (intro, carte client)
- **Stockage** : `localStorage.onboarding_pipeline-tour_completed`

#### E3. Onboarding Smart Follow-Up

- **Déclencheur** : Première visite de `/dashboard/smart-follow-up` **et** `!hasSeenSFUOnboarding()` (localStorage `sfu_onboarding_done`)
- **Composant** : `SFUOnboarding` — 5 écrans avec cas d’usage (lead Walego, devis, newsletter filtrée, RDV confirmé, configuration)
- **Stockage** : `localStorage.sfu_onboarding_done = '1'`

---

## 2. Schéma simplifié du parcours

```
Landing / Login
       │
       ▼
┌──────────────┐     Non      ┌─────────────┐
│ Inscription  │─────────────►│   /login   │
└──────────────┘              └──────┬──────┘
       │                             │
       │ Oui                         │ Connexion
       ▼                             ▼
┌──────────────┐              ┌─────────────┐
│  /login      │◄─────────────┤  Vérifier   │
│ (manuel)     │              │  abonnement │
└──────┬───────┘              └──────┬──────┘
       │                             │
       └─────────────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
     Pas d'abonnement           Abonnement OK
            │                         │
            ▼                         ▼
    ┌─────────────┐           ┌─────────────┐
    │  /pricing   │           │ /dashboard  │
    └──────┬──────┘           └──────┬──────┘
           │                         │
           ▼                         │
    Choisir plan                     │
           │                         │
           └────────────┬────────────┘
                        ▼
              ┌─────────────────────┐
              │ UnifiedOnboardingModal │
              │  (4 étapes)           │
              └──────────┬────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
  "Voir mon projet"            "Explorer le dashboard"
         │                               │
         ▼                               ▼
  Project + Tour workflow         Dashboard home
         │                               │
         └───────────────┬───────────────┘
                         │
              Visite Pipeline → Tour pipeline
              Visite SFU → SFUOnboarding
```

---

## 3. Points de friction et pistes d’amélioration

### Friction 1 : Double étape inscription → connexion

**Constat** : Après inscription, l’utilisateur est redirigé vers `/login` et doit se reconnecter.

**Piste** : Connexion automatique après inscription réussie (avec le JWT retourné par l’API), puis redirection directe vers `/pricing` ou `/dashboard`.

---

### Friction 2 : Nouveau compte → passage obligatoire par la pricing

**Constat** : Tout nouveau compte est redirigé vers `/pricing`, même pour un essai gratuit.

**Piste** :
- Proposer un plan gratuit par défaut à la création du compte
- Ou afficher une modale « Choisir un plan » directement dans le dashboard pour les comptes sans abonnement

---

### Friction 3 : Onboarding unifié très dense

**Constat** : 4 écrans, création client + projet + tâches. L’utilisateur peut se sentir submergé.

**Pistes** :
- Réduire à 2–3 écrans (ex : métier + objectif fusionnés, ou objectif + projet regroupés)
- Proposer un parcours « Express » (1 clic) vs « Personnalisé » (étapes complètes)
- Prévisualisation plus claire des tâches créées avant validation

---

### Friction 4 : « Configurer plus tard » peu visible

**Constat** : L’option « Configurer plus tard » est uniquement à l’écran 1, en bas à gauche (souligné).

**Piste** : Rendre l’option plus visible (bouton secondaire en haut à droite) et/ou la proposer sur chaque écran.

---

### Friction 5 : Pas de résumé avant création

**Constat** : À l’écran 3, la création est déclenchée par « Créer mon projet » sans récapitulatif explicite.

**Piste** : Ajouter un récapitulatif (client, projet, nombre de tâches, valeur estimée) avant validation, avec possibilité de modifier.

---

### Friction 6 : Tours contextuels non connectés

**Constat** : Pipeline tour, SFU onboarding et Project workflow tour sont indépendants. Un utilisateur peut voir plusieurs tours successifs sans lien entre eux.

**Piste** :
- Unifier la logique (ex : un seul `onboarding_progress` avec étapes : unifié → pipeline → SFU → projet)
- Ou afficher une carte « À découvrir » sur le dashboard listant les prochaines étapes

---

### Friction 7 : Callback Google → Landing

**Constat** : Après connexion Google, redirection vers `/` (landing) au lieu de `/dashboard` ou `/pricing`.

**Piste** : Appliquer la même logique que pour le magic link : vérifier l’abonnement et rediriger vers `/dashboard` ou `/pricing`.

---

### Friction 8 : Données factices pour le client

**Constat** : Si le client n’existe pas, un email placeholder est créé (`{nom}@example.com`).

**Piste** : Prévenir l’utilisateur qu’il pourra compléter les infos client plus tard, ou demander un email réel (optionnel).

---

## 4. Checklist d’ergonomie

- [ ] Connexion automatique après inscription
- [ ] Choix du plan intégré au parcours d’inscription (au moins pour le gratuit)
- [ ] Onboarding unifié en 2–3 écrans max ou parcours express
- [ ] Option « Passer » plus visible sur tous les écrans
- [ ] Récapitulatif avant création du premier projet
- [ ] Callback Google aligné sur le flux post-connexion (dashboard/pricing)
- [ ] Progression globale des tours (unifié → pipeline → SFU → projet)
- [ ] Feedback visuel pendant les créations (skeleton, messages explicites)

---

## 5. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/app/login/page.tsx` | Inscription, connexion, redirection post-login |
| `src/app/register/page.tsx` | Redirection vers login avec `type=register` |
| `src/app/auth/callback/page.tsx` | Callback OAuth Google |
| `src/app/dashboard/layout.tsx` | Intégration de `UnifiedOnboardingModal` |
| `src/app/components/UnifiedOnboardingModal.tsx` | Onboarding unifié 4 étapes |
| `src/app/components/BusinessSetupModal.tsx` | (Legacy, non utilisé) Ancien setup métier/modules |
| `src/app/components/OnboardingTour.tsx` | Tour contextuel réutilisable |
| `src/app/dashboard/pipeline/page.tsx` | Tour pipeline |
| `src/app/components/onboarding/SFUOnboarding.tsx` | Onboarding Smart Follow-Up |
| `src/app/components/ProjectWorkflowView.tsx` | Tour workflow projet |
| `src/app/pricing/page.tsx` | Choix du plan |
| `src/app/components/FreePlanModal.tsx` | Activation du plan gratuit |

---

*Document généré à partir de l’analyse du codebase Eclipse Dashboard — janvier 2025*
