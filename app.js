// =============================================================
// TaskFlow · app.js · Sprints 1, 2 et 3
// Gestion des tâches : ajout, affichage, filtres, coche,
// suppression et sauvegarde dans le navigateur (localStorage).
//
// Depuis le sprint 2, ce fichier n'affiche plus rien tout seul :
// c'est auth.js qui appelle ouvrirTaches() une fois l'utilisateur connecté.
//
// Règle de sécurité appliquée partout (README, section 1.4) :
// tout texte saisi par l'utilisateur est affiché avec textContent,
// jamais avec innerHTML, pour éviter l'injection de code (XSS).
// =============================================================


// ----- Constantes (README, sections 3.2 et 3.4) -----

// Nom sous lequel les tâches sont enregistrées dans localStorage
const CLE_TACHES = "taskflow_taches";

// Valeurs autorisées pour une tâche
const PRIORITES = ["basse", "moyenne", "haute"];
const STATUTS = ["a_faire", "terminee"];
const TITRE_MAX = 100;
const DESCRIPTION_MAX = 500;

// Texte affiché à l'écran pour chaque priorité
const LIBELLES_PRIORITE = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute"
};


// ----- Récupération des éléments de la page -----

const formulaire = document.getElementById("formulaire-ajout");
const champTitre = document.getElementById("champ-titre");
const champDescription = document.getElementById("champ-description");
const champPriorite = document.getElementById("champ-priorite");
const champEcheance = document.getElementById("champ-echeance");
const messageErreur = document.getElementById("message-erreur");
const liste = document.getElementById("liste-taches");
const messageListeVide = document.getElementById("liste-vide");
const boutonsFiltre = document.querySelectorAll(".filtre");


// ----- État de l'application -----

// Le tableau de toutes les tâches. Vide tant que personne n'est connecté :
// il est rempli par ouvrirTaches(), appelée par auth.js après la connexion.
let taches = [];

// Le filtre choisi : "toutes", "a_faire" ou "terminee"
let filtreActif = "toutes";

// Identifiant de la tâche en cours de modification, ou null (sprint 3)
let idEnEdition = null;


// =============================================================
// Sauvegarde dans le navigateur (US8)
// =============================================================

// Revalidation d'une tâche relue depuis localStorage (sprint 3, README section 1.4).
// localStorage peut être modifié à la main avec F12 : on ne fait donc jamais
// confiance à ce qu'on y relit. Chaque tâche est revérifiée avec les valeurs
// autorisées de la section 3.2. Renvoie une tâche propre, ou null si elle est invalide.
function nettoyerTache(donnee) {
  // Doit être un objet (pas null, pas un tableau, pas un simple texte)
  if (typeof donnee !== "object" || donnee === null || Array.isArray(donnee)) {
    return null;
  }
  // id : nombre entier positif (créé avec Date.now())
  if (!Number.isInteger(donnee.id) || donnee.id <= 0) {
    return null;
  }
  // titre et description : du texte (la description peut être absente)
  const description = donnee.description === undefined ? "" : donnee.description;
  if (typeof donnee.titre !== "string" || typeof description !== "string") {
    return null;
  }
  // échéance : null ou un texte (sa validité est vérifiée juste après)
  const echeance = donnee.echeance === undefined ? null : donnee.echeance;
  if (echeance !== null && typeof echeance !== "string") {
    return null;
  }
  // Mêmes règles qu'à la saisie : titre, description, priorité, date
  const titre = donnee.titre.trim();
  if (verifierSaisie(titre, description.trim(), donnee.priorite, echeance) !== "") {
    return null;
  }
  // statut : "a_faire" ou "terminee" uniquement
  if (!STATUTS.includes(donnee.statut)) {
    return null;
  }

  // On reconstruit un objet neuf avec seulement les 6 champs du modèle :
  // tout champ en trop, ajouté à la main, est ainsi abandonné
  return {
    id: donnee.id,
    titre: titre,
    description: description.trim(),
    priorite: donnee.priorite,
    echeance: echeance,
    statut: donnee.statut
  };
}

// Relit les tâches enregistrées et ne garde que les tâches valides.
// Renvoie { taches: [...], ignorees: nombre de tâches écartées }.
function chargerTaches() {
  const texte = localStorage.getItem(CLE_TACHES);
  if (texte === null) {
    return { taches: [], ignorees: 0 };
  }

  // JSON.parse provoque une erreur si le contenu a été abîmé.
  // Le try/catch évite que toute l'application s'arrête.
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch (erreur) {
    return { taches: [], ignorees: 1 };
  }
  if (!Array.isArray(donnees)) {
    return { taches: [], ignorees: 1 };
  }

  const valides = [];
  const idsVus = new Set();       // pour repérer deux tâches avec le même id
  for (const donnee of donnees) {
    const tache = nettoyerTache(donnee);
    if (tache !== null && !idsVus.has(tache.id)) {
      valides.push(tache);
      idsVus.add(tache.id);
    }
  }
  return { taches: valides, ignorees: donnees.length - valides.length };
}

