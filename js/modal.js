/* ============================================================
   T'NATURE — Modale réutilisable
   Un seul composant pour : chambres, prestations, activités,
   galerie (lightbox), choix de réservation et consentement Maps.

   Ouverture   : <button data-modale-cible="id-de-la-modale">
   Fermeture   : croix, clic sur le voile, touche Échap
   Accessible  : role=dialog, aria-modal, piège à focus,
                 restitution du focus au déclencheur, scroll verrouillé
   ============================================================ */
(function (window, document) {
  'use strict';
  var TN = window.TN = window.TN || {};

  var SELECTEUR_FOCUS = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  var ouverte = null;        // élément .modale actuellement ouvert
  var declencheur = null;    // élément qui a ouvert la modale

  function focusables(zone) {
    return Array.prototype.filter.call(
      zone.querySelectorAll(SELECTEUR_FOCUS),
      function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      }
    );
  }

  function ouvrir(id, source) {
    var modale = document.getElementById(id);
    if (!modale) return;
    if (ouverte) fermer({ silencieux: true });

    declencheur = source || document.activeElement;
    modale.setAttribute('data-ouvert', '1');
    document.body.classList.add('est-verrouille');
    ouverte = modale;

    // Les carrousels de la modale ne s'initialisent qu'à l'ouverture :
    // avant, leurs dimensions sont nulles.
    if (TN.carousel) {
      TN.carousel.init(modale);
      TN.carousel.relancerDans(modale);
    }

    // Vignette de galerie : on ouvre la lightbox sur LA photo cliquée,
    // pas sur la première. Sans ça, data-vue ne servait à rien.
    if (source && source.hasAttribute && source.hasAttribute('data-vue') && TN.carousel) {
      var vue = parseInt(source.getAttribute('data-vue'), 10);
      if (!isNaN(vue)) TN.carousel.aller(modale, vue);
    }

    var cibles = focusables(modale);
    var premier = modale.querySelector('[data-modale-focus]') || cibles[0];
    if (premier) premier.focus();

    modale.dispatchEvent(new CustomEvent('modale:ouverte', { bubbles: true }));
  }

  function fermer(options) {
    if (!ouverte) return;
    var modale = ouverte;
    modale.removeAttribute('data-ouvert');
    if (TN.carousel) TN.carousel.stopTous(modale);
    ouverte = null;
    document.body.classList.remove('est-verrouille');

    if (!(options && options.silencieux) && declencheur && declencheur.focus) {
      declencheur.focus();
    }
    declencheur = null;
    modale.dispatchEvent(new CustomEvent('modale:fermee', { bubbles: true }));
  }

  /* — Délégation globale : un seul écouteur pour tout le site — */
  document.addEventListener('click', function (e) {
    var ouvreur = e.target.closest('[data-modale-cible]');
    if (ouvreur) {
      e.preventDefault();
      ouvrir(ouvreur.getAttribute('data-modale-cible'), ouvreur);
      return;
    }
    if (e.target.closest('[data-modale-fermer]')) {
      e.preventDefault();
      fermer();
      return;
    }
    // Clic sur le voile
    if (ouverte && e.target.classList.contains('modale__voile')) fermer();
  });

  document.addEventListener('keydown', function (e) {
    if (!ouverte) return;
    if (e.key === 'Escape') { e.preventDefault(); fermer(); return; }
    if (e.key !== 'Tab') return;

    // Piège à focus
    var cibles = focusables(ouverte);
    if (cibles.length === 0) { e.preventDefault(); return; }
    var premier = cibles[0], dernier = cibles[cibles.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault(); dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault(); premier.focus();
    }
  });

  /* — Consentement RGPD des cartes Google Maps —
     L'iframe n'est injectée qu'après un clic explicite : aucun cookie
     tiers n'est déposé au chargement de la page. */
  document.addEventListener('click', function (e) {
    var bouton = e.target.closest('[data-charger-carte]');
    if (!bouton) return;
    e.preventDefault();
    var hote = bouton.closest('.carte-maps');
    if (!hote) return;
    var src = hote.getAttribute('data-carte-src');
    if (!src) return;
    var cadre = document.createElement('iframe');
    cadre.src = src;
    cadre.loading = 'lazy';
    cadre.title = 'Carte de situation de T’Nature, 1 rue de l’Église, 39210 Château-Chalon';
    cadre.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    cadre.setAttribute('allowfullscreen', '');
    hote.innerHTML = '';
    hote.appendChild(cadre);
  });

  /* — Départ vers le formulaire depuis une modale —
     <button data-vers-formulaire data-prefill-formule="Chambre 1 — En Messepierre">
     <button data-vers-formulaire data-prefill-presta="Randonnée en raquettes">
     Referme la modale, REMET LE FORMULAIRE À ZÉRO, le préremplit selon la fiche
     d'où l'on vient, et y amène l'utilisateur. La remise à zéro est là pour
     qu'une demande n'hérite jamais de la précédente : on part toujours d'un
     formulaire propre. */
  document.addEventListener('click', function (e) {
    var bouton = e.target.closest('[data-vers-formulaire]');
    if (!bouton) return;
    e.preventDefault();
    var formule = bouton.getAttribute('data-prefill-formule');
    var presta = bouton.getAttribute('data-prefill-presta');
    fermer({ silencieux: true });
    if (TN.form) {
      if (TN.form.reinitialiser) TN.form.reinitialiser();
      if (TN.form.prefill) TN.form.prefill(formule, presta);
    }
    var contact = document.getElementById('contact');
    if (contact) {
      contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // On donne le focus au premier champ après l'arrivée du défilement
      window.setTimeout(function () {
        var nom = document.getElementById('f-nom');
        if (nom) nom.focus({ preventScroll: true });
      }, 550);
    }
  });

  TN.modal = { ouvrir: ouvrir, fermer: fermer };
})(window, document);
