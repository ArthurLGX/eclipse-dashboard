# 📧 Boîte de Réception Style Gmail

## Vue d'ensemble

La page **Boîte de réception** (`/dashboard/emails/inbox`) a été repensée pour offrir une expérience utilisateur identique à Gmail, permettant aux utilisateurs de ne pas perdre leurs habitudes.

---

## 🎯 Fonctionnalités Principales

### 1. **Bouton "Nouveau message" avec Menu Déroulant**

Un bouton principal permet de créer différents types d'emails :

- **Email classique** : Message standard avec éditeur riche
- **Devis** : Envoi de devis avec PDF généré automatiquement
- **Facture** : Envoi de facture avec PDF joint
- **Newsletter** *(à venir)* : Campagne d'emailing

**Design** :
- Bouton arrondi style Gmail
- Menu déroulant animé avec icônes colorées
- Hover effect avec effet de scale

---

### 2. **Fenêtre de Composition Flottante**

Inspirée de Gmail, la fenêtre de composition apparaît **en bas à droite** de l'écran.

#### Fonctionnalités :

**a) Modes d'affichage** :
- **Normal** : 600px × 680px (défaut)
- **Minimisé** : 320px × 56px (barre de titre uniquement)
- **Maximisé** : Plein écran avec overlay subtil

**b) Contrôles** :
- **Bouton `-`** : Minimiser/Restaurer
- **Bouton ⛶** : Maximiser/Restaurer
- **Bouton `×`** : Fermer

**c) Animations** :
- Apparition depuis le bas avec scale
- Transitions fluides entre les modes
- Framer Motion pour des animations naturelles

---

### 3. **Mode Réponse Intégré**

Quand vous cliquez sur **"Répondre"** dans un email :

✅ La fenêtre de composition s'ouvre automatiquement  
✅ Le destinataire est pré-rempli  
✅ Le sujet commence par "Re:"  
✅ L'email original est affiché en bas (pliable/dépliable)  
✅ Votre signature est ajoutée automatiquement  

**Affichage de l'email original** :
```
─────────────────────────────────────
[Bouton] Afficher le message original ▼

Le mercredi 22 janvier 2026 à 14:30, Jean Dupont a écrit :
┃  Contenu de l'email original...
┃  [citation complète]
```

---

## 🏗️ Architecture Technique

### Composants Créés

#### **1. `GmailStyleComposer.tsx`**
Fenêtre flottante principale avec gestion des états (minimisé, maximisé).

**Props** :
```typescript
interface GmailStyleComposerProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: EmailComposerType;
  replyToEmail?: ReceivedEmail;
}
```

**Features** :
- Positioning absolu en bas à droite
- États : normal, minimisé, maximisé
- Header coloré avec contrôles
- Animations Framer Motion

---

#### **2. `CompactEmailForm.tsx`**
Formulaire d'email simplifié pour la fenêtre Gmail.

**Props** :
```typescript
interface CompactEmailFormProps {
  type: EmailComposerType;
  replyToEmail?: ReceivedEmail;
  onSuccess?: () => void;
}
```

**Différences avec `EmailComposer`** :
- ✅ Pas de header/navigation
- ✅ Layout compact optimisé
- ✅ RichTextEditor ajusté (200-300px)
- ✅ Affichage de l'email original pliable
- ✅ Footer fixe avec bouton d'envoi
- ✅ Gestion de la signature automatique

---

### État dans `inbox/page.tsx`

```typescript
// Gmail-style composer
const [showComposer, setShowComposer] = useState(false);
const [composerType, setComposerType] = useState<EmailComposerType>('compose');
const [replyToEmail, setReplyToEmail] = useState<ReceivedEmail | null>(null);
const [showTypeMenu, setShowTypeMenu] = useState(false);
```

**Handlers** :
- `handleNewEmail(type)` : Ouvre le composer avec le type sélectionné
- `handleReply(email)` : Ouvre le composer en mode réponse

---

## 🎨 Design & UX

### Inspirations Gmail

