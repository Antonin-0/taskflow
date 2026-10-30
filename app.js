// =============================================================
// TaskFlow · app.js · Sprint 1
// Gestion des tâches : ajout, affichage, filtres, coche,
// suppression et sauvegarde dans le navigateur (localStorage).
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

// Le tableau de toutes les tâches, relu depuis localStorage au démarrage
let taches = chargerTaches();

// Le filtre choisi : "toutes", "a_faire" ou "terminee"
let filtreActif = "toutes";


// =============================================================
// Sauvegarde dans le navigateur (US8)
// =============================================================

// Relit les tâches enregistrées. Renvoie une liste vide s'il n'y a rien.
function chargerTaches() {
  const texte = localStorage.getItem(CLE_TACHES);
  if (texte === null) {
    return [];
  }

  // JSON.parse provoque une erreur si le contenu a été abîmé
  // (par exemple modifié à la main avec F12). Le try/catch évite
  // que toute l'application s'arrête : on repart alors d'une liste vide.
  // La vérification complète de chaque tâche relue est prévue au sprint 3.
  try {
    const donnees = JSON.parse(texte);
    return Array.isArray(donnees) ? donnees : [];
  } catch (erreur) {
    return [];
  }
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
  sauvegarderTaches();
  afficherTaches();
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

  // Bouton de suppression
  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.type = "button";
  boutonSupprimer.className = "bouton-supprimer";
  boutonSupprimer.textContent = "🗑️";
  boutonSupprimer.setAttribute("aria-label", "Supprimer « " + tache.titre + " »");
  boutonSupprimer.addEventListener("click", function () {
    supprimerTache(tache.id);
  });

  element.append(coche, textes, badge, echeance, boutonSupprimer);
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

boutonsFiltre.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    filtreActif = bouton.dataset.filtre;

    // Met en évidence le bouton choisi
    boutonsFiltre.forEach(function (autre) {
      const estActif = autre === bouton;
      autre.classList.toggle("actif", estActif);
      autre.setAttribute("aria-pressed", estActif ? "true" : "false");
    });

    afficherTaches();
  });
});


// ----- Premier affichage au chargement de la page -----
afficherTaches();