// Enregistre toutes les tâches. Appelée après chaque changement.
function sauvegarderTaches() {
  localStorage.setItem(CLE_TACHES, JSON.stringify(taches));
}


// =============================================================
// Vérification de la saisie (US3, README section 3.2)
// =============================================================

// Vérifie qu'une date est au format AAAA-MM-JJ et qu'elle existe vraiment
// (refuse par exemple 2026-02-31)
function dateValide(texte) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texte)) {
    return false;
  }
  const [annee, mois, jour] = texte.split("-").map(Number);
  const date = new Date(annee, mois - 1, jour);
  return date.getFullYear() === annee
    && date.getMonth() === mois - 1
    && date.getDate() === jour;
}

// Renvoie un message d'erreur, ou une chaîne vide si tout est correct
function verifierSaisie(titre, description, priorite, echeance) {
  if (titre.length === 0) {
    return "Le titre est obligatoire.";
  }
  if (titre.length > TITRE_MAX) {
    return "Le titre ne doit pas dépasser " + TITRE_MAX + " caractères.";
  }
  if (description.length > DESCRIPTION_MAX) {
    return "La description ne doit pas dépasser " + DESCRIPTION_MAX + " caractères.";
  }
  if (!PRIORITES.includes(priorite)) {
    return "La priorité choisie n'est pas valide.";
  }
  if (echeance !== null && !dateValide(echeance)) {
    return "La date d'échéance n'est pas valide.";
  }
  return "";
}

function afficherErreur(message) {
  messageErreur.textContent = message;
}


// =============================================================
// Ajout d'une tâche (US3)
// =============================================================

// Crée un identifiant unique à partir de l'heure actuelle en millisecondes.
// Si deux tâches sont créées dans la même milliseconde, on ajoute 1.
function nouvelId() {
  let id = Date.now();
  while (taches.some(function (tache) { return tache.id === id; })) {
    id = id + 1;
  }
  return id;
}

formulaire.addEventListener("submit", function (evenement) {
  // Empêche le navigateur de recharger la page à l'envoi du formulaire
  evenement.preventDefault();

  // trim() retire les espaces au début et à la fin :
  // un titre composé uniquement d'espaces devient vide et sera refusé
  const titre = champTitre.value.trim();
  const description = champDescription.value.trim();
  const priorite = champPriorite.value;
  const echeance = champEcheance.value === "" ? null : champEcheance.value;

  const erreur = verifierSaisie(titre, description, priorite, echeance);
  if (erreur !== "") {
    afficherErreur(erreur);
    champTitre.focus();
    return;
  }

  // Nouvelle tâche, conforme au modèle de données du README (section 3.2)
  taches.push({
    id: nouvelId(),
    titre: titre,
    description: description,
    priorite: priorite,
    echeance: echeance,
    statut: "a_faire"
  });

  sauvegarderTaches();
  formulaire.reset();      // vide les champs et remet la priorité sur « moyenne »
  afficherErreur("");
  afficherTaches();
  champTitre.focus();
});


// =============================================================
// Coche et suppression (US6, US7)
// =============================================================

// Passe une tâche de « à faire » à « terminée », ou l'inverse
function basculerStatut(id) {
  const tache = taches.find(function (t) { return t.id === id; });
  if (!tache) {
    return;
  }
  tache.statut = tache.statut === "terminee" ? "a_faire" : "terminee";
  sauvegarderTaches();
  afficherTaches();
}

// Supprime une tâche après confirmation
function supprimerTache(id) {
  const tache = taches.find(function (t) { return t.id === id; });
  if (!tache) {
    return;
  }
  // confirm() affiche du texte brut : le titre n'y est jamais interprété comme du HTML
  const confirmation = confirm("Supprimer la tâche « " + tache.titre + " » ?");
  if (!confirmation) {
    return;
  }
  taches = taches.filter(function (t) { return t.id !== id; });
  if (idEnEdition === id) {
    idEnEdition = null;
  }
  sauvegarderTaches();
  afficherTaches();
}


// =============================================================
// Modification d'une tâche (US5, sprint 3)
// =============================================================

