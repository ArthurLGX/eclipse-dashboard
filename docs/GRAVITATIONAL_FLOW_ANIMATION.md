# GravitationalFlow - Animation Premium CRM

Animation sophistiquée du process flow CRM inspirée des standards de motion design de **Google Material Motion** et **Microsoft Fluent Motion**.

## 🎯 Objectif

Transmettre visuellement la logique du process CRM sans texte, de manière fluide, élégante et compréhensible instantanément.

## 🎨 Principes de Design

### 1. **Apparition Progressive**
- Jamais d'apparition brutale
- Toujours : `opacity + scale + blur léger`
- Easing doux (easeInOut, spring très amorti)

### 2. **Mouvement = Relation Logique**
- Élément actif → attiré vers le centre (attraction gravitationnelle)
- Élément inexistant → état fantôme (opacity faible, stroke fin)
- Connexions apparaissent **après** les éléments (retard volontaire de 0.4s)

### 3. **Spatialité et Continuité**
- Les transitions conservent la position relative
- Pas de téléportations
- Utilisation de `layout` / `layoutId` pour les transitions partagées
- Un élément évolue, il ne disparaît pas pour réapparaître ailleurs

### 4. **Rythme**
- Animation lente mais vivante (15s total)
- Aucun "bounce" excessif
- Spring damped : `stiffness: 80, damping: 20, mass: 1.2`
- Rotation orbitale : 30 secondes pour un tour complet

## 🛠️ Implémentation Technique

### Easing Curves

```typescript
// Google Material Motion
const materialEasing = [0.25, 0.1, 0.25, 1.0];

// Microsoft Fluent Motion
const fluentEasing = [0.16, 1, 0.3, 1];
```

### Spring Configuration

```typescript
{
  type: "spring",
  stiffness: 80,    // Rigidité modérée
  damping: 20,      // Amortissement fort
  mass: 1.2,        // Masse légèrement augmentée
}
```

### Séquence d'Animation

| Timing | Phase | Description |
|--------|-------|-------------|
| 0ms | 0 | État initial (silent) |
| 0ms | 1 | Grid fine apparaît (2.5s fade-in) |
| 1500ms | 2 | Client central se matérialise |
| 2500ms | 3 | Orbite de référence apparaît |
| 3200ms | - | Contact arrive (attraction gravitationnelle) |
| 4000ms | - | Devis arrive |
| 4800ms | - | Contrat arrive |
| 5600ms | - | Projet arrive |
| 6400ms | - | Facture arrive |
| 7200ms | - | Paiement arrive |
| 8500ms | 4 | Rotation orbitale lente (30s/tour) |
| 12000ms | 5 | Zoom out + logo + texte final |
| 15000ms | - | Restart (si autoRestart = true) |

## 📦 Utilisation

### Basic Usage

```tsx
import GravitationalFlow from '@/app/components/GravitationalFlow';

<GravitationalFlow />
```

### Options Avancées

```tsx
<GravitationalFlow
  showLabels={true}           // Afficher les labels (défaut: true)
  autoRestart={true}          // Redémarrer automatiquement (défaut: true)
  onComplete={() => {         // Callback à la fin
    console.log('Animation terminée');
  }}
/>
```

### Exemple : Page de Login

```tsx
<motion.div
  className="relative lg:flex hidden flex-col items-center justify-center p-12 
             bg-gradient-to-br from-black/40 to-black/20 border-l border-default 
             overflow-hidden"
>
  <GravitationalFlow />
</motion.div>
```

### Exemple : Onboarding Modal

```tsx
<div className="h-96 w-full relative">
  <GravitationalFlow 
    showLabels={false}
    autoRestart={false}
    onComplete={() => setStep(2)}
  />
</div>
```

### Exemple : Landing Page Hero

```tsx
<section className="min-h-screen flex items-center justify-center">
  <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12">
    <div className="flex flex-col justify-center">
      <h1>Gérez votre business</h1>
      <p>Un seul flux, toutes vos opérations</p>
    </div>
    <div className="h-[600px]">
      <GravitationalFlow />
    </div>
  </div>
</section>
```

## 🎬 Anatomie de l'Animation

### 1. Grid de Fond
- Grille fine (48x48px)
- Opacity très faible (0.12)
- Masque radial pour estompage sur les bords
- Fade-in : 2.5s avec Material easing

