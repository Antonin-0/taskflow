# TaskFlow

Mini-application web de gestion de tâches, construite avec l'aide de l'IA.

- **Auteur :** Antonin Soulié (travail individuel)
- **Formation :** Bachelor 1 Cybersécurité · Ynov Campus Toulouse
- **Module :** Outils IA (séances 1 à 3)
- **Fonctionnalité filière :** Cybersécurité (connexion et robustesse des mots de passe)

---

## 1. Cahier des charges

### 1.1 Objectif

TaskFlow permet à un étudiant de noter ses tâches (cours, rendus, révisions), de suivre leur avancement et de les retrouver d'une session à l'autre. L'accès aux tâches est protégé par un écran de connexion avec un mot de passe robuste.

### 1.2 Fonctionnalités de base

| Fonction | Description |
|---|---|
| Créer | Ajouter une tâche (titre, priorité, échéance). Un titre vide est refusé. |
| Afficher | Voir toutes les tâches, avec leur priorité en couleur et leur date. |
| Modifier | Changer le titre, la priorité ou la date d'une tâche existante. |
| Terminer | Cocher une tâche faite : elle apparaît barrée. |
| Supprimer | Retirer une tâche de la liste. |
| Sauvegarder | Retrouver ses tâches après avoir fermé le navigateur (localStorage). |

### 1.3 Fonctionnalité filière : Cybersécurité

| Fonction | Description |
|---|---|
| Écran de connexion | Les tâches ne sont visibles qu'après connexion. |
| Création du compte | Au premier lancement, l'utilisateur crée son compte (un seul compte par navigateur). |
| Robustesse du mot de passe | Au moins 8 caractères, une majuscule, un chiffre et un caractère spécial. |
| Jauge de robustesse | Affiche faible / moyen / fort pendant la saisie. |
| Bonus : blocage | Après 3 échecs de connexion, le compte est bloqué 5 minutes. |

**Règle de la jauge.** On compte les critères remplis parmi les quatre (longueur ≥ 8, majuscule, chiffre, caractère spécial, c'est-à-dire tout caractère qui n'est ni une lettre ni un chiffre) :

- champ vide → la jauge n'affiche rien
- 0 à 2 critères → **faible** (rouge)
- 3 critères → **moyen** (orange)
- 4 critères → **fort** (vert)

Le compte ne peut être créé qu'avec un mot de passe **fort**.

### 1.4 Exigences de sécurité

- Le mot de passe n'est **jamais stocké en clair** : on stocke son empreinte (hash SHA-256 avec un sel aléatoire, via l'API Web Crypto du navigateur).
- Toutes les saisies (titres, descriptions, identifiant) sont affichées comme du **texte** (`textContent`), jamais interprétées comme du HTML (`innerHTML`), pour éviter l'injection de code (XSS).
- À la création d'un compte, les tâches déjà présentes dans le navigateur sont **effacées** : un compte recréé ne peut pas accéder aux tâches de l'ancien.
- La session de connexion est stockée dans `sessionStorage` : fermer le navigateur déconnecte l'utilisateur, alors que les tâches restent dans `localStorage`.
- Les messages d'erreur de connexion ne précisent pas si c'est l'identifiant ou le mot de passe qui est faux.
- Les données relues depuis `localStorage` sont **revalidées** au chargement (valeurs autorisées de la section 3) : une tâche modifiée à la main et devenue invalide est ignorée.
- Aucune donnée personnelle réelle dans l'application (données de test uniquement).

### 1.5 Contraintes techniques

- HTML, CSS et JavaScript, **sans framework** ni bibliothèque externe.
- Sauvegarde dans le navigateur (`localStorage` et `sessionStorage`), **pas de serveur ni de base de données**.
- Outils : VS Code, GitHub, Claude (séance 1), GitHub Copilot et/ou Cursor (séance 2).

### 1.6 Hors périmètre

- Plusieurs comptes sur le même navigateur.
- Mot de passe oublié par email (impossible sans serveur).
- Synchronisation entre appareils.
- Chiffrement des tâches elles-mêmes.