// Passe une tâche en mode modification (une seule à la fois)
function commencerModification(id) {
  idEnEdition = id;
  afficherTaches();
  // Place le curseur dans le titre : on peut taper tout de suite,
  // et la touche Échap fonctionne immédiatement
  const champ = liste.querySelector(".formulaire-modification input");
  if (champ) {
    champ.focus();
  }
}

// Abandonne la modification sans rien enregistrer
function annulerModification() {
  idEnEdition = null;
  afficherTaches();
}

// Construit le petit formulaire qui remplace la tâche pendant sa modification.
// Les valeurs actuelles sont placées dans les champs avec .value,
// qui ne les interprète jamais comme du HTML.
function creerFormulaireModification(tache) {
  const element = document.createElement("li");
  element.className = "tache en-edition";

  const form = document.createElement("form");
  form.className = "formulaire-modification";
  form.noValidate = true;

  const titre = document.createElement("input");
  titre.type = "text";
  titre.maxLength = TITRE_MAX;
  titre.value = tache.titre;
  titre.setAttribute("aria-label", "Titre");

  const priorite = document.createElement("select");
  priorite.setAttribute("aria-label", "Priorité");
  for (const valeur of PRIORITES) {
    const option = document.createElement("option");
    option.value = valeur;
    option.textContent = LIBELLES_PRIORITE[valeur];
    priorite.appendChild(option);
  }
  priorite.value = tache.priorite;

  const echeance = document.createElement("input");
  echeance.type = "date";
  echeance.value = tache.echeance || "";
  echeance.setAttribute("aria-label", "Échéance");

  const description = document.createElement("input");
  description.type = "text";
  description.maxLength = DESCRIPTION_MAX;
  description.value = tache.description;
  description.placeholder = "Description (facultative)";
  description.setAttribute("aria-label", "Description");

  const boutonEnregistrer = document.createElement("button");
  boutonEnregistrer.type = "submit";
  boutonEnregistrer.className = "bouton-principal";
  boutonEnregistrer.textContent = "Enregistrer";

  const boutonAnnuler = document.createElement("button");
  boutonAnnuler.type = "button";
  boutonAnnuler.className = "bouton-secondaire";
  boutonAnnuler.textContent = "Annuler";
  boutonAnnuler.addEventListener("click", annulerModification);

  const message = document.createElement("p");
  message.className = "message-erreur";
  message.setAttribute("role", "alert");

  // Enregistrement : exactement les mêmes vérifications qu'à la création
  form.addEventListener("submit", function (evenement) {
    evenement.preventDefault();
    const nouveauTitre = titre.value.trim();
    const nouvelleDescription = description.value.trim();
    const nouvelleEcheance = echeance.value === "" ? null : echeance.value;

    const erreur = verifierSaisie(nouveauTitre, nouvelleDescription, priorite.value, nouvelleEcheance);
    if (erreur !== "") {
      message.textContent = erreur;
      titre.focus();
      return;
    }

    // Le statut (à faire / terminée) et l'id ne changent pas
    tache.titre = nouveauTitre;
    tache.description = nouvelleDescription;
    tache.priorite = priorite.value;
    tache.echeance = nouvelleEcheance;

    idEnEdition = null;
    sauvegarderTaches();
    afficherTaches();
  });

  // La touche Échap annule aussi la modification
  form.addEventListener("keydown", function (evenement) {
    if (evenement.key === "Escape") {
      annulerModification();
    }
  });

  const ligne = document.createElement("div");
  ligne.className = "ligne-formulaire";
  ligne.append(titre, priorite, echeance);

  const boutons = document.createElement("div");
  boutons.className = "boutons-modification";
  boutons.append(boutonAnnuler, boutonEnregistrer);

  form.append(ligne, description, message, boutons);
  element.appendChild(form);
  return element;
}


// =============================================================
// Affichage de la liste (US4)
// =============================================================

// Transforme "2026-11-15" en "15/11" pour l'affichage
function formaterDate(echeance) {
  if (echeance === null || echeance === undefined || echeance === "") {
    return "—";
  }
  const morceaux = echeance.split("-");
  return morceaux[2] + "/" + morceaux[1];
}

