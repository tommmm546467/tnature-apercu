/* ============================================================
   T'NATURE — Filtres et maître-détail
   1. Activités : filtre des adresses par temps de route
   2. Activités : cliquer une adresse échange la galerie de droite
   ============================================================ */
(function (window, document) {
  'use strict';

  /* — 1. Filtre par temps de route — */
  document.addEventListener('click', function (e) {
    var bouton = e.target.closest('[data-filtre-distance]');
    if (!bouton) return;
    var groupe = bouton.closest('[data-groupe-filtres="distance"]');
    if (!groupe) return;
    var liste = groupe.parentNode.querySelector('[data-liste-lieux]');
    if (!liste) return;

    var max = bouton.getAttribute('data-filtre-distance');   // '15' | '30' | 'tout'
    Array.prototype.forEach.call(
      groupe.querySelectorAll('[data-filtre-distance]'),
      function (b) { b.setAttribute('aria-pressed', b === bouton ? 'true' : 'false'); }
    );

    var visibles = 0;
    Array.prototype.forEach.call(liste.children, function (lieu) {
      var min = parseInt(lieu.getAttribute('data-minutes'), 10);
      var ok = max === 'tout' || (!isNaN(min) && min <= parseInt(max, 10));
      lieu.hidden = !ok;
      if (ok) visibles++;
    });

    var info = groupe.querySelector('[data-compte-lieux]');
    if (info) {
      info.textContent = visibles === 0
        ? 'Aucun lieu dans ce rayon'
        : visibles + (visibles > 1 ? ' lieux' : ' lieu');
    }
  });

  /* — 2. Maître-détail : une adresse ⇄ sa galerie —
     Une seule galerie est visible à la fois. Cliquer une adresse affiche ses
     photos ; recliquer la même revient à la vue d'ensemble de la catégorie. */
  function activerGalerie(modale, cible) {
    var zone = modale.querySelector('[data-galeries]');
    if (!zone) return;

    Array.prototype.forEach.call(zone.children, function (g) {
      var vise = g.getAttribute('data-galerie') === cible;
      g.hidden = !vise;
      if (vise) g.setAttribute('data-actif', '1');
      else g.removeAttribute('data-actif');
    });

    Array.prototype.forEach.call(
      modale.querySelectorAll('.lieu[data-lieu-cible]'),
      function (l) {
        if (l.getAttribute('data-lieu-cible') === cible) l.setAttribute('data-actif', '1');
        else l.removeAttribute('data-actif');
      }
    );

    // Le carrousel devenu visible n'avait pas de dimensions : on l'initialise
    // maintenant, et on le remet sur sa première vue.
    var active = zone.querySelector('[data-galerie="' + cible + '"]');
    if (active && window.TN && window.TN.carousel) {
      window.TN.carousel.init(active);
      window.TN.carousel.aller(active, 0);
    }
  }

  document.addEventListener('click', function (e) {
    // On ignore les clics sur un lien : ce sont Itinéraire et Site officiel.
    if (e.target.closest('a')) return;
    var hote = e.target.closest('[data-lieu-cible]');
    if (!hote) return;
    var modale = hote.closest('.modale');
    if (!modale) return;

    var ligne = hote.closest('.lieu') || hote;
    var dejaActive = ligne.getAttribute('data-actif') === '1';
    // Recliquer l'adresse déjà ouverte ramène à la vue d'ensemble.
    activerGalerie(modale, dejaActive ? 'banniere' : hote.getAttribute('data-lieu-cible'));
  });

  // À l'ouverture d'une modale d'activités, on repart de la vue d'ensemble.
  document.addEventListener('modale:ouverte', function (e) {
    var m = e.target;
    if (m && m.querySelector && m.querySelector('[data-galeries]')) {
      activerGalerie(m, 'banniere');
    }
  }, true);
})(window, document);
