// =============================================================
// TaskFlow · auth.js · Sprints 2 et 3
// Tout ce qui touche à la sécurité de l'accès (README, sections 1.3 et 1.4) :
// création du compte, jauge de robustesse, hachage du mot de passe,
// connexion, déconnexion et blocage après 3 échecs (sprint 3).
//
// Ce fichier est chargé AVANT app.js. C'est lui qui décide quel écran
// afficher : les tâches ne sont montrées que si la session est ouverte.
// =============================================================


// ----- Constantes (README, sections 3.3 et 3.4) -----

// Nom sous lequel le compte est enregistré (localStorage : garde le compte
// même après fermeture du navigateur)
const CLE_UTILISATEUR = "taskflow_utilisateur";

// Nom de l'indicateur de connexion (sessionStorage : effacé automatiquement
// quand on ferme le navigateur, ce qui déconnecte l'utilisateur)
const CLE_SESSION = "taskflow_session";

const IDENTIFIANT_MIN = 3;
const IDENTIFIANT_MAX = 30;

// Blocage après 3 échecs consécutifs, pendant 5 minutes (US9)
const MAX_ECHECS = 3;
const DUREE_BLOCAGE = 5 * 60 * 1000;   // 5 minutes en millisecondes

// Message unique en cas d'échec de connexion : on ne dit jamais si c'est
// l'identifiant ou le mot de passe qui est faux, pour ne pas aider
// quelqu'un qui essaie de deviner un compte (README, section 1.4)
const MESSAGE_ECHEC_CONNEXION = "Identifiant ou mot de passe incorrect.";

// Les 4 critères de robustesse (README, section 1.3).
// Chaque critère a un test qui renvoie true s'il est rempli.
const CRITERES = [
  {
    nom: "longueur",
    // [...texte] compte les caractères un par un (un emoji compte pour 1)
    test: function (mdp) { return [...mdp].length >= 8; }
  },
  {
    nom: "majuscule",
    // \p{Lu} = toute lettre majuscule, y compris accentuée (É, À…)
    test: function (mdp) { return /\p{Lu}/u.test(mdp); }
  },
  {
    nom: "chiffre",
    test: function (mdp) { return /[0-9]/.test(mdp); }
  },
  {
    nom: "special",
    // Tout caractère qui n'est ni une lettre (\p{L}) ni un chiffre (0-9)
    test: function (mdp) { return /[^\p{L}0-9]/u.test(mdp); }
  }
];

const LIBELLES_NIVEAU = {
  faible: "Faible",
  moyen: "Moyen",
  fort: "Fort"
};


// ----- Récupération des éléments de la page -----

const ecranCreation = document.getElementById("ecran-creation");
const ecranConnexion = document.getElementById("ecran-connexion");
const ecranTaches = document.getElementById("ecran-taches");
const zoneUtilisateur = document.getElementById("zone-utilisateur");
const nomUtilisateur = document.getElementById("nom-utilisateur");
const boutonDeconnexion = document.getElementById("bouton-deconnexion");

const formulaireCreation = document.getElementById("formulaire-creation");
const creationIdentifiant = document.getElementById("creation-identifiant");
const creationMdp = document.getElementById("creation-mdp");
const creationConfirmation = document.getElementById("creation-confirmation");
const boutonCreer = document.getElementById("bouton-creer");
const messageCreation = document.getElementById("message-creation");
const jaugeBarre = document.getElementById("jauge-barre");
const jaugeTexte = document.getElementById("jauge-texte");
const elementsCriteres = document.querySelectorAll("#liste-criteres li");

const formulaireConnexion = document.getElementById("formulaire-connexion");
const connexionIdentifiant = document.getElementById("connexion-identifiant");
const connexionMdp = document.getElementById("connexion-mdp");
const boutonConnexion = document.getElementById("bouton-connexion");
const messageConnexion = document.getElementById("message-connexion");

// Web Crypto est l'outil de chiffrement intégré au navigateur.
// Sans lui, impossible de hacher le mot de passe : on refuse alors
// de créer un compte plutôt que de stocker un mot de passe en clair.
const webCryptoDisponible = Boolean(window.crypto && window.crypto.subtle);


// =============================================================
// Jauge de robustesse (US2)
// =============================================================

// Analyse un mot de passe et renvoie :
// - la liste des critères remplis,
// - le niveau : "" (champ vide), "faible", "moyen" ou "fort"
function evaluerMotDePasse(mdp) {
  const remplis = CRITERES
    .filter(function (critere) { return critere.test(mdp); })
    .map(function (critere) { return critere.nom; });

  let niveau = "";
  if (mdp.length > 0) {
    if (remplis.length === 4) {
      niveau = "fort";
    } else if (remplis.length === 3) {
      niveau = "moyen";
    } else {
      niveau = "faible";      // 0, 1 ou 2 critères
    }
  }
  return { remplis: remplis, niveau: niveau };
}

