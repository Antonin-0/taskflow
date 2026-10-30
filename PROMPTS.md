# Journal des prompts · TaskFlow

Séance 1 · 30/10/2026 · Outil : Claude · Travail individuel
Règle suivie : l'IA propose, je décide.

---

## Prompt 1 · Premier jet des user stories (Claude)

**Objectif :** obtenir une première base de user stories couvrant les fonctions de base et ma fonctionnalité filière.

**Contexte fourni :** le support de cours de la séance 1 en pièce jointe (description de TaskFlow, fonctions attendues, cadre technique).

**Prompt :**
> Tu es un product owner qui aide des étudiants de Bachelor 1 Cybersécurité. Nous créons TaskFlow, une application web de gestion de tâches en HTML, CSS et JavaScript sans framework, sans serveur, avec sauvegarde en localStorage. Le support de cours ci-joint décrit les fonctions attendues. Notre fonctionnalité filière est la Cybersécurité : écran de connexion, contrôle de robustesse du mot de passe (8 caractères, majuscule, chiffre, caractère spécial), jauge faible / moyen / fort, et en bonus un blocage après 3 échecs. Propose entre 5 et 8 user stories au format « En tant que… je veux… afin de… », couvrant les fonctions de base et notre fonctionnalité filière. Pas de code. Réponds sous forme de liste numérotée, puis liste les hypothèses que tu as faites.

**Analyse du prompt avec la grille des 6 briques :**

| Brique | Présente ? | Contenu |
|---|---|---|
| Rôle | Oui | Product owner qui aide des étudiants de B1 Cybersécurité |
| Contexte | Oui | Projet TaskFlow, technologies, absence de serveur, support de cours joint |
| Tâche | Oui | « Propose entre 5 et 8 user stories » |
| Contraintes | Oui | Nombre de stories, fonctionnalité filière détaillée, pas de code |
| Format | Oui | Format « En tant que… je veux… afin de… », liste numérotée, hypothèses |
| Exemples | Non | Aucun exemple de story fourni |

**Résultat :** 8 user stories au bon format, couvrant les 6 fonctions de base, la connexion et la robustesse du mot de passe avec la jauge. Hypothèses listées par l'IA : un seul compte par navigateur ; sans serveur, la connexion ne protège pas contre quelqu'un qui ouvre les outils de développement ; échéance facultative et priorité sur trois niveaux ; blocage après 3 échecs laissé en bonus, hors des 8 stories ; données de test uniquement.

**Gardé :** les 8 stories, dont le regroupement fait par l'IA de la robustesse du mot de passe et de la jauge dans une seule story (les deux se testent sur le même écran) ; les hypothèses, reprises dans le cahier des charges (un seul compte par navigateur) et dans la section 4 du README (limites de sécurité).

**Modifié :** j'ai ajouté le blocage après 3 échecs comme story bonus (US9), avec une durée de blocage de 5 minutes que j'ai fixée moi-même.

**Pourquoi :** demander les hypothèses a fait ressortir des choix implicites (nombre de comptes, limites de la connexion sans serveur) que j'ai validés moi-même. Il manquait encore des critères d'acceptation testables, d'où le prompt 2.

**Ce que j'en retiens :** sans exemple de story, l'IA a choisi seule le niveau de détail ; au prompt 2, je précise ce que j'attends (2 à 3 critères testables par story).

---

## Prompt 2 · Critères d'acceptation et règle de la jauge (Claude)

**Prompt :** (envoyé dans la même conversation, les 8 user stories du prompt 1 étaient donc dans le contexte)
> Tu es un développeur web spécialisé en sécurité qui aide des étudiants de 1re année. Nous créons TaskFlow, une app de tâches en HTML, CSS et JavaScript sans framework, sans serveur, avec sauvegarde en localStorage. Reprends les 8 user stories ci-dessous et ajoute 2 à 3 critères d'acceptation testables pour chacune. Définis précisément quand la jauge de mot de passe affiche faible, moyen ou fort. Pas de code. Réponds sous forme de liste.

