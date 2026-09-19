/* ============================================================
   T'NATURE — Carrousel réutilisable
   Un seul composant pour : galeries de chambres, de prestations,
   bandeaux d'activités et lightbox de la galerie.

   Balisage attendu :
     <div class="carrousel" data-carrousel [data-auto="6000"]>
       <div class="carrousel__cadre">
         <div class="carrousel__piste">
           <div class="carrousel__vue">…</div> × n
         </div>
         <button data-carrousel-prec>…</button>
         <button data-carrousel-suiv>…</button>
       </div>
       <div class="carrousel__barre">
         <div class="carrousel__pastilles"></div>
         <p class="carrousel__compteur" aria-live="polite"></p>
       </div>
     </div>

   Ce fichier porte aussi `TN.rail` : la rangée horizontale des Espaces sur
   téléphone. Rien à voir avec le carrousel ci-dessus — là, c'est le
   navigateur qui fait défiler, et les flèches ne font que le lui demander :

     <div data-rail>
       <div data-rail-piste>…cartes…</div>
       <button data-rail-prec>…</button>
       <button data-rail-suiv>…</button>
     </div>

   Scripts classiques volontairement (pas de modules ES) : le site doit
   s'ouvrir par double-clic sur index.html, et file:// interdit les
   modules comme fetch(). Chaque fichier reste isolé dans une IIFE.
   ============================================================ */
