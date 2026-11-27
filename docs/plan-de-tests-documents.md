# Plan de tests — module Documents

La colonne **Résultat** est à remplir après exécution (OK / KO + remarque).

## 1. Tests automatisés

| Commande | Fichier | Base de données | Contenu |
|---|---|---|---|
| `npm run test:unit` (`server/`) | `tests/file.validation.test.js` | non | Liste blanche, signatures, noms de fichiers (traversée de chemin, accents, longueur) |
| `npm run test:docs` (`server/`) | `tests/documents.api.test.js` | **oui** | Envois réels (multipart) vers l'API, fichiers écrits dans un dossier temporaire |
| `npm test` (`client/`) | `test/documents.test.jsx` | non (API simulée) | Page Documents et section Documents d'une candidature |

## 2. Cas de test de l'API (`test:docs`)

| ID | Cas | Résultat attendu | Résultat |
|---|---|---|---|
| DOC-01 | Envoyer un PDF valide | 201 ; pas de `storageKey` dans la réponse ; fichier sur le disque sous un nom UUID ; octets identiques | |
| DOC-02 | Nom avec accents, lié à une candidature | Nom d'affichage conservé ; `applicationId` renseigné | |
| DOC-03 | Envoyer un `.docx` et un `.doc` | 201 | |
| DOC-04 | Nom `../../../etc/passwd.pdf` | Nom nettoyé (`passwd.pdf`) ; le disque ne contient que des noms UUID | |
| DOC-05 | `.exe`, `.html`, `cv.pdf.exe` | 400 « Type de fichier non autorisé » ; aucun fichier écrit | |
| DOC-06 | Exécutable renommé `.pdf` | 400 « contenu ne correspond pas » ; aucun fichier écrit | |
| DOC-07 | Fichier vide | 400 | |
| DOC-08 | Fichier de plus de 5 Mo | 413 ; aucun fichier écrit | |
| DOC-09 | Aucun fichier / mauvais nom de champ | 400 | |
| DOC-10 | `type` absent ou inconnu | 400 | |
| DOC-11 | Candidature d'un autre utilisateur ou inexistante | 400 | |
| DOC-12 | Dépasser la limite de documents | 400 « Limite… » | |
| DOC-13 | Lister avec filtres `applicationId` et `type` | Résultats corrects ; `type` invalide → 400 | |
| DOC-14 | Lister avec un autre utilisateur | Aucun document | |
| DOC-15 | Détail d'une candidature | Contient ses documents sans `storageKey` | |
| DOC-16 | Télécharger son document | 200 ; `attachment` ; `nosniff` ; `no-store` ; bon `Content-Type` | |
| DOC-17 | Télécharger celui d'un autre / inexistant / id invalide | 404 / 404 / 400 | |
| DOC-18 | Accéder au fichier par un chemin statique (`/uploads/…`) | 404 | |
| DOC-19 | Supprimer le document d'un autre utilisateur | 404 ; ligne et fichier intacts | |
| DOC-20 | Supprimer son document | 204 ; ligne et fichier supprimés ; puis 404 | |
| DOC-21 | Ligne en base mais fichier absent du disque | 404 « Fichier introuvable » | |
| DOC-22 | Supprimer la candidature liée | Le document reste, `applicationId = null` | |

## 3. Tests manuels (démonstration)

| ID | Scénario | Résultat attendu | Résultat |
|---|---|---|---|
| DUI-01 | Ouvrir `/documents` sans document | « Aucun document. » | |
| DUI-02 | Envoyer sans choisir de fichier | Message d'erreur, aucune requête | |
| DUI-03 | Choisir un fichier `.exe` puis un PDF de plus de 5 Mo | Messages « Format non accepté » puis « trop volumineux » | |
| DUI-04 | Téléverser un vrai CV (PDF) avec type « CV » | Il apparaît dans la liste, avec sa taille et sa date | |
| DUI-05 | Cliquer sur Télécharger | Le fichier est téléchargé (et non affiché dans la page) | |
| DUI-06 | Téléverser depuis le détail d'une candidature | Le document apparaît dans la section Documents de cette candidature | |
| DUI-07 | Supprimer un document | Confirmation, puis le document disparaît ; le fichier est retiré de `server/uploads/` | |
| DUI-08 | Supprimer une candidature qui a un document | Le document reste dans « Mes documents », sans candidature | |
| DUI-09 | Renommer un fichier `.exe` en `.pdf` et l'envoyer | Refusé par le serveur (« contenu ne correspond pas ») | |
| DUI-10 | `DEV_USER_ID=2` puis ouvrir `/api/documents/1/download` | 404 | |