---

## 2. User stories

Format : *En tant que… je veux… afin de…*, avec des critères d'acceptation testables.

### US1 · Connexion (indispensable)

**En tant qu'** utilisateur, **je veux** me connecter avant d'accéder à mes tâches, **afin que** personne d'autre ne puisse les voir sur mon poste.

- Sans connexion, la liste des tâches n'est pas affichée.
- Avec un identifiant ou un mot de passe faux, le message est « Identifiant ou mot de passe incorrect », sans préciser lequel.
- Un bouton « Se déconnecter » ramène à l'écran de connexion.

### US2 · Mot de passe robuste et jauge (indispensable)

**En tant que** nouvel utilisateur, **je veux** que l'application refuse un mot de passe trop faible et m'affiche une jauge pendant que je tape, **afin de** choisir un mot de passe difficile à deviner.

- La jauge se met à jour à chaque caractère tapé (faible / moyen / fort, voir 1.3).
- La liste des critères manquants est affichée sous le champ.
- Le bouton « Créer mon compte » reste désactivé tant que la jauge n'est pas sur « fort ».
- Le mot de passe est enregistré sous forme de hash, jamais en clair.

### US3 · Créer une tâche (indispensable)

**En tant qu'** étudiant, **je veux** ajouter une tâche avec un titre, une priorité et une échéance, **afin de** noter ce que j'ai à faire.