// Met à jour la jauge, la liste des critères et le bouton « Créer mon compte »
function mettreAJourJauge() {
  const resultat = evaluerMotDePasse(creationMdp.value);

  // Couleur et largeur de la barre : la classe CSS fait tout le travail
  jaugeBarre.className = "jauge-barre";
  if (resultat.niveau !== "") {
    jaugeBarre.classList.add("niveau-" + resultat.niveau);
    jaugeTexte.textContent = "Robustesse : " + LIBELLES_NIVEAU[resultat.niveau];
  } else {
    jaugeTexte.textContent = "";   // champ vide : la jauge n'affiche rien
  }

  // Chaque critère passe en vert (✓) quand il est rempli
  elementsCriteres.forEach(function (element) {
    const rempli = resultat.remplis.includes(element.dataset.critere);
    element.classList.toggle("rempli", rempli);
  });

  // Le compte ne peut être créé qu'avec un mot de passe « fort »
  boutonCreer.disabled = resultat.niveau !== "fort";
}

// La jauge réagit à chaque caractère tapé, collé ou effacé
creationMdp.addEventListener("input", mettreAJourJauge);


// =============================================================
// Hachage du mot de passe (README, section 1.4)
// =============================================================

// Transforme des octets en texte hexadécimal (ex. [255, 1] → "ff01")
function enHexadecimal(octets) {
  return Array.from(new Uint8Array(octets), function (octet) {
    return octet.toString(16).padStart(2, "0");
  }).join("");
}

// Génère un sel : 16 octets aléatoires, soit 32 caractères hexadécimaux.
// crypto.getRandomValues est un générateur aléatoire sûr, contrairement
// à Math.random qui est prévisible.
function genererSel() {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return enHexadecimal(octets);
}

// Calcule l'empreinte SHA-256 de (sel + mot de passe).
// Le résultat fait 64 caractères hexadécimaux. On ne peut pas retrouver
// le mot de passe à partir de l'empreinte : pour vérifier une connexion,
// on recalcule l'empreinte et on compare.
// "async" : le calcul est fait en arrière-plan, il faut l'attendre avec "await".
async function hacherMotDePasse(mdp, sel) {
  const donnees = new TextEncoder().encode(sel + mdp);
  const empreinte = await crypto.subtle.digest("SHA-256", donnees);
  return enHexadecimal(empreinte);
}


// =============================================================
// Lecture et enregistrement du compte
// =============================================================

// Relit le compte enregistré. Renvoie null s'il n'existe pas
// ou s'il est abîmé (par exemple modifié à la main avec F12).
function lireUtilisateur() {
  const texte = localStorage.getItem(CLE_UTILISATEUR);
  if (texte === null) {
    return null;
  }
  let utilisateur;
  try {
    utilisateur = JSON.parse(texte);
  } catch (erreur) {
    return null;
  }

  // Revalidation (README, section 3.3) : sans identifiant, empreinte
  // et sel corrects, le compte est inutilisable
  const valide = typeof utilisateur === "object" && utilisateur !== null
    && typeof utilisateur.identifiant === "string"
    && utilisateur.identifiant.length >= IDENTIFIANT_MIN
    && utilisateur.identifiant.length <= IDENTIFIANT_MAX
    && /^[0-9a-f]{64}$/.test(utilisateur.motDePasseHash)
    && /^[0-9a-f]{32}$/.test(utilisateur.sel);
  if (!valide) {
    return null;
  }

  // Les deux champs du blocage sont remis à des valeurs autorisées
  // s'ils ont été abîmés (entier de 0 à 3, et nombre ou null)
  if (!Number.isInteger(utilisateur.tentativesEchouees)
    || utilisateur.tentativesEchouees < 0
    || utilisateur.tentativesEchouees > MAX_ECHECS) {
    utilisateur.tentativesEchouees = 0;
  }
  if (typeof utilisateur.bloqueJusqua !== "number" || !Number.isFinite(utilisateur.bloqueJusqua)) {
    utilisateur.bloqueJusqua = null;
  }
  return utilisateur;
}

// Enregistre le compte (après création, échec ou réussite de connexion)
function enregistrerUtilisateur(utilisateur) {
  localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
}


// =============================================================
// Blocage après 3 échecs (US9, sprint 3)
// =============================================================

// Identifiant du minuteur qui met à jour le compte à rebours chaque seconde
let minuteurBlocage = null;