// Construit l'élément HTML d'une tâche, morceau par morceau,
// avec createElement et textContent (aucun innerHTML)
function creerElementTache(tache) {
  // La tâche en cours de modification est remplacée par son formulaire
  if (tache.id === idEnEdition) {
    return creerFormulaireModification(tache);
  }

  const element = document.createElement("li");
  element.className = "tache";
  if (tache.statut === "terminee") {
    element.classList.add("terminee");
  }

  // Case à cocher
  const coche = document.createElement("input");
  coche.type = "checkbox";
  coche.checked = tache.statut === "terminee";
  coche.setAttribute("aria-label", "Marquer « " + tache.titre + " » comme terminée");
  coche.addEventListener("change", function () {
    basculerStatut(tache.id);
  });

  // Titre et description
  const textes = document.createElement("div");
  textes.className = "textes";

  const titre = document.createElement("span");
  titre.className = "titre";
  titre.textContent = tache.titre;
  textes.appendChild(titre);

  if (tache.description) {
    const description = document.createElement("span");
    description.className = "description";
    description.textContent = tache.description;
    textes.appendChild(description);
  }

  // Pastille de priorité en couleur
  const badge = document.createElement("span");
  badge.className = "badge badge-" + tache.priorite;
  badge.textContent = LIBELLES_PRIORITE[tache.priorite] || tache.priorite;

  // Date d'échéance
  const echeance = document.createElement("span");
  echeance.className = "echeance";
  echeance.textContent = formaterDate(tache.echeance);

  // Bouton de modification (sprint 3)
  const boutonModifier = document.createElement("button");
  boutonModifier.type = "button";
  boutonModifier.className = "bouton-icone";
  boutonModifier.textContent = "✏️";
  boutonModifier.setAttribute("aria-label", "Modifier « " + tache.titre + " »");
  boutonModifier.addEventListener("click", function () {
    commencerModification(tache.id);
  });

  // Bouton de suppression
  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.type = "button";
  boutonSupprimer.className = "bouton-icone";
  boutonSupprimer.textContent = "🗑️";
  boutonSupprimer.setAttribute("aria-label", "Supprimer « " + tache.titre + " »");
  boutonSupprimer.addEventListener("click", function () {
    supprimerTache(tache.id);
  });

  element.append(coche, textes, badge, echeance, boutonModifier, boutonSupprimer);
  return element;
}

// Redessine toute la liste selon le filtre choisi
function afficherTaches() {
  // replaceChildren() sans argument vide la liste, sans passer par innerHTML
  liste.replaceChildren();

  const tachesVisibles = taches.filter(function (tache) {
    return filtreActif === "toutes" || tache.statut === filtreActif;
  });

  for (const tache of tachesVisibles) {
    liste.appendChild(creerElementTache(tache));
  }

  // Message quand il n'y a rien à afficher
  if (tachesVisibles.length === 0) {
    messageListeVide.hidden = false;
    messageListeVide.textContent = taches.length === 0
      ? "Aucune tâche pour le moment."
      : "Aucune tâche dans ce filtre.";
  } else {
    messageListeVide.hidden = true;
  }
}


// =============================================================
// Filtres (US4)
// =============================================================

// Choisit un filtre et met en évidence le bouton correspondant
function activerFiltre(nom) {
  filtreActif = nom;
  boutonsFiltre.forEach(function (bouton) {
    const estActif = bouton.dataset.filtre === nom;
    bouton.classList.toggle("actif", estActif);
    bouton.setAttribute("aria-pressed", estActif ? "true" : "false");
  });
}

boutonsFiltre.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    activerFiltre(bouton.dataset.filtre);
    afficherTaches();
  });
});


// =============================================================
// Fonctions appelées par auth.js (sprint 2)
// =============================================================

// Après la connexion : relit les tâches enregistrées, les revalide et les affiche
function ouvrirTaches() {
  const resultat = chargerTaches();
  taches = resultat.taches;
  idEnEdition = null;
  activerFiltre("toutes");

  if (resultat.ignorees > 0) {
    // On réenregistre la liste propre, et on prévient l'utilisateur
    sauvegarderTaches();
    afficherErreur(resultat.ignorees === 1
      ? "1 tâche invalide a été ignorée au chargement."
      : resultat.ignorees + " tâches invalides ont été ignorées au chargement.");
  } else {
    afficherErreur("");
  }

  afficherTaches();
  champTitre.focus();
}

// À la déconnexion : retire les tâches de la page et de la mémoire,
// pour qu'elles ne restent pas affichées derrière l'écran de connexion.
// Elles restent bien sûr enregistrées dans localStorage.
function fermerTaches() {
  taches = [];
  idEnEdition = null;
  liste.replaceChildren();
  formulaire.reset();
  afficherErreur("");
}

// À la création d'un compte : supprime définitivement les tâches existantes
// (un nouveau compte ne doit pas voir celles d'un ancien compte)
function effacerTaches() {
  localStorage.removeItem(CLE_TACHES);
  taches = [];
}