- Un titre vide (ou composé uniquement d'espaces) est refusé avec un message.
- Le titre est limité à 100 caractères.
- La priorité vaut « moyenne » par défaut ; l'échéance est facultative.

### US4 · Afficher les tâches (indispensable)

**En tant qu'** étudiant, **je veux** voir toutes mes tâches avec leur priorité en couleur et leur date, **afin de** repérer rapidement les urgences.

- Haute = rouge, moyenne = orange, basse = vert.
- Les filtres « Toutes », « À faire » et « Terminées » fonctionnent.
- Un texte comme `<b>test</b>` saisi dans un titre s'affiche tel quel, sans être interprété.

### US5 · Modifier une tâche (indispensable)

**En tant qu'** étudiant, **je veux** changer le titre, la priorité ou la date d'une tâche, **afin de** la corriger sans devoir la recréer.

- Les mêmes règles qu'à la création s'appliquent (titre non vide, 100 caractères max).
- Un bouton « Annuler » abandonne la modification.

### US6 · Terminer une tâche (indispensable)

**En tant qu'** étudiant, **je veux** cocher une tâche faite pour qu'elle apparaisse barrée, **afin de** voir ce que j'ai déjà accompli.

- Cocher passe le statut à « terminee », décocher le remet à « a_faire ».

### US7 · Supprimer une tâche (indispensable)

**En tant qu'** étudiant, **je veux** retirer une tâche de la liste, **afin de** garder une liste propre.

- Une confirmation est demandée avant la suppression.
- La tâche supprimée ne réapparaît pas après un rechargement de la page.

### US8 · Sauvegarder (indispensable)

**En tant qu'** étudiant, **je veux** retrouver mes tâches après avoir fermé le navigateur, **afin de** ne rien perdre.

- Chaque ajout, modification, coche ou suppression est enregistré immédiatement dans `localStorage`.
- Au rechargement de la page (après connexion), les tâches réapparaissent à l'identique.

### US9 · Blocage après 3 échecs (bonus)

**En tant qu'** utilisateur, **je veux** que la connexion soit bloquée après 3 tentatives ratées, **afin de** ralentir quelqu'un qui essaie de deviner mon mot de passe.

- Après 3 échecs consécutifs, la connexion est impossible pendant 5 minutes, avec le temps restant affiché.
- Une connexion réussie remet le compteur à zéro.

---

## 3. Architecture

### 3.1 Structure de fichiers

```
taskflow/
├── index.html    → une seule page : section connexion + section tâches
├── style.css     → mise en forme, couleurs des priorités, jauge
├── auth.js       → compte, hash du mot de passe, jauge, connexion, blocage
├── app.js        → création, affichage, modification, filtres, sauvegarde des tâches
├── README.md     → ce document
└── PROMPTS.md    → journal des prompts
```

La logique de sécurité est isolée dans `auth.js` pour être plus facile à relire et à auditer en séance 3.

### 3.2 Modèle de données d'une tâche

```json
{
  "id": 1730300000000,
  "titre": "Réviser le CSS",
  "description": "Flexbox",
  "priorite": "haute",
  "echeance": "2026-11-15",
  "statut": "a_faire"
}
```

| Champ | Type | Valeurs possibles |
|---|---|---|
| `id` | nombre | `Date.now()` au moment de la création (unique, même après suppressions) |
| `titre` | texte | 1 à 100 caractères après suppression des espaces, obligatoire |
| `description` | texte | 0 à 500 caractères, facultatif |
| `priorite` | texte | `"basse"`, `"moyenne"` (par défaut), `"haute"` |
| `echeance` | texte ou `null` | date valide au format `AAAA-MM-JJ`, facultative |
| `statut` | texte | `"a_faire"`, `"terminee"` |

### 3.3 Modèle de données de l'utilisateur

```json
{
  "identifiant": "etudiant.test",
  "motDePasseHash": "9f86d081884c7d65…",
  "sel": "a1b2c3d4e5f6…",
  "tentativesEchouees": 0,
  "bloqueJusqua": null
}
```

| Champ | Rôle | Valeurs possibles |
|---|---|---|
| `identifiant` | nom choisi à la création du compte | texte, 3 à 30 caractères |
| `motDePasseHash` | empreinte SHA-256 du mot de passe + sel (jamais le mot de passe lui-même) | 64 caractères hexadécimaux |
| `sel` | valeur aléatoire générée à la création, pour que deux mots de passe identiques n'aient pas le même hash | 32 caractères hexadécimaux (16 octets) |
| `tentativesEchouees` | compteur d'échecs consécutifs (bonus) | entier de 0 à 3 |
| `bloqueJusqua` | date de fin du blocage (bonus) | nombre en millisecondes, ou `null` |

### 3.4 Stockage dans le navigateur

| Clé | Stockage | Contenu |
|---|---|---|
| `taskflow_utilisateur` | localStorage | l'objet utilisateur |
| `taskflow_taches` | localStorage | le tableau des tâches |
| `taskflow_session` | sessionStorage | `"connecte"` tant que la session est ouverte |

---

## 4. Limites de sécurité connues

Sans serveur, toute la sécurité repose sur le navigateur. Je l'assume et le documente :

- Quelqu'un qui ouvre les outils de développement (F12) peut lire les tâches dans `localStorage` et contourner l'écran de connexion. La connexion protège contre un regard rapide, pas contre un attaquant.
- Le hash protège le mot de passe (il n'est pas lisible), mais pas les tâches, qui restent en clair.
- Le blocage après 3 échecs peut être contourné en vidant le `localStorage`.
- Aucune récupération n'est possible en cas d'oubli du mot de passe : la seule solution est une réinitialisation qui efface toutes les données.
- SHA-256 est un hash rapide ; une vraie application utiliserait un algorithme lent conçu pour les mots de passe (bcrypt, Argon2), côté serveur.

---

## 5. Planning de la séance 2 (3 sprints)

| Sprint | Contenu | User stories |
|---|---|---|
| 1 | Page, formulaire d'ajout, affichage et filtres, coche, suppression, sauvegarde | US3, US4, US6, US7, US8 |
| 2 | Création de compte, jauge, connexion, déconnexion | US1, US2 |
| 3 | Modification, revalidation des données au chargement, blocage bonus, finitions | US5, US9 |

Un commit par sprint.

---

## 6. Utilisation de l'IA

Toutes les étapes de cadrage ont été réalisées avec Claude. Les prompts, ce qui a été gardé, modifié ou rejeté, et pourquoi, sont dans [PROMPTS.md](PROMPTS.md).
