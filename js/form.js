/* ============================================================
   T'NATURE — Formulaire de contact
   Validation en français, messages inline (jamais d'alert()),
   piège à robots (honeypot), et repli mailto: fonctionnel tant
   qu'aucun service d'envoi n'est branché.

   BRANCHEMENT DU SERVICE D'ENVOI — une seule ligne à changer :
   dans index.html, renseigner l'attribut `action` du <form> avec
   l'URL du service (Formspree, Netlify Forms, Web3Forms…) et mettre
   `data-envoi="service"`. Sans cela, le repli mailto: prend le relais.
   Voir README.md §« Brancher le formulaire ».
   ============================================================ */
(function (window, document) {
  'use strict';
  var TN = window.TN = window.TN || {};

  var form = document.getElementById('form-contact');
  if (!form) return;

  var zoneMessage = document.getElementById('form-message');
  var appat = form.querySelector('[name="_appat"]');

  var LIBELLES = {
    'f-nom': 'votre nom et prénom',
    'f-email': 'votre adresse email',
    'f-tel': 'votre numéro de téléphone'
  };

  function erreurDe(champ) {
    return document.getElementById(champ.id + '-erreur');
  }

  function poserErreur(champ, texte) {
    champ.setAttribute('aria-invalid', 'true');
    var zone = erreurDe(champ);
    if (zone) zone.textContent = texte;
  }

  function nettoyerErreur(champ) {
    champ.removeAttribute('aria-invalid');
    var zone = erreurDe(champ);
    if (zone) zone.textContent = '';
  }

  function valideEmail(v) {
    // Volontairement permissif : on refuse l'évidemment faux, pas plus.
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function validerChamp(champ) {
    var v = (champ.value || '').trim();

    if (champ.hasAttribute('required')) {
      if (champ.type === 'checkbox' && !champ.checked) {
        poserErreur(champ, 'Merci de cocher cette case pour nous écrire.');
        return false;
      }
      if (champ.type !== 'checkbox' && v === '') {
        poserErreur(champ, 'Merci d’indiquer ' + (LIBELLES[champ.id] || 'ce champ') + '.');
        return false;
      }
    }
    if (champ.type === 'email' && v !== '' && !valideEmail(v)) {
      poserErreur(champ, 'Cette adresse email ne semble pas valide.');
      return false;
    }
    // Le champ est facultatif — sauf quand une prestation « sur demande » est
    // cochée : là, il faut décrire ce qu'on souhaite.
    if (champ.id === 'f-message' && demandeADecrire() && v.length < 15) {
      poserErreur(champ, 'Décrivez la prestation que vous souhaitez : c’est à partir '
        + 'de là que nous pourrons vous répondre.');
      return false;
    }
    nettoyerErreur(champ);
    return true;
  }

  /* Cohérence des dates : le départ ne peut pas précéder l'arrivée. */
  function validerDates() {
    var a = document.getElementById('f-arrivee');
    var d = document.getElementById('f-depart');
    if (!a || !d || !a.value || !d.value) { if (d) nettoyerErreur(d); return true; }
    if (d.value < a.value) {
      poserErreur(d, 'La date de départ doit suivre la date d’arrivée.');
      return false;
    }
    nettoyerErreur(d);
    return true;
  }

  var select = document.getElementById('f-formule');
  var cases = Array.prototype.slice.call(form.querySelectorAll('[name="prestations"]'));
  var aideMessage = document.getElementById('f-message-aide');

  function estMaisonEntiere() {
    return !!select && select.value.indexOf('Maison entière') === 0;
  }

  /* Une chambre est choisie : ni « Maison entière », ni « Je ne sais pas encore ». */
  function estChambre() {
    if (!select) return false;
    var v = select.value;
    return v !== '' && v !== 'Je ne sais pas encore' && !estMaisonEntiere();
  }

  /* Une case verrouillée reste cochée mais n'est plus modifiable. `disabled`
     est ce qui convient à l'usage — au clavier comme à la souris — mais un
     champ désactivé n'est pas envoyé : on double donc la case d'un champ
     caché, pour que la valeur parte quand même le jour où un service d'envoi
     remplacera le repli mailto:. */
  function miroirCache(c, actif) {
    var id = c.id + '-cache';
    var existant = document.getElementById(id);
    if (!actif) {
      if (existant) existant.parentNode.removeChild(existant);
      return;
    }
    if (existant) return;
    var cache = document.createElement('input');
    cache.type = 'hidden';
    cache.id = id;
    cache.name = c.name;
    cache.value = c.value;
    c.parentNode.appendChild(cache);
  }

  /* Ce que le visiteur a coché de lui-même. Une case peut être forcée par la
     formule choisie ; le jour où il en change, il faut pouvoir lui rendre son
     choix à lui, et non celui que la règle avait imposé. */
  cases.forEach(function (c) { c.voulu = c.checked; });

  /* Les petits déjeuners suivent la formule choisie :
       — une chambre  : ils sont compris dans le prix → cochés et verrouillés ;
       — maison entière : ils ne sont pas compris, mais restent proposés en
         supplément → la case redevient libre, et sa note dit à quel titre ;
       — pas de choix : libre. */
  function appliquerReglesPrestations() {
    var chambre = estChambre();
    var maison = estMaisonEntiere();
    cases.forEach(function (c) {
      var inclus = c.getAttribute('data-inclus-chambre') === '1' && chambre;
      var enSupplement = maison ? (c.getAttribute('data-note-maison') || '') : '';
      c.disabled = inclus;
      c.checked = inclus || c.voulu;
      miroirCache(c, inclus);

      var etiquette = c.closest('.case-presta');
      if (!etiquette) return;
      etiquette.classList.toggle('case-presta--incluse', inclus);
      var etat = etiquette.querySelector('[data-etat]');
      if (!etat) return;
      etat.textContent = inclus ? 'compris dans le prix de la chambre' : enSupplement;
      etat.hidden = !etat.textContent;
    });
    majAideMessage();
  }

  /* « Autres prestations sur demande » : la demande doit être décrite. Le champ
     « Informations supplémentaires » est facultatif partout ailleurs ; cocher
     cette case le rend obligatoire, plutôt que d'ajouter un champ de plus. */
  function demandeADecrire() {
    return cases.some(function (c) {
      return c.checked && c.getAttribute('data-exige-message') === '1';
    });
  }

  function majAideMessage() {
    if (aideMessage) aideMessage.hidden = !demandeADecrire();
  }

  cases.forEach(function (c) {
    c.addEventListener('change', function () { c.voulu = c.checked; majAideMessage(); });
  });
  if (select) select.addEventListener('change', appliquerReglesPrestations);

  var champs = Array.prototype.slice.call(
    form.querySelectorAll('input:not([type="hidden"]), select, textarea')
  ).filter(function (c) { return c.name !== '_appat'; });

  champs.forEach(function (champ) {
    champ.addEventListener('blur', function () { validerChamp(champ); validerDates(); });
    champ.addEventListener('input', function () {
      if (champ.getAttribute('aria-invalid') === 'true') validerChamp(champ);
    });
  });

  function messageInline(type, texte) {
    if (!zoneMessage) return;
    zoneMessage.setAttribute('data-type', type);
    zoneMessage.textContent = texte;
  }

  /* Repli mailto: — construit un courriel prérempli lisible. */
  function corpsMail(donnees) {
    var l = [];
    l.push('Nom : ' + (donnees['nom'] || ''));
    l.push('Email : ' + (donnees['email'] || ''));
    if (donnees['telephone']) l.push('Téléphone : ' + donnees['telephone']);
    if (donnees['formule']) l.push('Formule : ' + donnees['formule']);
    if (donnees['prestations']) l.push('Prestations : ' + donnees['prestations']);
    if (donnees['arrivee']) l.push('Arrivée : ' + donnees['arrivee']);
    if (donnees['depart']) l.push('Départ : ' + donnees['depart']);
    if (donnees['personnes']) l.push('Nombre de personnes : ' + donnees['personnes']);
    if (donnees['message']) {
      l.push('');
      l.push('Informations supplémentaires :');
      l.push(donnees['message']);
    }
    return l.join('\n');
  }

  form.addEventListener('submit', function (e) {
    // Piège à robots : rempli = on ignore silencieusement.
    if (appat && appat.value !== '') { e.preventDefault(); return; }

    var ok = true;
    champs.forEach(function (champ) { if (!validerChamp(champ)) ok = false; });
    if (!validerDates()) ok = false;

    if (!ok) {
      e.preventDefault();
      messageInline('erreur', 'Le formulaire est incomplet : les champs signalés en rose demandent une correction.');
      var premier = form.querySelector('[aria-invalid="true"]');
      if (premier) premier.focus();
      return;
    }

    messageInline('', '');

    // Aucun service d'envoi branché : on passe par le client mail.
    if (form.getAttribute('data-envoi') !== 'service') {
      e.preventDefault();
      var d = {};
      champs.forEach(function (c) {
        if (c.type === 'checkbox') return;
        d[c.name] = (c.value || '').trim();
      });
      // Les cases à cocher forment un groupe : on les rassemble en une ligne.
      var choisies = cases.filter(function (c) { return c.checked; })
        .map(function (c) { return c.value; });
      if (choisies.length) d['prestations'] = choisies.join(', ');
      var sujet = 'Demande de réservation — ' + (d['formule'] || 'T’Nature');
      var url = 'mailto:itinerancenature@orange.fr'
        + '?subject=' + encodeURIComponent(sujet)
        + '&body=' + encodeURIComponent(corpsMail(d));
      window.location.href = url;
      messageInline('succes',
        'Votre logiciel de messagerie s’ouvre avec votre demande préremplie. '
        + 'Si rien ne se passe, écrivez-nous directement à itinerancenature@orange.fr '
        + 'ou appelez le 06 30 53 30 82.');
      return;
    }
    // data-envoi="service" : on laisse le navigateur poster vers `action`.
  });

  appliquerReglesPrestations();

  /* — Préremplissage depuis les modales chambres et prestations — */
  TN.form = {
    /* Remise à zéro complète : les champs, les erreurs affichées, le bandeau de
       statut. Appelée avant chaque préremplissage — une demande ne doit jamais
       hériter de la précédente, ni traîner l'erreur d'un envoi raté. */
    reinitialiser: function () {
      form.reset();
      cases.forEach(function (c) { c.voulu = c.checked; });
      champs.forEach(nettoyerErreur);
      messageInline('', '');
      appliquerReglesPrestations();
    },

    /* `formule` est la valeur exacte d'une option de la liste — les boutons des
       modales la reçoivent du générateur, il n'y a donc pas de table de
       correspondance à tenir à jour. `presta` coche une case.
       Rien n'est écrit dans « Informations supplémentaires » : c'est au visiteur
       d'y mettre ce qu'il veut, et la fiche demandée se lit déjà dans Formule. */
    prefill: function (formule, presta) {
      if (select && formule) {
        Array.prototype.forEach.call(select.options, function (o) {
          if (o.value === formule) select.value = o.value;
        });
        appliquerReglesPrestations();
      }
      if (presta) {
        cases.forEach(function (c) {
          if (c.value !== presta || c.disabled) return;
          c.checked = true;
          c.voulu = true;
        });
        majAideMessage();
      }
    }
  };
})(window, document);
