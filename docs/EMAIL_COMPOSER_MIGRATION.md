# 📧 EmailComposer - Guide de Migration

## 📊 **Vue d'ensemble**

Le composant `EmailComposer` unifie les 3 formulaires d'emails existants :
- ✅ **Compose** (emails classiques)
- ✅ **Quote** (envoi de devis)
- ✅ **Invoice** (envoi de factures)

**Avant** : 3 fichiers de ~1000 lignes chacun avec **~70% de code dupliqué**  
**Après** : 1 composant réutilisable de ~1350 lignes + 3 pages wrapper de ~20 lignes

---

## 🎯 **Avantages**

### **Avant (Code dupliqué)**
```
compose/page.tsx  : 1014 lignes
quote/page.tsx    : 1049 lignes  
invoice/page.tsx  : 1078 lignes
─────────────────────────────────
TOTAL             : 3141 lignes
```

### **Après (Code unifié)**
```
EmailComposer.tsx : 1350 lignes (logique commune)
compose/page.tsx  : ~20 lignes (wrapper)
quote/page.tsx    : ~20 lignes (wrapper)
invoice/page.tsx  : ~20 lignes (wrapper)
─────────────────────────────────
TOTAL             : ~1410 lignes (-55% de code !)
```

### **Bénéfices**
- ✅ **Moins de code à maintenir** (-1731 lignes)
- ✅ **Corrections centralisées** (1 seul endroit à modifier)
- ✅ **Cohérence UI/UX** garantie
- ✅ **Features réutilisables** entre types
- ✅ **Tests simplifiés** (1 composant à tester)

---

## 🚀 **Utilisation**

### **1. Email classique (Compose)**
```tsx
import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function ComposeEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="compose" />
    </ProtectedRoute>
  );
}
```

### **2. Envoi de devis (Quote)**
```tsx
import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function QuoteEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="quote" />
    </ProtectedRoute>
  );
}
```

### **3. Envoi de facture (Invoice)**
```tsx
import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function InvoiceEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="invoice" />
    </ProtectedRoute>
  );
}
```

---

## ⚙️ **Configuration avancée**

### **Features par type**

Chaque type a des features par défaut, mais vous pouvez les personnaliser :

```tsx
<EmailComposer 
  type="compose"
  features={{
    richText: true,              // RichTextEditor (compose)
    title: true,                 // Champ titre optionnel
    scheduling: true,            // Planification d'envoi
    attachments: true,           // Gestion des pièces jointes
    documentSelector: false,     // Sélecteur de document (quote/invoice)
    pdfAttachment: false,        // PDF auto-généré (quote/invoice)
    aiGeneration: false,         // Génération IA (quote/invoice)
    replyTo: true,               // Mode réponse (compose)
    contactAutocomplete: true,   // Autocomplete contacts
    draftManagement: false,      // Gestion des brouillons (quote/invoice)
  }}
/>
```

### **Features par défaut**

| Feature | Compose | Quote | Invoice |
|---------|---------|-------|---------|
| **Rich Text Editor** | ✅ | ❌ | ❌ |
| **Title Field** | ✅ | ❌ | ❌ |
| **Scheduling** | ✅ | ❌ | ❌ |
| **Attachments** | ✅ | ❌ | ❌ |
| **Document Selector** | ❌ | ✅ | ✅ |
| **PDF Attachment** | ❌ | ✅ | ✅ |
| **AI Generation** | ❌ | ✅ | ✅ |
| **Reply-To** | ✅ | ❌ | ❌ |
| **Contact Autocomplete** | ✅ | ❌ | ✅ |
| **Draft Management** | ❌ | ✅ | ✅ |

---

## 📝 **Exemple : Newsletter personnalisée**

```tsx
<EmailComposer 
  type="compose"
  features={{
    richText: true,
    title: true,              // Titre en haut de l'email
    scheduling: true,         // Planifier l'envoi
    attachments: false,       // Pas de pièces jointes
    contactAutocomplete: true,
  }}
/>
```

---

## 🔄 **Migration depuis l'ancien code**

### **Étape 1 : Remplacer les pages**