**Résultat :**
- Une règle de jauge précise : 4 critères (8 caractères, majuscule, chiffre, caractère spécial) ; rien si le champ est vide, faible de 0 à 2 critères, moyen à 3, fort à 4 ; création du compte possible uniquement en « fort ».
- 2 à 4 critères d'acceptation par story, par exemple : titre vide ou composé d'espaces refusé, titre limité à 100 caractères, confirmation avant suppression, enregistrement immédiat de chaque action.
- Des critères orientés sécurité : message d'erreur de connexion qui ne précise pas si l'identifiant ou le mot de passe est faux, mot de passe jamais enregistré en clair, titre contenant du HTML affiché tel quel.

**Gardé :** l'ensemble des critères et la règle de la jauge, reportés dans la section 2 du README.

**Modifié / rejeté :** rien.

**Pourquoi :** chaque critère est vérifiable à la main en séance 2, et la règle de la jauge colle exactement au cahier des charges (les 4 critères sont exigés pour créer un compte). Les critères de sécurité étaient pertinents pour ma filière.

**Ce que j'en retiens :** l'IA dit « jamais enregistré en clair » sans dire comment. Le prompt 3 lui demande de critiquer les risques et de proposer des parades concrètes.

---

## Prompt 3 · Auto-critique côté sécurité (Claude)

**Prompt :**
> Qu'est-ce qui pourrait être faux ou risqué côté sécurité dans ces user stories, sachant qu'il n'y a pas de serveur ? Classe les risques du plus grave au moins grave et propose une parade réaliste pour notre niveau.

**Résultat :** 7 risques classés du plus grave au moins grave :
1. « Jamais enregistré en clair » ne dit pas comment : une implémentation naïve stockerait le mot de passe tel quel ou en base64 → hash SHA-256 + sel aléatoire (API Web Crypto, sans bibliothèque).
2. Connexion contournable avec F12 (tâches lisibles, indicateur de session modifiable) → pas de vraie parade sans serveur ; chiffrer les tâches (AES, clé dérivée du mot de passe) est possible mais complexe ; à documenter.
3. XSS : le critère ne couvre que le titre → règle unique : toujours `textContent`, jamais `innerHTML` pour une saisie.
4. Recréation de compte : si l'utilisateur est supprimé du localStorage, un nouveau compte verrait les anciennes tâches → effacer les tâches présentes à la création d'un compte.
5. Session ouverte indéfiniment si stockée dans localStorage → `sessionStorage` + bouton de déconnexion.
6. Blocage après 3 échecs contournable en remettant le compteur à zéro → pas de parade sans serveur ; à documenter.
7. Aucune récupération en cas d'oubli (un « mot de passe oublié par email » est impossible sans serveur) → seule une réinitialisation qui efface toutes les données est possible ; à documenter.

**Gardé :** les parades 1, 3, 4 et 5, ajoutées aux exigences de sécurité du README (section 1.4). Les risques 2, 6 et 7 sont documentés dans la section « Limites de sécurité connues ».

**Rejeté :**
- le chiffrement des tâches (risque 2) : trop complexe pour mon niveau (gestion de la clé dérivée du mot de passe) et hors du cahier des charges ;
- une story « mot de passe oublié par email » (risque 7) : impossible sans serveur.

**Pourquoi :** je garde ce qui améliore vraiment la sécurité et reste faisable en HTML/CSS/JS sans bibliothèque. Le risque 4 est celui que je n'avais pas vu du tout : sans cette parade, la connexion ne servirait à rien. Pour le reste, je préfère documenter honnêtement les limites plutôt que de prétendre à une sécurité qu'une app sans serveur ne peut pas offrir.

---

## Prompt 4 · Structure de fichiers (Claude)

**Prompt :**
> À partir de ces user stories, propose une structure de fichiers pour TaskFlow. Contraintes : HTML, CSS et JavaScript sans framework ni bibliothèque, pas de serveur. Explique chaque choix en une phrase.

**Résultat :** 6 fichiers à la racine : `index.html` (une seule page, sections connexion et tâches affichées ou masquées), `style.css`, `auth.js` (compte, hash, jauge, connexion, blocage), `app.js` (tâches), `README.md` et `PROMPTS.md`. Les scripts sont chargés en bas de page, `auth.js` avant `app.js`, pour que la session soit vérifiée en premier. L'IA mentionne et écarte une page `login.html` séparée (redirections et vérification de session sur chaque page, sans gain réel sans serveur).

**Gardé :** la structure complète, reprise dans la section 3.1 du README.

**Modifié / rejeté :** rien.