(function (window, document) {
  'use strict';
  var TN = window.TN = window.TN || {};

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  function Carrousel(racine) {
    var piste = racine.querySelector('.carrousel__piste');
    var vues = Array.prototype.slice.call(racine.querySelectorAll('.carrousel__vue'));
    if (!piste || vues.length === 0) return null;

    var prec = racine.querySelector('[data-carrousel-prec]');
    var suiv = racine.querySelector('[data-carrousel-suiv]');
    var zonePastilles = racine.querySelector('.carrousel__pastilles');
    var compteur = racine.querySelector('.carrousel__compteur');
    var vignettes = Array.prototype.slice.call(
      racine.querySelectorAll('[data-carrousel-vignette]')
    );
    var index = 0;
    var minuteur = null;
    var pastilles = [];

    // Un seul élément : on masque toute la mécanique de navigation
    if (vues.length === 1) {
      if (prec) prec.hidden = true;
      if (suiv) suiv.hidden = true;
      var barre = racine.querySelector('.carrousel__barre');
      if (barre) barre.hidden = true;
    }

    if (zonePastilles && vues.length > 1) {
      vues.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'carrousel__pastille';
        b.setAttribute('aria-label', 'Aller à l’image ' + (i + 1));
        b.addEventListener('click', function () { aller(i); });
        zonePastilles.appendChild(b);
        pastilles.push(b);
      });
    }

    function rendre() {
      piste.style.transform = 'translateX(' + (-index * 100) + '%)';
      vues.forEach(function (v, i) {
        // Les vues hors écran sortent de l'ordre de tabulation
        v.setAttribute('aria-hidden', i === index ? 'false' : 'true');
        var focusables = v.querySelectorAll('a, button');
        Array.prototype.forEach.call(focusables, function (el) {
          if (i === index) el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', '-1');
        });
      });
      pastilles.forEach(function (p, i) {
        if (i === index) p.setAttribute('aria-current', 'true');
        else p.removeAttribute('aria-current');
      });
      vignettes.forEach(function (v, i) {
        if (i === index) v.setAttribute('aria-current', 'true');
        else v.removeAttribute('aria-current');
      });
      if (compteur) compteur.textContent = (index + 1) + ' / ' + vues.length;
    }

    function aller(i) {
      index = (i + vues.length) % vues.length;
      rendre();
    }
    function suivant() { aller(index + 1); }
    function precedent() { aller(index - 1); }

    if (prec) prec.addEventListener('click', function () { precedent(); stopAuto(); });
    if (suiv) suiv.addEventListener('click', function () { suivant(); stopAuto(); });
    vignettes.forEach(function (v, i) {
      v.addEventListener('click', function () { aller(i); stopAuto(); });
    });

    // Clavier : flèches gauche / droite quand le carrousel a le focus
    racine.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { precedent(); stopAuto(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { suivant(); stopAuto(); e.preventDefault(); }
    });

    // Balayage tactile
    var xDepart = null, yDepart = null;
    racine.addEventListener('touchstart', function (e) {
      xDepart = e.touches[0].clientX; yDepart = e.touches[0].clientY;
    }, { passive: true });
    racine.addEventListener('touchend', function (e) {
      if (xDepart === null) return;
      var dx = e.changedTouches[0].clientX - xDepart;
      var dy = e.changedTouches[0].clientY - yDepart;
      // On ignore les gestes plutôt verticaux : c'est du défilement
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) suivant(); else precedent();
        stopAuto();
      }
      xDepart = yDepart = null;
    }, { passive: true });

    // Défilement automatique : jamais si l'utilisateur réduit les animations
    var delai = parseInt(racine.getAttribute('data-auto'), 10);
    function demarrerAuto() {
      if (!delai || reduit.matches || vues.length < 2) return;
      stopAuto();
      minuteur = window.setInterval(suivant, delai);
    }
    function stopAuto() {
      if (minuteur) { window.clearInterval(minuteur); minuteur = null; }
    }
    racine.addEventListener('mouseenter', stopAuto);
    racine.addEventListener('focusin', stopAuto);

    rendre();
    demarrerAuto();

    return {
      racine: racine,
      aller: aller,
      demarrerAuto: demarrerAuto,
      stopAuto: stopAuto
    };
  }

  var instances = [];

  /* Initialise tous les carrousels d'un conteneur (idempotent). */
  TN.carousel = {
    init: function (contexte) {
      var zone = contexte || document;
      Array.prototype.forEach.call(
        zone.querySelectorAll('[data-carrousel]'),
        function (el) {
          if (el.getAttribute('data-carrousel-pret') === '1') return;
          var inst = Carrousel(el);
          if (inst) { el.setAttribute('data-carrousel-pret', '1'); instances.push(inst); }
        }
      );
    },
    /* Amène le premier carrousel d'un conteneur sur la vue demandée.
       Utilisé par la lightbox de la galerie (data-vue) et par le
       maître-détail des activités. */
    aller: function (contexte, index) {
      var racine = contexte && contexte.matches && contexte.matches('[data-carrousel]')
        ? contexte
        : (contexte || document).querySelector('[data-carrousel]');
      if (!racine) return;
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].racine === racine) { instances[i].aller(index); return; }
      }
    },
    stopTous: function (contexte) {
      instances.forEach(function (i) {
        if (!contexte || contexte.contains(i.racine)) i.stopAuto();
      });
    },
    relancerDans: function (contexte) {
      instances.forEach(function (i) {
        if (contexte && contexte.contains(i.racine)) { i.aller(0); i.demarrerAuto(); }
      });
    }
  };

  /* ============================================================
     Diaporama de fond (hero, rideau de chargement)

     Rien à voir avec le carrousel ci-dessus : pas de piste qui coulisse, pas
     de commandes, pas de pastilles. Trois images superposées, une seule
     opaque, et un fondu toutes les trois secondes.

       <div class="diaporama" data-diaporama data-duree="3000">
         <img class="image-fond" data-actif="1"> × n
       </div>

     Sans JavaScript, la première image porte déjà `data-actif` dans le HTML :
     le fond est correct, il ne tourne simplement pas.
     ============================================================ */
  function Diaporama(racine) {
    var vues = Array.prototype.slice.call(racine.querySelectorAll('.image-fond'));
    if (vues.length < 2) return;
    var duree = parseInt(racine.getAttribute('data-duree'), 10) || 3000;
    var i = 0, minuteur = null;

    function suivante() {
      vues[i].removeAttribute('data-actif');
      i = (i + 1) % vues.length;
      vues[i].setAttribute('data-actif', '1');
    }
    function demarrer() {
      if (minuteur || reduit.matches) return;
      minuteur = window.setInterval(suivante, duree);
    }
    function arreter() {
      if (!minuteur) return;
      window.clearInterval(minuteur);
      minuteur = null;
    }

    // Onglet en arrière-plan : on ne fait pas tourner un diaporama que
    // personne ne regarde.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) arreter(); else demarrer();
    });
    reduit.addEventListener && reduit.addEventListener('change', function () {
      if (reduit.matches) arreter(); else demarrer();
    });

    // Le décompte des trois secondes part quand le rideau de chargement a fini
    // de s'effacer, pas au chargement de la page : sinon la première vue est
    // déjà passée quand le visiteur découvre le hero. S'il n'y a pas de rideau
    // (pages légales, animations réduites, retour arrière), on démarre tout de
    // suite.
    var TNg = window.TN || {};
    if (!TNg.rideauParti && document.getElementById('loader')) {
      document.addEventListener('tn:rideau-parti', demarrer, { once: true });
    } else {
      demarrer();
    }
  }

  TN.diaporama = {
    init: function (contexte) {
      var els = (contexte || document).querySelectorAll('[data-diaporama]');
      Array.prototype.forEach.call(els, Diaporama);
    }
  };

  /* ---------- Rail horizontal ----------
     Une rangée qu'on fait glisser au doigt, et deux flèches pour qui n'y
     pense pas. On ne déplace rien à la main : `scrollBy` demande au
     navigateur d'avancer d'une carte, il garde son inertie, son
     `scroll-snap` et son rebond. Rien à débrancher au-delà du téléphone —
     le CSS y remet la grille, la piste ne déborde plus, les deux flèches se
     désactivent d'elles-mêmes et sont de toute façon masquées. */
  function Rail(racine) {
    var piste = racine.querySelector('[data-rail-piste]');
    var prec = racine.querySelector('[data-rail-prec]');
    var suiv = racine.querySelector('[data-rail-suiv]');
    if (!piste || !prec || !suiv) return;

    // Un pas = une carte et son écart. Mesuré à chaque clic, jamais retenu :
    // la largeur dépend de celle de l'écran, qui peut tourner.
    function pas() {
      var carte = piste.firstElementChild;
      if (!carte) return piste.clientWidth;
      var ecart = parseFloat(window.getComputedStyle(piste).columnGap);
      return carte.getBoundingClientRect().width + (ecart || 0);
    }

    function glisser(sens) {
      piste.scrollBy({
        left: sens * pas(),
        behavior: reduit.matches ? 'auto' : 'smooth'
      });
    }

    // Une flèche qui ne mène nulle part doit le dire. La tolérance d'un pixel
    // absorbe les largeurs fractionnaires : à fond à droite, `scrollLeft`
    // s'arrête parfois à un demi-pixel de la fin.
    function majEtat() {
      var reste = piste.scrollWidth - piste.clientWidth;
      prec.disabled = piste.scrollLeft <= 1;
      suiv.disabled = piste.scrollLeft >= reste - 1;
    }

    prec.addEventListener('click', function () { glisser(-1); });
    suiv.addEventListener('click', function () { glisser(1); });
    piste.addEventListener('scroll', majEtat, { passive: true });
    window.addEventListener('resize', majEtat);
    majEtat();
  }

  TN.rail = {
    init: function (contexte) {
      var els = (contexte || document).querySelectorAll('[data-rail]');
      Array.prototype.forEach.call(els, Rail);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    TN.carousel.init();
    TN.diaporama.init();
    TN.rail.init();
  });
})(window, document);
