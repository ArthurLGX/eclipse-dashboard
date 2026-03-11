# Smart Follow-Up – Suggestions pour le prompt de triage IA (backend)

Si l'analyse et le scoring des leads sont gérés côté backend (Strapi ou autre), ce document propose des ajustements pour le prompt de l’IA qui attribue le `confidence_score`, `intent`, `urgency`, etc.

## Problème actuel

Un lead provenant de `johann@walego.co` (domaine prioritaire configuré) reçoit un score d’environ 48 % alors qu’il devrait être considéré comme prioritaire.

## Modifications recommandées

1. **Domaine prioritaire = boost de score**

   Si l’email de l’expéditeur ou du contact provient d’un domaine listé dans `priority_keywords` (ex. walego, walego.co, walego.com) :
   - affecter un **confidence_score** maximal (ex. 1.0 ou 100 %) ou au minimum au-dessus du seuil de qualification ;
   - ou appliquer un bonus fixe (ex. +0.5) au score avant la décision finale.

2. **Prise en compte des domaines dans le prompt**

   Ajouter au prompt quelque chose comme :

   ```
   DOMAINES PRIORITAIRES : Les domaines suivants sont prioritaires pour le client : [liste des priority_keywords].
   Si l'email de l'expéditeur provient d'un de ces domaines (ex: @walego.co, @walego.com), attribue un score de confiance maximal (1.0) et une urgence élevée.
   ```

3. **Extraction du domaine**

   Utiliser le domaine de l’expéditeur (`from_email` après `@`) et le comparer aux `priority_keywords` (ex. "walego" doit matcher "walego.co", "walego.com").

## Côté frontend

Le frontend gère déjà :
- l’affichage du badge « Priorité domaine » pour les leads dont l’email correspond aux mots-clés prioritaires ;
- l’affichage d’un score 100 % pour ces leads ;
- l’inclusion de ces leads dans les leads qualifiés, même avec un score brut faible.

Le backend peut en plus appliquer le boost de score pour cohérence entre scoring et affichage.