// Temps de blocage restant en millisecondes (0 si la connexion est possible).
// Le temps est plafonné à 5 minutes : une date de fin repoussée à la main
// très loin dans le futur ne peut pas bloquer le compte indéfiniment.
function tempsRestantBlocage(utilisateur) {
  if (utilisateur.bloqueJusqua === null) {
    return 0;
  }
  const reste = utilisateur.bloqueJusqua - Date.now();
  return reste > 0 ? Math.min(reste, DUREE_BLOCAGE) : 0;
}

// Transforme une durée en texte, par exemple 272000 ms → "4 min 32 s"
function formaterDuree(millisecondes) {
  const secondes = Math.ceil(millisecondes / 1000);
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return minutes + " min " + String(reste).padStart(2, "0") + " s";
}

// Remet le compteur d'échecs à zéro et lève le blocage
function leverBlocage(utilisateur) {
  utilisateur.tentativesEchouees = 0;
  utilisateur.bloqueJusqua = null;
  enregistrerUtilisateur(utilisateur);
}

function arreterCompteARebours() {
  if (minuteurBlocage !== null) {
    clearInterval(minuteurBlocage);
    minuteurBlocage = null;
  }
}

// Affiche le temps restant et le met à jour chaque seconde.
// Pendant le blocage, le bouton « Se connecter » est désactivé.
function lancerCompteARebours() {
  arreterCompteARebours();

  function miseAJour() {
    const utilisateur = lireUtilisateur();
    if (utilisateur === null) {
      arreterCompteARebours();
      return;
    }
    const reste = tempsRestantBlocage(utilisateur);
    if (reste <= 0) {
      // Fin du blocage : on peut réessayer
      leverBlocage(utilisateur);
      arreterCompteARebours();
      boutonConnexion.disabled = false;
      messageConnexion.textContent = "Vous pouvez de nouveau vous connecter.";
      return;
    }
    boutonConnexion.disabled = true;
    messageConnexion.textContent = "Trop de tentatives échouées. Réessayez dans "
      + formaterDuree(reste) + ".";
  }

  miseAJour();
  minuteurBlocage = setInterval(miseAJour, 1000);
}

// À l'affichage de l'écran de connexion : reprend le compte à rebours
// si un blocage est en cours (même après un rechargement de la page)
function verifierBlocage() {
  const utilisateur = lireUtilisateur();
  if (utilisateur === null) {
    return;
  }
  if (tempsRestantBlocage(utilisateur) > 0) {
    lancerCompteARebours();
  } else if (utilisateur.bloqueJusqua !== null) {
    leverBlocage(utilisateur);    // blocage terminé pendant que la page était fermée
  }
}


// =============================================================
// Changement d'écran
// =============================================================

// Affiche un seul écran parmi "creation", "connexion" et "taches"
function afficherEcran(nom) {
  ecranCreation.hidden = nom !== "creation";
  ecranConnexion.hidden = nom !== "connexion";
  ecranTaches.hidden = nom !== "taches";
  zoneUtilisateur.hidden = nom !== "taches";

  // Le compte à rebours ne tourne que sur l'écran de connexion
  arreterCompteARebours();
  boutonConnexion.disabled = false;

  // Place le curseur dans le premier champ de l'écran affiché
  if (nom === "creation") {
    creationIdentifiant.focus();
  } else if (nom === "connexion") {
    connexionIdentifiant.focus();
    verifierBlocage();
  }
}

// Ouvre la session et affiche les tâches
function ouvrirSession(identifiant) {
  sessionStorage.setItem(CLE_SESSION, "connecte");
  // textContent : l'identifiant est affiché comme du texte, jamais comme du HTML
  nomUtilisateur.textContent = identifiant;
  afficherEcran("taches");
  ouvrirTaches();          // fonction définie dans app.js
}


// =============================================================
// Création du compte (US2)
// =============================================================

