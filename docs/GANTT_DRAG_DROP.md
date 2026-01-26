# 📅 Drag-and-Drop Interactif dans la Vue Gantt

Cette documentation explique la nouvelle fonctionnalité de drag-and-drop et redimensionnement des tâches dans la vue Gantt du gestionnaire de projets.

---

## 🎯 Fonctionnalités Implémentées

### 1. **Déplacement de Tâche (Drag Horizontal)**
Glissez une tâche horizontalement pour décaler ses dates de début et de fin, tout en conservant la durée.

**Comportement :**
- Cliquez et maintenez sur le centre de la barre de tâche
- Glissez vers la gauche ou la droite
- Les dates `start_date` et `due_date` sont modifiées proportionnellement
- La durée de la tâche reste inchangée

**Exemple :**
- Tâche initiale : 10 janv → 15 janv (6 jours)
- Après déplacement de 3 jours à droite : 13 janv → 18 janv (6 jours)

---

### 2. **Redimensionnement par la Gauche**
Étirez ou réduisez la tâche par son extrémité gauche pour modifier la date de début.

**Comportement :**
- Survolez le bord gauche de la barre (poignée visible au hover)
- Cliquez et maintenez
- Glissez vers la gauche pour avancer la date de début
- Glissez vers la droite pour retarder la date de début
- La date de fin reste fixe, seule la durée change

**Exemple :**
- Tâche initiale : 10 janv → 15 janv (6 jours)
- Après étirement de 2 jours vers la gauche : 8 janv → 15 janv (8 jours)

---

### 3. **Redimensionnement par la Droite**
Étirez ou réduisez la tâche par son extrémité droite pour modifier la date de fin.

**Comportement :**
- Survolez le bord droit de la barre (poignée visible au hover)
- Cliquez et maintenez
- Glissez vers la droite pour prolonger la date de fin
- Glissez vers la gauche pour raccourcir la date de fin
- La date de début reste fixe, seule la durée change

**Exemple :**
- Tâche initiale : 10 janv → 15 janv (6 jours)
- Après étirement de 3 jours vers la droite : 10 janv → 18 janv (9 jours)

---

## 🎨 Indicateurs Visuels

### **Pendant le Drag**
- La barre de tâche devient semi-transparente (opacité 80%)
- Un effet de mise à l'échelle (105%) est appliqué
- Une ombre portée plus prononcée apparaît

### **Indicateur de Dates en Temps Réel**
Un tooltip noir apparaît au-dessus de la tâche pendant le drag, affichant :
- Les nouvelles dates : `10 janv → 18 janv`
- Pour le redimensionnement, la durée est aussi affichée : `9 jours`

### **Poignées de Redimensionnement**
- **Au repos** : Invisibles
- **Au survol de la barre** : Zones semi-transparentes sur les bords gauche et droit
- **Pendant le redimensionnement** : Zones plus visibles (bg-white/30)

---

## ⚙️ Architecture Technique

### **Composant `DraggableGanttBar.tsx`**
Composant réutilisable qui encapsule toute la logique de drag-and-drop.

**Props Principales :**
```typescript
interface DraggableGanttBarProps {
  taskId: string;                // ID unique de la tâche
  startOffset: number;           // Position de début en jours depuis minDate
  duration: number;              // Durée en jours
  dayWidth: number;              // Largeur d'un jour en pixels (32px)
  startDate: string | null;      // Date de début au format YYYY-MM-DD
  dueDate: string | null;        // Date de fin au format YYYY-MM-DD
  minDate: Date;                 // Date minimale du Gantt (pour calculer les nouvelles dates)
  color: string;                 // Couleur de la barre
  progress: number;              // Progression 0-100%
  onDateChange: (taskId: string, newStartDate: string, newDueDate: string) => Promise<void>;
}
```

### **Gestion des États**
- `isDragging` : Indique si un drag est en cours
- `dragMode` : Type de drag (`'move'`, `'resize-left'`, `'resize-right'`, `null`)
- `tempStartOffset` : Position temporaire pendant le drag
- `tempDuration` : Durée temporaire pendant le redimensionnement

### **Calcul des Nouvelles Dates**
```typescript
const calculateDateFromOffset = (dayOffset: number): string => {
  const newDate = new Date(minDate);
  newDate.setDate(newDate.getDate() + dayOffset);
  return newDate.toISOString().split('T')[0];
};
```

### **Appel API**
Lorsque le drag se termine, `onDateChange` est appelé avec les nouvelles dates :
```typescript
await updateProjectTask(taskDocumentId, {
  start_date: newStartDate,
  due_date: newDueDate,
});
```

---

## 🔗 Intégration dans ProjectTasks

### **Fichiers Modifiés**