**Avant** :
```tsx
// src/app/dashboard/emails/compose/page.tsx (1014 lignes)
function ComposeEmail() {
  // Tout le code dupliqué...
}
```

**Après** :
```tsx
// src/app/dashboard/emails/compose/page.tsx (20 lignes)
import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function ComposeEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="compose" />
    </ProtectedRoute>
  );
}
```

### **Étape 2 : Vérifier les URL params**

Le composant gère automatiquement :
- ✅ `?quoteId=xxx` → Pré-sélection de devis
- ✅ `?invoiceId=xxx` → Pré-sélection de facture
- ✅ `?replyTo=true&replyToName=...` → Mode réponse
- ✅ `?draft=xxx` → Chargement d'un brouillon

### **Étape 3 : Tester**

1. Email classique : `/dashboard/emails/compose`
2. Devis : `/dashboard/emails/quote?quoteId=xxx`
3. Facture : `/dashboard/emails/invoice?invoiceId=xxx`

---

## 🎨 **Personnalisation UI**

### **Couleurs par type**

Les couleurs sont automatiquement adaptées selon le type :

| Type | Icône | Couleur | Bouton |
|------|-------|---------|--------|
| **Compose** | `IconMail` | `accent` | Bleu/Vert |
| **Quote** | `IconFileDescription` | `violet-500` | Violet |
| **Invoice** | `IconFileInvoice` | `amber-500` | Ambre |

### **Traductions**

Toutes les chaînes utilisent le contexte `useLanguage()` :
```tsx
const { t } = useLanguage();
t('compose_email')  // "Nouvel email"
t('send_quote')     // "Envoyer un devis"
t('send_invoice')   // "Envoyer une facture"
```

---

## 🐛 **Débogage**

### **Problème : Les features ne s'activent pas**

**Solution** : Vérifiez que vous passez bien les features en props :
```tsx
<EmailComposer 
  type="quote"
  features={{ aiGeneration: true }}  // ✅ Correct
/>
```

### **Problème : Le document ne se pré-remplit pas**

**Solution** : Vérifiez que l'URL contient le bon paramètre :
- Quote : `?quoteId=xxx`
- Invoice : `?invoiceId=xxx`

### **Problème : Les contacts ne s'affichent pas**

**Solution** : Le feature `contactAutocomplete` doit être activé :
```tsx
features={{ contactAutocomplete: true }}
```

---

## 📦 **Dépendances**

Le composant utilise :
- ✅ `RichTextEditor` (emails classiques)
- ✅ `ContactAutocomplete` (sélection de contacts)
- ✅ `EmailScheduler` (planification)
- ✅ `EmailPreviewModal` (aperçu)
- ✅ `SmtpStatusIndicator` (statut SMTP)
- ✅ `EmailSentSuccessModal` (confirmation)
- ✅ `MediaPickerModal` (pièces jointes)
- ✅ `useDraftSave` (auto-save)

---

## 🚦 **Prochaines étapes**

### **Phase 1 : Migration progressive** (Recommandé)
1. ✅ Créer `EmailComposer.tsx`
2. ✅ Migrer `compose/page.tsx`
3. ✅ Migrer `quote/page.tsx`
4. ✅ Migrer `invoice/page.tsx`
5. ⏳ Tester en production
6. ⏳ Supprimer l'ancien code

### **Phase 2 : Nouvelles features**
- Newsletter builder
- Templates d'emails
- Envoi groupé
- Campagnes email

---

## 💡 **Bonnes pratiques**

### **✅ À faire**
```tsx
// Composition simple et claire
<EmailComposer type="compose" />

// Personnalisation si nécessaire
<EmailComposer 
  type="compose"
  features={{ scheduling: true, title: true }}
/>
```

### **❌ À éviter**
```tsx
// Ne pas dupliquer la logique
function MyCustomEmail() {
  const [recipients, setRecipients] = useState([]);
  // ... réimplémenter tout ❌
}

// Utiliser EmailComposer à la place ✅
<EmailComposer type="compose" />
```

---

## 📄 **Licence**

Ce composant est propriétaire à Eclipse Dashboard.

**Auteur** : Arthur (Eclipse Studio Development)  
**Date** : Janvier 2026  
**Version** : 1.0.0