### 2. Cercle Central (Client)
- Glassmorphism : `backdrop-blur-xl` + gradient transparent
- Breathing effect : scale [1, 1.02, 1] sur 3s
- Glow subtil : radial-gradient avec pulse
- Pulse ring : scale [1, 1.4, 1] avec opacity

### 3. Orbite de Référence
- Cercle guide pour les éléments orbitaux
- Border fine avec shadow légère
- Apparition : 1.8s avec Fluent easing
- Disparaît lors du zoom final

### 4. Éléments Orbitaux

#### État Fantôme (inexistant)
```tsx
<div className="w-14 h-14 rounded-full border border-muted/30"
     style={{ background: 'transparent' }} />
```

#### État Actif
- Arrival animation : `y: -200 → orbital position`
- Blur progressive : `blur(8px) → blur(0px)`
- Spring damped pour l'attraction
- Glow individuel décalé (delay: index * 0.3)
- Glassmorphism premium

#### Connexions
- Lignes pointillées (strokeDasharray: "4 4")
- PathLength animation : 0 → 1
- Retard de 0.4s après l'élément
- Opacity : 0.25

### 5. Rotation Orbitale
- Phase 4 : rotation complète en 30s
- Ease: "linear" pour continuité
- Repeat: Infinity

### 6. Zoom Final
- Tous les éléments : scale 0.35, blur(2px)
- Opacité réduite à 0.5-0.6
- Texte apparaît avec fade-in sophistiqué
- Stagger sur les 2 lignes de texte

## 🎨 Personnalisation

### Couleurs
L'animation utilise les variables CSS du thème :
- `--color-accent` : Couleur principale
- `--border-muted` : Grid et lignes
- `--text-primary` : Labels
- `--text-secondary` : Labels secondaires

### Dimensions
```typescript
const radius = 160; // Rayon de l'orbite
```

Ajuster selon le conteneur :
- Mobile : `radius = 120`
- Tablet : `radius = 140`
- Desktop : `radius = 160`

### Timing
Modifier la séquence dans `useEffect` :
```typescript
const sequence = [
  { delay: 0, action: () => setPhase(1) },
  // Ajouter ou modifier les timings ici
];
```

## 🚀 Performance

### Optimisations Appliquées
- ✅ `layoutId` pour transitions partagées (pas de recalcul)
- ✅ `will-change` implicite via Framer Motion
- ✅ GPU acceleration (transform, opacity, filter)
- ✅ AnimatePresence pour cleanup propre
- ✅ useCallback pour éviter re-renders

### Monitoring
```tsx
<motion.div
  onAnimationStart={() => console.log('Animation started')}
  onAnimationComplete={() => console.log('Animation completed')}
/>
```

## 📱 Responsive

### Mobile
```tsx
<div className="lg:flex hidden">
  <GravitationalFlow />
</div>
```
Recommandé : masquer sur mobile pour économiser les ressources.

### Tablet
Ajuster le radius et les labels pour un rendu optimal.

## 🎯 Checklist Qualité

- [x] Apparition progressive (opacity + scale + blur)
- [x] Easing sophistiqués (Material + Fluent)
- [x] Attraction gravitationnelle logique
- [x] États fantômes pour éléments inexistants
- [x] Spatialité (layout/layoutId)
- [x] Continuité (pas de téléportation)
- [x] Spring damped (stiffness: 80, damping: 20)
- [x] Animation lente mais vivante
- [x] Pas de bounce excessif
- [x] Glassmorphism premium
- [x] Glow subtils
- [x] Réutilisable (composant séparé)

## 🔗 Références

- [Google Material Motion](https://material.io/design/motion)
- [Microsoft Fluent Motion](https://www.microsoft.com/design/fluent/#/motion)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Spring Physics](https://www.framer.com/motion/transition/#spring)

## 💡 Inspiration Future

### Micro-interactions
- Hover sur élément orbital → highlight connexion
- Click sur élément → détails du processus
- Drag orbital element → réorganiser le flow

### Variations
- Dark/Light mode adaptatif
- Couleurs thématiques par industrie
- Animation plus courte pour onboarding (8s)
- Version "exploded view" pour dashboard

### Extensions
- Export en vidéo (Lottie)
- Version SVG statique pour fallback
- Intégration avec données réelles du CRM
- Analytics sur les interactions

---

**Créé avec** ❤️ **en suivant les standards de motion design premium**