| Feature Gmail | Implémentation | Status |
|---------------|----------------|--------|
| Bouton "+ Nouveau" | Bouton arrondi avec menu déroulant | ✅ |
| Fenêtre flottante bas-droite | `GmailStyleComposer` avec positionnement fixe | ✅ |
| Minimiser/Maximiser | États avec animations | ✅ |
| Citation email original | Blockquote avec bordure gauche | ✅ |
| Signature automatique | Ajoutée en bas de chaque email | ✅ |
| Scroll confiné | `overscroll-contain` + body lock | ✅ |

---

### Différences avec l'Ancienne Version

| Avant | Maintenant |
|-------|------------|
| Redirection vers `/dashboard/emails/compose` | Fenêtre flottante sans quitter l'inbox |
| Pages séparées pour devis/factures | Tout dans le même composer avec types |
| Pas de mode réponse intégré | Réponse directe depuis l'email |
| Scroll non confiné | Scroll focus type modal |

---

## 📝 Utilisation

### Créer un Nouvel Email

1. Cliquez sur **"Nouveau message"**
2. Sélectionnez le type (classique, devis, facture)
3. La fenêtre s'ouvre en bas à droite
4. Remplissez les champs et envoyez

### Répondre à un Email

1. Ouvrez un email reçu
2. Cliquez sur **"Répondre"**
3. La fenêtre de composition s'ouvre avec :
   - Destinataire pré-rempli
   - Sujet avec "Re:"
   - Email original cité en bas
4. Rédigez et envoyez

### Contrôles de la Fenêtre

- **Minimiser** (`-`) : Réduit la fenêtre à une barre de titre
- **Maximiser** (`⛶`) : Affiche en plein écran
- **Fermer** (`×`) : Ferme la fenêtre (brouillon auto-sauvegardé pour les emails classiques)

---

## 🔧 Configuration

### Types d'Emails Supportés

```typescript
type EmailComposerType = 'compose' | 'quote' | 'invoice';
```

**Par défaut** :
- `compose` : Email classique avec RichTextEditor, pièces jointes, planification
- `quote` : Sélecteur de devis, génération PDF, envoi automatique
- `invoice` : Sélecteur de facture, génération PDF, envoi automatique

---

## 🚀 Améliorations Futures

- [ ] Drag & drop de la fenêtre flottante
- [ ] Multiples fenêtres de composition simultanées
- [ ] Auto-complétion des contacts dans le champ "À"
- [ ] Pièces jointes par drag & drop
- [ ] Templates de réponses rapides
- [ ] Mode hors-ligne avec synchronisation

---

## 🐛 Debugging

### La fenêtre ne s'affiche pas
- Vérifier que `showComposer` est à `true`
- Vérifier le z-index (actuellement `100`)

### Le scroll ne fonctionne pas
- Vérifier que `overscroll-contain` est bien sur les conteneurs
- Vérifier que `document.body.style.overflow = 'hidden'` est bien appliqué

### L'email original n'apparaît pas en mode réponse
- Vérifier que `replyToEmail` est bien passé au `GmailStyleComposer`
- Vérifier que `content_html` ou `content_text` existe dans l'email

---

## 📦 Fichiers Modifiés

### Nouveaux fichiers :
- `src/app/components/GmailStyleComposer.tsx` : Fenêtre flottante principale
- `src/app/components/CompactEmailForm.tsx` : Formulaire compact pour la fenêtre

### Fichiers modifiés :
- `src/app/dashboard/emails/inbox/page.tsx` : Intégration du système Gmail
- `src/app/components/EmailComposer.tsx` : Ajout des props `replyToEmail`, `onSuccess`, `compact`

---

## 💡 Bonnes Pratiques

1. **Toujours passer `onSuccess`** pour fermer la fenêtre après envoi
2. **Vérifier `replyToEmail`** pour activer le mode réponse
3. **Gérer le z-index** : Composer (100) > Menu (90) > Inbox (50)
4. **Tester sur mobile** : La fenêtre s'adapte en plein écran

---

**Dernière mise à jour** : 21 janvier 2026  
**Version** : 1.0.0
