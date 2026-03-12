# Champs à ajouter dans Strapi pour les instructions IA

L'erreur `ValidationError: Invalid key ai_instruction` survient car le content-type `automation-settings` ne possède pas encore les champs pour les instructions IA.

## Solution : ajouter les champs dans Strapi

### Via l'admin Strapi (Content-Type Builder)

1. Ouvrir **Content-Type Builder** → **Automation Settings**
2. Ajouter deux nouveaux champs :

| Nom API          | Type  | Paramètres                              |
|------------------|-------|-----------------------------------------|
| `ai_instruction` | Text  | Type: Long text, Required: false        |
| `ai_instruction_history` | JSON | Required: false                |

3. Sauvegarder et redémarrer Strapi.

### Via les fichiers de schema (Strapi v5)

Si vous configurez Strapi via les fichiers, ajoutez dans `src/api/automation-setting/content-types/automation-setting/schema.json` :

```json
{
  "attributes": {
    "ai_instruction": {
      "type": "text"
    },
    "ai_instruction_history": {
      "type": "json"
    }
  }
}
```

(À fusionner avec les attributs existants du schema.)

### Via les fichiers de schema (Strapi v4)

Dans `api/automation-setting/models/automation-setting.settings.json`, ajoutez :

```json
{
  "attributes": {
    "ai_instruction": {
      "type": "text"
    },
    "ai_instruction_history": {
      "type": "json"
    }
  }
}
```

---

Après avoir ajouté ces champs, l'enregistrement des instructions IA dans Smart Follow-Up fonctionnera correctement.
