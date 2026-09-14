/* ============================================================
   T'NATURE — En-tête collant, scrollspy, menu mobile
   ============================================================ */
(function (window, document) {
  'use strict';
  var TN = window.TN = window.TN || {};

  var entete = document.getElementById('entete');
  var burger = document.getElementById('burger');
  var panneau = document.getElementById('nav-mobile');
  var liens = Array.prototype.slice.call(document.querySelectorAll('[data-nav-lien]'));
  var SEUIL = 80;

  /* — 1. État de l'en-tête : transparent sur le hero, opaque ensuite — */
  var aUnHero = !!document.querySelector('.hero');

  function majEntete() {
    if (!entete) return;
    var opaque = window.scrollY > SEUIL || !aUnHero;
    // Une seule chose à écrire : l'état. Le logo bascule en CSS sur cet
    // attribut (deux <img>, une seule affichée) — plus rien à faire ici.
    entete.setAttribute('data-etat', opaque ? 'opaque' : 'transparent');
  }

  /* — 2. Scrollspy : souligne le lien de la section visible — */
  var sections = liens
    .map(function (l) {
      var id = (l.getAttribute('href') || '').replace('#', '');
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  function marquer(id) {
    liens.forEach(function (l) {
      var vise = (l.getAttribute('href') || '').replace('#', '') === id;
      if (vise) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var vues = {};
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { vues[e.target.id] = e.intersectionRatio; });
      // La section la plus visible gagne
      var meilleur = null, score = 0;
      sections.forEach(function (s) {
        var r = vues[s.id] || 0;
        if (r > score) { score = r; meilleur = s.id; }
      });
      if (meilleur && score > 0.02) marquer(meilleur);
    }, {
      rootMargin: '-' + (parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--h-header'), 10) || 76) + 'px 0px -55% 0px',
      threshold: [0, 0.02, 0.15, 0.4, 0.75, 1]
    });
    sections.forEach(function (s) { observateur.observe(s); });
  }

  /* — 3. Menu mobile : panneau plein écran, focus piégé — */
  function ouvrirMenu() {
    if (!panneau || !burger) return;
    panneau.setAttribute('data-ouvert', '1');
    burger.setAttribute('aria-expanded', 'true');
    // Le panneau s'ouvre sur un fond clair : l'en-tête repasse en blanc, sinon
    // le logo et la croix — blancs au-dessus du hero — disparaissent dedans.
    if (entete) entete.classList.add('entete--menu-ouvert');
    document.body.classList.add('est-verrouille');
    var premier = panneau.querySelector('a, button');
    if (premier) premier.focus();
  }
  function fermerMenu(rendreFocus) {
    if (!panneau || !burger) return;
    panneau.removeAttribute('data-ouvert');
    burger.setAttribute('aria-expanded', 'false');
    if (entete) entete.classList.remove('entete--menu-ouvert');
    document.body.classList.remove('est-verrouille');
    if (rendreFocus) burger.focus();
  }
  function menuOuvert() {
    return panneau && panneau.getAttribute('data-ouvert') === '1';
  }

  if (burger) {
    burger.addEventListener('click', function () {
      if (menuOuvert()) fermerMenu(true); else ouvrirMenu();
    });
  }
  if (panneau) {
    // Un clic sur un lien du menu ferme le panneau
    panneau.addEventListener('click', function (e) {
      if (e.target.closest('a')) fermerMenu(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!menuOuvert()) return;
    if (e.key === 'Escape') { fermerMenu(true); return; }
    if (e.key !== 'Tab') return;
    var cibles = panneau.querySelectorAll('a[href], button:not([disabled])');
    if (!cibles.length) return;
    var premier = cibles[0], dernier = cibles[cibles.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
  });
  // Clic hors zone (sur le fond du panneau)
  if (panneau) {
    panneau.addEventListener('mousedown', function (e) {
      if (e.target === panneau) fermerMenu(true);
    });
  }
  // Retour au desktop : on referme pour éviter un panneau fantôme
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) {
    if (e.matches && menuOuvert()) fermerMenu(false);
  });

  /* — 4. Apparitions au scroll — */
  function animerApparitions() {
    var cibles = document.querySelectorAll('.apparait');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(cibles, function (el) { el.setAttribute('data-vu', '1'); });
      return;
    }
    var obs = new IntersectionObserver(function (entrees, self) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.setAttribute('data-vu', '1');
        self.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(cibles, function (el, i) {
      // Décalage de 80 ms entre éléments d'un même groupe
      var rang = parseInt(el.getAttribute('data-rang'), 10);
      el.style.setProperty('--delai', ((isNaN(rang) ? i % 6 : rang) * 80) + 'ms');
      obs.observe(el);
    });
  }

  /* — 5. Défilement doux vers les ancres, en compensant l'en-tête — */
  document.addEventListener('click', function (e) {
    var lien = e.target.closest('a[href^="#"]');
    if (!lien) return;
    var id = lien.getAttribute('href').slice(1);
    if (!id) return;
    var cible = document.getElementById(id);
    if (!cible) return;
    e.preventDefault();
    cible.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
    // On met l'URL à jour sans ajouter d'entrée d'historique parasite
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + id);
    }
  });

  window.addEventListener('scroll', majEntete, { passive: true });
  document.addEventListener('DOMContentLoaded', function () {
    majEntete();
    animerApparitions();
  });
  majEntete();

  TN.nav = { fermerMenu: fermerMenu };
})(window, document);
