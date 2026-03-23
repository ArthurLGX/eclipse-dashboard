# Backend Strapi — Implémentations requises

Ce document décrit les endpoints et collections Strapi à créer pour que les fonctionnalités suivantes fonctionnent côté dashboard.

---

## 1. WhatsApp bidirectionnel (réponses 1/2/3)

### Collection `whatsapp-context`

Créer une collection Strapi pour stocker le contexte des notifications WhatsApp en attente :

| Champ            | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| user_id          | string  | ID de l'utilisateur                              |
| recipient_number | string  | Numéro WhatsApp du destinataire                  |
| lead_id          | string  | ID du lead                                       |
| automation_action_id | string | documentId de l'automation-action            |
| draft_message    | text    | (optionnel) Draft si < 5000 caractères           |
| lead_linkedin_url| string  | (optionnel) Lien LinkedIn                        |
| expires_at       | datetime| Expiration (24h)                                 |
| status           | enum    | pending, executed, expired                       |

### Endpoint `POST /api/whatsapp/process-reply`

Le webhook Next.js (`/api/webhooks/whatsapp`) appelle cet endpoint quand Meta envoie une réponse.

**Body :**
```json
{
  "fromNumber": "33612345678",
  "reply": "1"
}
```

**Logique attendue :**
1. Trouver le contexte en attente pour `recipient_number === fromNumber`, `status === 'pending'`, `expires_at > now`
2. Selon `reply` normalisé (`"1"`, `"2"`, `"3"`) :
   - **1** : Mettre à jour automation-action en `approved`, déclencher envoi draft, envoyer confirmation WhatsApp
   - **2** : Reporter à demain 9h (`scheduled_at`, `status: snoozed`), envoyer confirmation
   - **3** : Archiver l’action, envoyer confirmation
3. Marquer le contexte en `executed`

**Modifications dans `whatsapp.service.ts` (ou équivalent) :**
- Dans `notifyNewLead()`, après envoi réussi, créer une entrée dans `whatsapp-context`
- Dans `buildLeadMessage()`, ajouter les options : *Répondez : 1 — Envoyer le draft | 2 — Reporter | 3 — Archiver*

---

## 2. Home View quotidienne (Daily Digest)

### Collection `daily-digest`

| Champ            | Type     | Description                           |
|------------------|----------|---------------------------------------|
| user             | relation | User (many-to-one)                    |
| date             | date     | Date du digest (YYYY-MM-DD)          |
| generated_at     | datetime | Heure de génération                   |
| hot_leads        | JSON     | Actions chaudes à traiter             |
| stalled_leads    | JSON     | Leads tièdes sans réponse 5+ jours    |
| today_rdvs       | JSON     | RDV du jour                           |
| total_actionable | number   | Nombre total d’actions                |

Format JSON pour chaque liste (ex. `hot_leads`) :
```json
[
  {
    "id": "docId_automation_action",
    "name": "Charlotte Joseph",
    "signal": "Relancer (J+2 depuis sa réaction 👏)",
    "score": "hot",
    "scheduledAt": "2025-01-21T14:00:00.000Z",
    "taskType": "proposal_follow_up",
    "daysOld": 2
  }
]
```

### Endpoint `GET /api/daily-digests`

Filtres attendus par le proxy Next.js :
- `filters[date][$eq]=2025-01-21`
- `filters[user][id][$eq]=<userId>`

Retourner le digest du jour si existant.

### Endpoint `POST /api/smart-follow-up/generate-daily-digest` (optionnel)

Permet de générer le digest à la demande (avant 7h ou premier accès du jour).

**Body :**
```json
{ "date": "2025-01-21" }
```

**Logique :**
1. Récupérer les automation-actions en pending/snoozed, score hot/warm
2. Récupérer les leads tièdes sans réponse depuis 5+ jours
3. Récupérer les RDV du jour (task_type `rdv_confirme`, scheduled_at dans la journée)
4. Créer ou mettre à jour l’entrée `daily-digest` pour cet utilisateur et cette date
5. Si WhatsApp activé : envoyer le message digest via `sendWhatsAppMessage`

### Cron quotidien à 7h

Ajouter un cron (node-schedule ou équivalent) qui appelle la logique de génération pour tous les utilisateurs avec Smart Follow-Up activé et WhatsApp configuré.

---

## Variable d’environnement

Dans le projet Next.js (eclipse-dashboard), ajouter au `.env` :

```
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<token_secret_aleatoire>
```

Ce token est utilisé lors de la validation du webhook Meta (GET).

---

## Configuration Meta

Dans Meta for Developers → Configuration du webhook WhatsApp :

- **URL :** `https://<votre-domaine>/api/webhooks/whatsapp`
- **Token de vérification :** valeur de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Champs à souscrire :** `messages`