**Pourquoi :** la séparation `auth.js` / `app.js` correspond à ma fonctionnalité filière : toute la sécurité est au même endroit, ce qui la rend plus facile à relire et à auditer en séance 3. C'est un changement par rapport à la structure du support de cours (un seul `app.js`), et l'IA l'a justifié. Une seule page HTML reste plus simple à mon niveau.

---

## Prompt 5 · Critique du modèle de données (Claude)

**Prompt :** (avec le modèle de tâche du support de cours)
> Voici le modèle de données d'une tâche : { "id": 1, "titre": "Réviser le CSS", "description": "Flexbox", "priorite": "haute", "echeance": "2026-11-15", "statut": "a_faire" }. Qu'est-ce qui manque à ce modèle pour notre fonctionnalité filière Cybersécurité ? Précise aussi les valeurs autorisées pour chaque champ.

**Résultat :** le modèle de tâche n'a pas besoin de champ de sécurité ; ce qui manque, c'est ce qui entoure la connexion :
1. un objet utilisateur (identifiant, hash du mot de passe, sel, compteur d'échecs, date de fin de blocage) ;
2. les clés de stockage (`taskflow_utilisateur` et `taskflow_taches` en localStorage, `taskflow_session` en sessionStorage) ;
3. un id unique : `"id": 1` en dur crée des doublons, `Date.now()` ou `crypto.randomUUID()` à la place ;
4. une revalidation des données au chargement, car le localStorage peut être modifié à la main avec F12.

Valeurs autorisées précisées pour chaque champ (par exemple : titre de 1 à 100 caractères, description de 0 à 500, hash de 64 caractères hexadécimaux, compteur d'échecs de 0 à 3). L'IA précise qu'un champ `proprietaire` sur chaque tâche est inutile, puisqu'il n'y a qu'un compte par navigateur et que les tâches sont effacées à la création d'un compte.

**Gardé :** l'objet utilisateur, les clés de stockage, la revalidation au chargement et toutes les valeurs autorisées, reportés dans les sections 1.4 et 3 du README.

**Modifié :** pour l'id, je choisis `Date.now()` plutôt que `crypto.randomUUID()`.

**Rejeté :** rien.

**Pourquoi :** `Date.now()` suffit pour une app où l'utilisateur crée les tâches une par une, et un nombre est plus lisible qu'un UUID quand on inspecte le localStorage. La revalidation au chargement est le point que je retiens le plus : c'est la conséquence directe du risque « données modifiables avec F12 » relevé au prompt 3.

---

# Séance 2 · Développement

## Prompt 6 · Sprint 1 : tâches et sauvegarde (Claude)

**Prompt :**
> Tu es un développeur web qui aide un étudiant de B1 Cybersécurité. À partir du README de TaskFlow (même conversation), réalise le sprint 1 : index.html, style.css et app.js, avec l'ajout d'une tâche, l'affichage avec priorité en couleur et filtres, la coche, la suppression avec confirmation et la sauvegarde en localStorage (US3, US4, US6, US7, US8). Respecte les valeurs autorisées de la section 3.2 et affiche toutes les saisies avec textContent. Pas de framework ni de bibliothèque. Commente le code en français pour un débutant.

**Résultat :** `index.html`, `style.css` et `app.js` couvrant US3, US4, US6, US7 et US8. Choix signalés par l'IA :
- toute la liste est construite avec `createElement` et `textContent`, et vidée avec `replaceChildren()` : aucun `innerHTML` dans le code ;
- titre de 1 à 100 caractères après `trim()`, description de 0 à 500, priorité et date vérifiées avant l'ajout (une date inexistante comme le 31 février est refusée) ;
- id créé avec `Date.now()`, augmenté de 1 en cas de doublon ;
- un champ « Description (facultative) » ajouté au formulaire, puisqu'il fait partie du modèle de données ;
- la lecture du localStorage est protégée par un `try/catch` : si les données ont été abîmées, l'application repart d'une liste vide au lieu de planter. La vérification complète de chaque tâche relue reste prévue au sprint 3.

**Vérification :** 22 tests automatiques passés (ajout, titre vide refusé, titre de plus de 100 caractères refusé, date invalide refusée, titre contenant du HTML affiché en texte, coche, filtres, suppression annulée et confirmée, rechargement, localStorage abîmé).

**Gardé / modifié / rejeté :** à compléter après mon test dans le navigateur.