formulaireCreation.addEventListener("submit", async function (evenement) {
  evenement.preventDefault();
  messageCreation.textContent = "";

  const identifiant = creationIdentifiant.value.trim();
  const mdp = creationMdp.value;

  // Vérifications, dans l'ordre où l'utilisateur remplit le formulaire
  if (identifiant.length < IDENTIFIANT_MIN || identifiant.length > IDENTIFIANT_MAX) {
    messageCreation.textContent = "L'identifiant doit faire entre "
      + IDENTIFIANT_MIN + " et " + IDENTIFIANT_MAX + " caractères.";
    creationIdentifiant.focus();
    return;
  }
  if (evaluerMotDePasse(mdp).niveau !== "fort") {
    messageCreation.textContent = "Le mot de passe doit remplir les 4 critères.";
    creationMdp.focus();
    return;
  }
  // Confirmation : sans récupération possible du mot de passe (README, section 4),
  // une faute de frappe à la création bloquerait l'accès au compte
  if (creationConfirmation.value !== mdp) {
    messageCreation.textContent = "Les deux mots de passe ne correspondent pas.";
    creationConfirmation.focus();
    return;
  }
  if (!webCryptoDisponible) {
    messageCreation.textContent = "Votre navigateur ne permet pas de protéger le mot de passe. "
      + "Ouvrez TaskFlow avec un navigateur récent (Chrome, Firefox, Edge).";
    return;
  }

  // On ne stocke jamais le mot de passe : seulement le sel et l'empreinte
  const sel = genererSel();
  const empreinte = await hacherMotDePasse(mdp, sel);

  const utilisateur = {
    identifiant: identifiant,
    motDePasseHash: empreinte,
    sel: sel,
    tentativesEchouees: 0,   // utilisé au sprint 3 (blocage après 3 échecs)
    bloqueJusqua: null       // utilisé au sprint 3
  };

  // Un nouveau compte ne doit pas voir les tâches d'un ancien compte
  // (README, section 1.4, risque n° 4 du prompt 3)
  effacerTaches();         // fonction définie dans app.js

  enregistrerUtilisateur(utilisateur);

  // Efface les mots de passe des champs avant de quitter l'écran
  formulaireCreation.reset();
  mettreAJourJauge();

  ouvrirSession(identifiant);
});


// =============================================================
// Connexion (US1)
// =============================================================

formulaireConnexion.addEventListener("submit", async function (evenement) {
  evenement.preventDefault();
  messageConnexion.textContent = "";

  const utilisateur = lireUtilisateur();
  if (utilisateur === null) {
    // Plus de compte valide (supprimé ou abîmé) : retour à la création
    afficherEcran("creation");
    return;
  }
  if (!webCryptoDisponible) {
    messageConnexion.textContent = "Votre navigateur ne permet pas de vérifier le mot de passe.";
    return;
  }

  // Blocage en cours : on ne vérifie même pas le mot de passe (US9)
  if (tempsRestantBlocage(utilisateur) > 0) {
    connexionMdp.value = "";
    lancerCompteARebours();
    return;
  }
  // Blocage terminé : on repart de zéro
  if (utilisateur.bloqueJusqua !== null) {
    utilisateur.tentativesEchouees = 0;
    utilisateur.bloqueJusqua = null;
  }

  const identifiant = connexionIdentifiant.value.trim();
  const mdp = connexionMdp.value;

  // Évite un double clic pendant le calcul
  boutonConnexion.disabled = true;
  const empreinte = await hacherMotDePasse(mdp, utilisateur.sel);
  boutonConnexion.disabled = false;

  // On compare les empreintes, jamais les mots de passe
  const correct = identifiant === utilisateur.identifiant
    && empreinte === utilisateur.motDePasseHash;

  // Le mot de passe saisi est effacé du champ dans tous les cas
  connexionMdp.value = "";

  if (!correct) {
    // Un échec de plus (identifiant faux ou mot de passe faux, c'est pareil)
    utilisateur.tentativesEchouees = utilisateur.tentativesEchouees + 1;

    if (utilisateur.tentativesEchouees >= MAX_ECHECS) {
      // 3e échec consécutif : connexion bloquée pendant 5 minutes
      utilisateur.bloqueJusqua = Date.now() + DUREE_BLOCAGE;
      enregistrerUtilisateur(utilisateur);
      lancerCompteARebours();
      return;
    }

    enregistrerUtilisateur(utilisateur);
    messageConnexion.textContent = MESSAGE_ECHEC_CONNEXION;
    connexionMdp.focus();
    return;
  }

  // Connexion réussie : le compteur d'échecs repart de zéro
  leverBlocage(utilisateur);
  formulaireConnexion.reset();
  ouvrirSession(utilisateur.identifiant);
});


// =============================================================
// Déconnexion (US1)
// =============================================================

boutonDeconnexion.addEventListener("click", function () {
  sessionStorage.removeItem(CLE_SESSION);
  nomUtilisateur.textContent = "";
  fermerTaches();          // fonction définie dans app.js : vide la liste affichée
  afficherEcran("connexion");
});


// =============================================================
// Démarrage : quel écran afficher ?
// =============================================================

// DOMContentLoaded se déclenche une fois les deux scripts chargés :
// les fonctions de app.js (ouvrirTaches, fermerTaches…) existent alors.
document.addEventListener("DOMContentLoaded", function () {
  mettreAJourJauge();

  const utilisateur = lireUtilisateur();

  if (utilisateur === null) {
    afficherEcran("creation");                       // premier lancement
  } else if (sessionStorage.getItem(CLE_SESSION) === "connecte") {
    ouvrirSession(utilisateur.identifiant);           // session déjà ouverte (ex. page rechargée)
  } else {
    afficherEcran("connexion");
  }
});
