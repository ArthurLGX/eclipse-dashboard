# Module Newsletter – Contexte pour amélioration par LLM

## 1. Identification du module

Le module **Newsletters** permet de créer, planifier et envoyer des newsletters par email à des destinataires (clients et emails manuels). Il est accessible via la sidebar sous « Newsletters » (menu Gestion) et « Bibliothèque » (menu Ressources pour les médias).

---

## 2. Structure des fichiers

```
src/
├── app/
│   ├── dashboard/newsletters/
│   │   ├── page.tsx                 # Liste des newsletters (tableau, filtres, stats)
│   │   ├── [id]/page.tsx            # Détail d'une newsletter (lecture seule, aperçu)
│   │   ├── compose/page.tsx        # Éditeur principal (≈4400 lignes, très volumineux)
│   │   └── library/page.tsx        # Bibliothèque médias (partagée avec emails)
│   └── api/newsletters/send/route.ts  # API d'envoi (proxy vers Strapi)
├── lib/
│   ├── api.ts                      # fetchNewslettersUser, fetchNewsletterById, createNewsletter, findOrCreateSubscriber
│   └── newsletter-templates.ts     # Templates prédéfinis (business, créatif, minimal, saisonnier)
├── components/
│   ├── ThemeCustomizer.tsx         # Personnalisation couleurs/thème
│   ├── MediaPickerModal.tsx       # Sélection médias (images, vidéos)
│   ├── SaveTemplateModal.tsx      # Sauvegarde thème personnalisé
│   ├── LoadTemplateModal.tsx      # Chargement thème existant
│   ├── EmailScheduler.tsx         # Planification date/heure d'envoi
│   ├── MailboxPreview.tsx         # Aperçu type client email (inbox)
│   └── EmailContentForm.tsx       # Champ titre/sujet/message (réutilisé)
└── hooks/
    └── useDraftSave.ts             # Brouillon auto localStorage
```

---

## 3. Processus (flow utilisateur)

### Étapes du wizard (compose)

1. **Template** – Choix entre : standard, promotionnel, annonce, personnalisé (custom avec ThemeCustomizer)
2. **Contenu** – Titre, sujet, corps (éditeur riche), CTA, bannière, images/vidéos dans le contenu
3. **Destinataires** – Sélection parmi les clients (useClients) + ajout manuel d’emails
4. **Revue / Envoi** – Aperçu, planification (EmailScheduler), envoi immédiat ou planifié

### Flux technique à l’envoi

1. Vérification SMTP configuré et vérifié (`smtpConfig.is_verified`)
2. Pour chaque destinataire (client ou email manuel) → `findOrCreateSubscriber()` pour créer un subscriber Strapi
3. Génération du HTML complet via `generateEmailHtml()` (header, contenu, CTA, footer, signature)
4. Si envoi immédiat : POST `/api/newsletters/send` → proxy vers Strapi `smtp-configs/send-newsletter` (avec pixel de tracking, wrapping des liens)
5. Création de la newsletter en base via `createNewsletter()` (Strapi `api/newsletters`)
6. Suppression du brouillon localStorage et redirection vers la liste

### Brouillons

- `useDraftSave` avec `draftKey: 'newsletter-compose'` : sauvegarde auto toutes les ~5s dans `localStorage`
- Pas de brouillon côté serveur pour le compose

---

## 4. Éléments / packages clés

| Élément | Rôle |
|---------|------|
| **Newsletter (Strapi)** | Entité : title, subject, content, n_status (draft/sent/scheduled), template, author, subscribers, send_at, custom_colors, html_content (pour envoi différé) |
| **Subscriber (Strapi)** | Entité liée : email, first_name, last_name, créée via `findOrCreateSubscriber` à partir des clients/emails manuels |
| **Client (contacts)** | Source de destinataires ; `useClients()` charge les clients de l’utilisateur |
| **Templates** | 4 types UI (standard, promotional, announcement, custom) + 12 templates visuels dans `newsletter-templates.ts` (business, créatif, minimal, saisonnier) |
| **Custom templates** | Thèmes sauvegardés par l’utilisateur via `SaveTemplateModal` / `LoadTemplateModal` (API `user-custom-templates`) |
| **Signature email** | `fetchEmailSignature(userId)` pour le footer (logo, coordonnées, réseaux sociaux) |
| **SMTP** | `fetchSmtpConfig()` ; envoi requis avant envoi de newsletter |
| **Tracking** | Pixel 1x1 pour ouvertures, liens wrappés pour clics via `/api/track/open` et `/api/track/click` |

---

## 5. Points d’amélioration à prioriser

### UX / Product

1. **Édition d’une newsletter existante** : la page `[id]` est en lecture seule ; pas de reprise pour modifier une newsletter draft ou planifiée.
2. **Liste des newsletters** : les boutons modifier/supprimer ne sont pas fonctionnels (affichage uniquement).
3. **Gestion des listes / segments** : les destinataires viennent uniquement des clients + emails manuels ; pas de liste dédiée (ex. « Newsletter B2B », « Prospects »).
4. **Planification** : `html_content` stocké en base pour les envois différés, mais pas de job/cron côté Strapi visible pour l’envoi effectif.

### Technique

5. **Taille de `compose/page.tsx`** : ~4400 lignes, mélange logique, UI et helpers ; à découper en composants et hooks.
6. **Doublon templates** : `newsletter-templates.ts` (12 templates) vs templates inline dans compose (4 types) ; fusion ou clarification des rôles.
7. **Éditeur riche** : usage de `document.execCommand` et `contentEditable` ; envisager une lib dédiée (TipTap, Lexical, etc.) pour la stabilité et l’accessibilité.
8. **Validation** : peu de validation côté client avant envoi (ex. contenu vide, CTA sans URL).

### Données

9. **Subscribers vs Clients** : double modèle (subscribers créés à la volée) ; envisager une stratégie plus claire (unifier ou documenter le lien).
10. **Statistiques** : tracking ouvertures/clics côté Strapi ; pas d’UI pour visualiser ces stats dans le dashboard.

---

## 6. Instructions pour le LLM

En tant que LLM, pour améliorer ce module :

1. **Lire en priorité** :  
   - `src/app/dashboard/newsletters/compose/page.tsx` (structure, étapes, `handleSend`)  
   - `src/app/api/newsletters/send/route.ts`  
   - `src/lib/api.ts` (createNewsletter, findOrCreateSubscriber, CreateNewsletterData)

2. **Objectifs à viser** :  
   - Réduire la complexité de `compose/page.tsx` en extrayant des sous-composants et hooks.  
   - Rendre la liste des newsletters pleinement fonctionnelle (éditer, supprimer).  
   - Permettre l’édition d’une newsletter existante (draft/planifiée).  
   - Clarifier le rôle des templates (`newsletter-templates.ts` vs inline).  
   - Améliorer la gestion des destinataires (listes/segments si pertinent).

3. **Contraintes** :  
   - Backend Strapi ; respecter les schémas et relations existantes (newsletter, subscriber, author).  
   - Config SMTP requise avant envoi.  
   - Tracking (pixel + liens) déjà géré dans l’API send.  
   - i18n via `useLanguage()` et `t()`.

4. **Cohérence** :  
   - Réutiliser les patterns du reste de l’app (DataTable, modals, `showGlobalPopup`, ProtectedRoute).  
   - Garder la cohérence avec les modules emails (compose, drafts) et la bibliothèque médias.