1. **`src/app/components/DraggableGanttBar.tsx`** (nouveau)
   - Composant de barre draggable et redimensionnable

2. **`src/app/components/ProjectTasks.tsx`** (modifié)
   - Import de `DraggableGanttBar`
   - Ajout de `handleTaskDateChange` dans `TaskGanttView`
   - Remplacement des `<div>` statiques par `<DraggableGanttBar>`
   - Ajout du callback `onTasksChange` pour recharger les tâches

### **Exemple d'Utilisation**
```tsx
<DraggableGanttBar
  taskId={task.documentId}
  startOffset={startOffset}
  duration={duration}
  dayWidth={32}
  startDate={task.start_date}
  dueDate={task.due_date}
  minDate={ganttData.minDate}
  color={group.color}
  taskStatus={task.task_status}
  progress={effectiveProgress}
  onDateChange={handleTaskDateChange}
>
  <div className="flex items-center justify-between px-2 overflow-hidden h-full">
    <span className="text-[11px] text-white font-medium truncate">
      {duration > 3 ? task.title : ''}
    </span>
    {duration > 2 && (
      <span className="text-[10px] text-white/90 font-semibold">
        {effectiveProgress}%
      </span>
    )}
  </div>
</DraggableGanttBar>
```

---

## 🧪 Comportements Spéciaux

### **Durée Minimale**
- Une tâche ne peut jamais être réduite à moins d'1 jour
- Lors du redimensionnement, `Math.max(1, newDuration)` est appliqué

### **Limite Gauche**
- Une tâche ne peut pas être déplacée avant le début du Gantt (`minDate`)
- `startOffset` est toujours >= 0

### **Arrondissement**
- Le drag est converti en jours entiers : `Math.round(deltaX / dayWidth)`
- Les mouvements de moins d'1 jour sont ignorés

### **Annulation en Cas d'Erreur**
- Si l'appel API échoue, les positions temporaires sont réinitialisées
- L'utilisateur voit un retour visuel de l'échec

---

## 🎬 Animations et Transitions

### **Framer Motion**
Le composant utilise `motion.div` de Framer Motion pour :
- Gestion native du drag avec `drag="x"`
- Contraintes de mouvement avec `dragElastic={0}` et `dragMomentum={false}`
- Callbacks `onDragStart`, `onDrag`, `onDragEnd`

### **Transitions CSS**
- `hover:shadow-md` : Ombre au survol
- `transition-all` : Transitions fluides
- `opacity-80` pendant le drag
- `scale-105` pour l'effet de "lift"

---

## 🚀 Utilisation

### **Accéder à la Vue Gantt**
1. Aller dans un projet : `/dashboard/projects/[slug]`
2. Onglet **"Tâches"**
3. Sélecteur de vue en haut : cliquer sur **"Gantt"** (icône timeline)

### **Déplacer une Tâche**
- Cliquez au centre de la barre
- Glissez horizontalement
- Relâchez pour confirmer

### **Redimensionner une Tâche**
- Survolez un bord (gauche ou droit)
- Cliquez sur la poignée
- Glissez pour étirer/réduire
- Relâchez pour confirmer

### **Sous-tâches**
Les sous-tâches sont également draggables et redimensionnables, avec des barres plus petites (h-4 au lieu de h-7).

---

## 📊 Compatibilité

### **Navigateurs Supportés**
- Chrome/Edge : ✅ Pleinement supporté
- Firefox : ✅ Pleinement supporté
- Safari : ✅ Pleinement supporté

### **Appareils Tactiles**
- Touch events supportés via Framer Motion
- `touchAction: 'none'` pour éviter le scroll pendant le drag

---

## 🔮 Améliorations Futures

### **Possibilités d'Extension**
1. **Snap to Grid** : Aligner automatiquement sur les débuts de semaine
2. **Dépendances** : Empêcher de déplacer une tâche avant ses dépendances
3. **Multi-sélection** : Déplacer plusieurs tâches en même temps
4. **Undo/Redo** : Historique des modifications
5. **Conflits** : Avertissement si deux tâches se chevauchent pour une même ressource

---

## 📝 Notes de Développement

### **Performance**
- Les calculs de position sont mémoïsés avec `useMemo` et `useCallback`
- Le rechargement des tâches est déclenché uniquement après une modification confirmée
- Pas de re-render pendant le drag (utilisation d'états locaux temporaires)

### **Accessibilité**
- Les poignées ont des curseurs spécifiques (`cursor-ew-resize`, `cursor-move`)
- Le feedback visuel est clair (tooltip avec nouvelles dates)
- L'action peut être annulée en cas d'erreur API

---

**✅ Implémentation terminée et fonctionnelle !**
