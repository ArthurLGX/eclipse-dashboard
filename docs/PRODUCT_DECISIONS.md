# Eclipse Dashboard – Product Decisions

## 📌 Rôle de ce document
Ce document centralise les **décisions produit structurantes**.
Il sert de référence pour :
- éviter les régressions fonctionnelles
- cadrer les refactorings
- aligner développement, UX et vision business

Toute modification majeure du produit doit être cohérente avec ce document.

---

## 🎯 Vision Produit

Eclipse Dashboard est un CRM orienté **rentabilité** pour freelances (principalement développeurs web).

👉 Le **Projet** est le hub central du produit.  
👉 L’objectif principal est d’aider un freelance à :
- comprendre s’il gagne ou perd de l’argent
- savoir **quoi faire** pour améliorer sa rentabilité
- facturer de manière claire et justifiée

Le produit doit rester **simple, décisionnel et orienté action**.

---

## 🧭 Principes Directeurs

1. **Une page = une décision business**
2. **Moins de features > plus de clarté**
3. **Tout doit servir le projet**
4. **Les modules avancés sont optionnels**
5. **La valeur prime sur la propreté technique**

---

## 🧱 Décisions Produit Clés (Janvier 2026)

### 🔑 Architecture Générale
- Le Projet (`/dashboard/projects/[slug]`) est la page la plus importante du produit
- Toutes les entités (contacts, devis, factures, temps) gravitent autour du projet

---

### 🧩 Modules
- Les modules suivants sont **OFF par défaut** :
  - newsletters
  - monitoring
  - growth_audit
  - seo_audit
  - calendar
- Les modules suivants sont **ON par défaut** :
  - projects
  - contacts
  - quotes
  - invoices
  - time_tracking (version simple)

Les modules avancés existent mais ne doivent **jamais encombrer l’expérience initiale**.

---

### 📊 Page Projet – Hub Central
La page projet doit contenir :
- un **bloc Rentabilité** (temps estimé vs réel)
- des **alertes visuelles** (seuils simples)
- des **actions rapides** (devis, facture, timer)
- les **informations client** visibles sans navigation supplémentaire

Cette page doit provoquer un **“aha moment”** :
> *“Je comprends pourquoi ce projet me rapporte (ou non).”*

---

### 👥 Contacts (Clients / Prospects)
- Les notions de Client et Prospect sont unifiées via un modèle `Contact`
- Le statut (`prospect | client | archived`) définit le rôle
- Les pages `/clients`, `/prospects`, `/pipeline` sont des **vues filtrées**
- La conversion prospect → client est un simple changement de statut

---

### 🔀 Pipeline CRM
- Le Pipeline est une **vue secondaire**
- Il ne doit pas complexifier le modèle mental
- Son refactoring complet est **volontairement différé**
- Sa valeur doit être validée par l’usage avant tout chantier lourd

---

### 📂 Templates
- Les templates de projet et d’emails ne sont **pas visibles dans la navigation**
- Ils sont accessibles uniquement via :
  - l’onboarding
  - la création de projet
- Les templates servent l’action, pas l’exploration

---

### ⏱️ Time Tracking
- Le time tracking simple est **core**
- Fonctionnalités incluses :
  - start / stop
  - lien à une tâche / projet
- Les analytics avancées sont optionnelles et différées

---

## ⏸️ Ce qui est volontairement différé

Les éléments suivants sont **hors priorité actuelle** :
- Analytics avancées
- Automatisations complexes
- Monitoring technique
- SEO / Growth audit
- Newsletters
- Coaching / Mentors
- Portfolio avancé

Ils peuvent exister comme modules payants ou expérimentaux, mais **ne doivent jamais polluer le core produit**.

---

## ⚠️ Règle de Non-Régression

Avant d’ajouter une feature ou de refactorer :
1. Vérifier qu’elle sert directement le Projet
2. Vérifier qu’elle améliore une décision business
3. Vérifier qu’elle n’ajoute pas de charge mentale inutile

Si ce n’est pas le cas → **ne pas implémenter**.

---

## 🧠 Note pour les développeurs (humains ou IA)

Ce produit privilégie :
- la lisibilité
- la progressivité
- la valeur utilisateur

Toute refonte structurelle doit être **justifiée par un gain clair côté utilisateur**, pas uniquement par une amélioration technique.

➡️ Référez-vous toujours à ce document avant une modification majeure.
