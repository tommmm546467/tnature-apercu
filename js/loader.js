/* ============================================================
   T'NATURE — Écran de chargement
   Calque décoratif, pas un écran de préchargement : le contenu de la
   page est déjà dans le DOM derrière lui. Aucune pénalité SEO ni LCP.

   Il s'affiche à CHAQUE chargement de la page — première visite comme
   rafraîchissement par la flèche du navigateur. Un seul cas le saute :
   la préférence système « animations réduites », où l'on ne fait pas
   attendre quelqu'un qui a demandé moins de mouvement.

   Cas de l'ancre : le menu inscrit « #chambres » dans l'URL, si bien qu'un
   rafraîchissement en cours de page en porte une. On garde le rideau — c'est
   ce qui a été demandé — et on repositionne la page sur la section une fois
   le rideau retiré, le verrou de défilement ayant annulé le saut du
   navigateur.
   ============================================================ */
(function (window, document) {
  'use strict';
  var TN = window.TN = window.TN || {};

  var DUREE = 2000;         // durée d'affichage demandée : 2 secondes
  var DUREE_RIDEAU = 900;   // doit correspondre à --t-rideau

  var loader = document.getElementById('loader');
  if (!loader) return;

  function retirer() {
    if (!loader || !loader.parentNode) return;
    loader.parentNode.removeChild(loader);
    document.body.classList.remove('est-verrouille');
    loader = null;
    retrouverAncre();
    // Le diaporama du hero n'a aucune raison de tourner derrière le rideau :
    // il attend ce signal pour lancer son premier décompte. Le drapeau sert
    // aux scripts qui s'initialiseraient après coup et auraient manqué
    // l'événement.
    TN.rideauParti = true;
    document.dispatchEvent(new CustomEvent('tn:rideau-parti'));
  }

  function retrouverAncre() {
    var id = window.location.hash.slice(1);
    if (!id) return;
    var cible = document.getElementById(id);
    if (cible) cible.scrollIntoView({ block: 'start' });
  }

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduit) {
    retirer();
    return;
  }

  document.body.classList.add('est-verrouille');

  var parti = false;

  function sortir() {
    if (parti || !loader) return;
    parti = true;
    loader.setAttribute('data-sortie', '1');   // coulisse du bas vers le haut
    window.setTimeout(retirer, DUREE_RIDEAU);
  }

  // Deux secondes à compter de l'exécution du script, que la page ait fini
  // de charger ou non : c'est une durée d'affichage, pas une attente.
  window.setTimeout(sortir, DUREE);

  // Filet : si l'onglet revient d'un cache (retour arrière du navigateur),
  // le minuteur ci-dessus a pu ne jamais être relancé.
  window.addEventListener('pageshow', function (ev) {
    if (ev.persisted) retirer();
  });
})(window, document);
