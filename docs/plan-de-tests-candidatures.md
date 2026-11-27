# Plan de tests — module Candidatures

La colonne **Résultat** est à remplir après exécution (OK / KO + remarque). Ne cocher que ce qui a réellement été exécuté.

## 1. Tests automatisés

| Commande | Dossier | Base de données | Contenu |
|---|---|---|---|
| `npm run test:unit` (dans `server/`) | `server/tests/applications.validator.test.js` | non | Validation des entrées : conversions, valeurs vides, champs inconnus, URL, liste blanche du tri |
| `npm run test:api` (dans `server/`) | `server/tests/applications.api.test.js` | **oui** (PostgreSQL) | Scénarios complets de l'API ci-dessous ; crée ses propres utilisateurs `@careertrack.test` et les supprime à la fin |
| `npm test` (dans `client/`) | `client/test/app.test.jsx` | non (API simulée) | Pages React : liste, filtres, formulaire, détail, suppression |

## 2. Cas de test de l'API (automatisés, `test:api`)

| ID | Cas | Résultat attendu | Résultat |
|---|---|---|---|
| API-01 | Créer une candidature valide | 201, statut `TO_APPLY`, 1 entrée d'historique (`null → TO_APPLY`) | |
| API-02 | Créer avec un `userId` dans le corps | Ignoré : le propriétaire est l'utilisateur connecté | |
| API-03 | Créer avec un statut initial `APPLIED` | L'historique commence par `APPLIED` | |
| API-04 | Poste trop court | 400 + erreur sur le champ `jobTitle` | |
| API-05 | Entreprise d'un autre utilisateur | 400 | |
| API-06 | Entreprise inexistante | 400 | |
| API-07 | JSON mal formé | 400 « JSON invalide » | |
| API-08 | Détail d'une candidature | 200 avec entreprise et historique ordonné | |
| API-09 | Modifier un champ autre que le statut | Aucune entrée d'historique ajoutée | |
| API-10 | Envoyer le même statut | Aucune entrée ajoutée | |
| API-11 | Changer le statut deux fois | Une entrée par changement, dans l'ordre | |
| API-12 | Effacer `followUpDate` avec `""` | Champ à `null` | |
| API-13 | Corps vide, statut inconnu, entreprise étrangère (PATCH) | 400 | |
| API-14 | Identifiant inexistant / mal formé | 404 / 400 | |
| API-15 | Utilisateur B : GET, PATCH, DELETE sur la candidature de A | 404 pour chacun | |
| API-16 | Après ces tentatives | Données de A inchangées | |
| API-17 | Liste de l'utilisateur B | Aucune candidature de A (`total = 0`) | |
| API-18 | Filtrer par statut, par type | Seules les candidatures correspondantes | |
| API-19 | Rechercher « zeta », « DATA », « alpha » | Entreprise **ou** poste, sans tenir compte de la casse | |
| API-20 | Filtrer par dates (bornes incluses) | Résultats corrects, y compris `from = to` | |
| API-21 | Combiner type + recherche + statut | Intersection des critères | |
| API-22 | Trier par date et par entreprise (asc/desc) | Ordre correct, égalités départagées par `id` | |
| API-23 | Paginer 5 éléments, `limit=2` | Pages de 2, 2 et 1 éléments, sans trou ni doublon ; page 4 vide | |
| API-24 | `limit=500`, `page=0`, `sort=password`, statut inconnu, date invalide | 400 pour chacun | |
| API-25 | Supprimer | 204, historique supprimé en cascade, puis 404 | |
| API-26 | Supprimer une entreprise qui a des candidatures | Refusé par la base (`RESTRICT`) | |

## 3. Tests manuels de l'interface (démonstration)

Préparation : `npm run seed` puis `npm run seed:demo` (24 candidatures), serveur et client lancés.

| ID | Scénario | Résultat attendu | Résultat |
|---|---|---|---|
| UI-01 | Ouvrir `/applications` sans données | Message « Vous n'avez encore aucune candidature » | |
| UI-02 | Envoyer le formulaire vide | Erreurs sous les champs, aucune requête envoyée | |
| UI-03 | Créer une candidature valide | Redirection vers le détail, 1 entrée dans la chronologie | |
| UI-04 | Changer le statut sur la page de détail | Nouvelle entrée « ancien → nouveau » dans la chronologie | |
| UI-05 | Modifier une candidature | Les champs sont préremplis ; les changements sont enregistrés | |
| UI-06 | Appliquer des filtres puis rafraîchir la page | Les filtres sont conservés (ils sont dans l'URL) | |
| UI-07 | Taper dans la recherche | Une seule requête après une courte pause | |
| UI-08 | Ouvrir `/applications?limit=5` | Pagination fonctionnelle, boutons Précédent/Suivant corrects | |
| UI-09 | Supprimer | Fenêtre de confirmation ; Échap annule ; confirmer supprime | |
| UI-10 | Largeurs 375 px, 768 px, 1280 px (F12) | Mise en page utilisable ; le tableau défile dans son cadre | |
| UI-11 | Arrêter le serveur puis recharger | Message « Serveur injoignable » | |
| UI-12 | `DEV_USER_ID=2` | Liste vide ; `/applications/1` affiche « Candidature introuvable » | |
| UI-13 | Saisir `javascript:alert(1)` dans « Lien de l'offre » | Refusé par le formulaire ; l'API le refuse aussi (400) | |
