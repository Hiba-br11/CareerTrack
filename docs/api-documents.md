# API des documents — `/api/documents`

Module : téléversement de CV, lettres de motivation et autres pièces (fonctionnalité complémentaire, Omar). Toutes les routes sont **privées** et limitées aux documents de l'utilisateur connecté.

## Routes

| Méthode | Route | Rôle | Succès |
|---|---|---|---|
| POST | `/api/documents` | Téléverser un fichier (`multipart/form-data`) | 201 |
| GET | `/api/documents` | Lister ses documents (`?applicationId=`, `?type=`) | 200 |
| GET | `/api/documents/:id/download` | Télécharger le fichier | 200 |
| DELETE | `/api/documents/:id` | Supprimer le document et le fichier | 204 |

Le détail d'une candidature (`GET /api/applications/:id`) contient aussi la liste `documents` de cette candidature.

## POST `/api/documents`

Formulaire `multipart/form-data` :

| Champ | Obligatoire | Règle |
|---|---|---|
| `file` | oui | un seul fichier, champ nommé exactement `file` |
| `type` | oui | `CV`, `COVER_LETTER` ou `OTHER` |
| `applicationId` | non | candidature **appartenant à l'utilisateur** |

Règles sur le fichier :

- extensions autorisées : `.pdf`, `.docx`, `.doc` (liste blanche, la **dernière** extension compte : `cv.pdf.exe` est refusé) ;
- le **contenu** doit correspondre à l'extension (signature du fichier) : un exécutable renommé en `.pdf` est refusé ;
- taille maximale **5 Mo**, fichier non vide ;
- au plus **50 documents** par utilisateur (réglable avec `MAX_DOCUMENTS_PER_USER`).

Réponse `201` (le nom stocké sur le disque n'est jamais renvoyé) :

```json
{
  "id": 7,
  "applicationId": 12,
  "fileName": "CV_Élève.pdf",
  "fileType": "CV",
  "mimeType": "application/pdf",
  "sizeBytes": 183422,
  "uploadedAt": "2026-11-26T10:15:00.000Z",
  "application": { "id": 12, "jobTitle": "PFE Computer Vision" }
}
```

## GET `/api/documents`

Tableau de documents (même forme que ci-dessus), du plus récent au plus ancien. Paramètres facultatifs : `applicationId` (entier), `type` (enum). Les valeurs vides sont ignorées.

## GET `/api/documents/:id/download`

Renvoie le fichier avec `Content-Disposition: attachment`, le `Content-Type` détecté à l'envoi, `X-Content-Type-Options: nosniff` et `Cache-Control: private, no-store`. Le navigateur télécharge le fichier au lieu de l'afficher dans la page.

## DELETE `/api/documents/:id`

Supprime d'abord la ligne en base, puis le fichier sur le disque. Réponse `204`.

## Erreurs

| Code | Cas |
|---|---|
| 400 | Champ `type` absent ou inconnu ; fichier absent, vide, d'un type non autorisé ou dont le contenu ne correspond pas à l'extension ; mauvais nom de champ ; limite de 50 documents atteinte ; candidature introuvable ou appartenant à un autre utilisateur |
| 404 | Document inexistant **ou appartenant à un autre utilisateur** ; fichier absent du disque |
| 413 | Fichier de plus de 5 Mo |
| 401 | Non connecté *(à venir avec l'authentification)* |

## Suppression d'une candidature

Les documents liés ne sont **pas** supprimés : ils restent dans « Mes documents » avec `applicationId = null` (`ON DELETE SET NULL`). L'utilisateur ne perd donc pas son CV en supprimant une candidature.

## Mesures de sécurité (pour le rapport)

| Risque | Mesure |
|---|---|
| Fichier dangereux déguisé (`virus.exe` renommé en `.pdf`) | Liste blanche d'extensions **et** vérification de la signature du contenu |
| Traversée de chemin (`../../etc/passwd`) | Le nom du fichier envoyé n'atteint jamais le système de fichiers : le fichier est écrit sous un nom aléatoire (UUID) ; le nom d'origine ne sert qu'à l'affichage et est nettoyé |
| Écrasement de fichier | Écriture en mode « création seulement » avec un nom aléatoire unique |
| Accès aux documents d'autrui (IDOR) | Toutes les requêtes filtrent sur le propriétaire ; réponse 404 identique pour « inexistant » et « pas à vous » |
| Exposition publique des fichiers | Dossier `uploads/` hors de toute route statique ; téléchargement uniquement via la route authentifiée |
| Exécution de contenu dans le navigateur | `Content-Disposition: attachment` + `nosniff` ; les noms de fichiers sont affichés comme du texte par React |
| Saturation du disque ou de la mémoire | 5 Mo par fichier, 1 fichier par requête, 50 documents par utilisateur ; rien n'est écrit tant que le contenu n'est pas validé |
| Fichier orphelin | Si l'insertion en base échoue, le fichier est supprimé ; à la suppression, la base est mise à jour avant le disque |
| Fuite d'informations internes | Le nom de stockage n'est jamais renvoyé par l'API |

## Limites connues

- Aucun **antivirus** : le contenu est vérifié par sa signature, pas analysé en profondeur.
- La vérification `.docx` est une heuristique (archive zip contenant une entrée `word/`), pas une analyse complète du document.
- Les fichiers ne sont **pas chiffrés** sur le disque.
- Pas de limitation du nombre de requêtes d'envoi par IP.
- La suppression d'un compte supprime les lignes en base (cascade) mais **pas** les fichiers : à traiter avec la gestion des comptes (administrateur).
