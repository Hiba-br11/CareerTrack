# API des candidatures — `/api/applications`

Module : gestion des candidatures (Omar). Toutes les routes sont **privées** : l'utilisateur est identifié côté serveur (`req.user.id`) et chaque requête est limitée à ses propres données.

> Authentification : en attendant le module de connexion (Hiba), l'utilisateur est simulé par `DEV_USER_ID`. Une fois le JWT en place, une requête sans session valide recevra **401**.

## Valeurs autorisées

| Champ | Valeurs (API) | Affichage |
|---|---|---|
| `status` | `TO_APPLY`, `APPLIED`, `INTERVIEW`, `ACCEPTED`, `REJECTED` | À postuler, Postulée, Entretien planifié, Acceptée, Refusée |
| `applicationType` | `PFE`, `SUMMER_INTERNSHIP`, `EMPLOYMENT` | Stage PFE, Stage d'été, Emploi |

Les dates sont envoyées au format `YYYY-MM-DD` et renvoyées en ISO 8601 (`2026-11-19T00:00:00.000Z`).

## Résumé des routes

| Méthode | Route | Rôle | Succès |
|---|---|---|---|
| GET | `/api/applications` | Liste avec recherche, filtres, tri, pagination | 200 |
| POST | `/api/applications` | Créer une candidature | 201 |
| GET | `/api/applications/:id` | Détail + entreprise + historique | 200 |
| PATCH | `/api/applications/:id` | Modifier (partiel) | 200 |
| DELETE | `/api/applications/:id` | Supprimer (l'historique est supprimé en cascade) | 204 |

## GET `/api/applications`

Paramètres de requête, tous optionnels :

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `search` | texte (≤ 100) | — | Cherche dans le nom de l'entreprise **ou** l'intitulé du poste, sans tenir compte de la casse |
| `status` | enum | — | Filtre par statut |
| `type` | enum | — | Filtre par type de candidature |
| `from`, `to` | date | — | Date de candidature comprise entre les deux, bornes incluses |
| `sort` | `date_desc` \| `date_asc` \| `company_asc` \| `company_desc` | `date_desc` | Tri (liste blanche) ; à égalité, le plus récent (`id`) d'abord |
| `page` | entier ≥ 1 | 1 | Page demandée |
| `limit` | entier 1–50 | 10 | Éléments par page |

Les valeurs vides (`status=`) sont ignorées. Le filtrage, le tri et la pagination sont exécutés **par la base de données**.

Réponse `200` :

```json
{
  "data": [
    {
      "id": 12,
      "userId": 1,
      "companyId": 3,
      "jobTitle": "PFE Computer Vision",
      "applicationType": "PFE",
      "applicationDate": "2026-11-19T00:00:00.000Z",
      "status": "APPLIED",
      "offerUrl": "https://careers.example.com/jobs/1",
      "description": null,
      "notes": null,
      "followUpDate": null,
      "createdAt": "2026-11-19T09:12:00.000Z",
      "updatedAt": "2026-11-19T09:12:00.000Z",
      "company": { "id": 3, "name": "Instadeep" }
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

## POST `/api/applications`

| Champ | Obligatoire | Règle |
|---|---|---|
| `companyId` | oui | entier > 0, entreprise **appartenant à l'utilisateur** |
| `jobTitle` | oui | 2 à 150 caractères (espaces retirés) |
| `applicationType` | oui | enum |
| `applicationDate` | oui | date valide |
| `status` | non | enum, `TO_APPLY` par défaut |
| `offerUrl` | non | URL commençant par `http://` ou `https://`, ≤ 500 |
| `description`, `notes` | non | ≤ 5000 caractères |
| `followUpDate` | non | date valide |

Les champs facultatifs envoyés vides (`""`) sont enregistrés à `null`. Les champs inconnus (par exemple `userId`) sont **ignorés** : le propriétaire est toujours l'utilisateur connecté.

Une première entrée d'historique (`oldStatus: null`) est créée dans la même transaction.

Réponse `201` : la candidature créée (avec `company: { id, name }`).

## GET `/api/applications/:id`

Réponse `200` : la candidature, l'entreprise complète, l'historique du plus ancien au plus récent et la liste `documents` liés (voir `api-documents.md` ; sans nom de stockage).

```json
{
  "id": 12,
  "jobTitle": "PFE Computer Vision",
  "status": "INTERVIEW",
  "company": { "id": 3, "name": "Instadeep", "sector": "Artificial intelligence", "website": null },
  "history": [
    { "id": 1, "applicationId": 12, "oldStatus": null,        "newStatus": "TO_APPLY",  "changedAt": "2026-11-19T09:12:00.000Z" },
    { "id": 2, "applicationId": 12, "oldStatus": "TO_APPLY",  "newStatus": "APPLIED",   "changedAt": "2026-11-20T08:00:00.000Z" },
    { "id": 3, "applicationId": 12, "oldStatus": "APPLIED",   "newStatus": "INTERVIEW", "changedAt": "2026-11-25T14:30:00.000Z" }
  ]
}
```

(les autres champs de la candidature sont omis ici pour la lisibilité)

## PATCH `/api/applications/:id`

Mêmes champs que la création, **tous facultatifs**, avec au moins un champ. Un champ obligatoire ne peut pas être mis à `null` ; un champ facultatif peut être effacé avec `null` ou `""`.

Si `status` change, une entrée est ajoutée à l'historique dans la **même transaction** que la modification. Envoyer le même statut ne crée aucune entrée.

Réponse `200` : la candidature mise à jour.

## DELETE `/api/applications/:id`

Réponse `204` sans corps. L'historique est supprimé en cascade par la base de données. Les documents liés ne sont pas supprimés : ils restent dans « Mes documents » (`applicationId` passe à `null`).

## Erreurs

| Code | Cas | Corps |
|---|---|---|
| 400 | Données invalides | `{ "message": "Données invalides", "errors": [{ "field": "jobTitle", "message": "…" }] }` |
| 400 | Entreprise inexistante ou appartenant à un autre utilisateur | `{ "message": "Entreprise introuvable" }` |
| 400 | JSON mal formé | `{ "message": "JSON invalide" }` |
| 401 | Non connecté *(à venir avec l'authentification)* | — |
| 404 | Candidature inexistante **ou appartenant à un autre utilisateur** | `{ "message": "Candidature introuvable" }` |
| 500 | Erreur interne | `{ "message": "Erreur interne du serveur" }` (le détail reste dans les logs serveur) |

On renvoie volontairement **404 et non 403** pour la candidature d'un autre utilisateur : l'API ne révèle pas que cet identifiant existe.

## Exemples (Git Bash)

```bash
curl -X POST http://localhost:5000/api/applications -H "Content-Type: application/json" \
  -d '{"companyId":1,"jobTitle":"PFE Computer Vision","applicationType":"PFE","applicationDate":"2026-11-19"}'

curl "http://localhost:5000/api/applications?search=pfe&status=APPLIED&sort=company_asc&page=1&limit=5"

curl -X PATCH http://localhost:5000/api/applications/1 -H "Content-Type: application/json" -d '{"status":"INTERVIEW"}'

curl -X DELETE http://localhost:5000/api/applications/1
```
