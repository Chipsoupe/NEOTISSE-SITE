/*
 * Mesure d'audience : actions envoyées à Google Analytics (GA4).
 *
 * Rien n'est envoyé si le visiteur n'a pas accepté les cookies statistiques
 * (la balise GA4 n'est alors pas chargée, voir le haut de chaque page).
 *
 * Les noms suivent le plan de taggage du rapport Looker Studio : ne pas les
 * renommer sans mettre le rapport à jour (docs/SANITY.md, § 10).
 *
 *   Événement              Paramètres                    Déclencheur
 *   generate_lead          form_name                     formulaire de contact envoyé
 *   click_contact          contact_type, emplacement     lien mailto: (email), tel: (telephone),
 *                                                        adresse e-mail copiée (copie_email)
 *   inscription_evenement  activity_name, structure      « En savoir plus » d'un événement du calendrier
 *   submit_avis            —                             mot envoyé dans le livre d'or (livre-dor.js)
 *   click_atelier          activity_name, emplacement    atelier consulté : survol ≥ 1 s (ordinateur),
 *                                                        ouverture au toucher (mobile), dépliage à l'accueil
 *   clic_atelier_accueil   activity_name                 lien d'un atelier dans la liste de l'accueil
 *   clic_bouton_contact    emplacement, activity_name    tout lien vers la page Contact
 *   debut_formulaire       form_name                     premier champ rempli du formulaire de contact
 *   ouverture_article      article                       article des Actualités ouvert
 *   clic_reseau_social     reseau, emplacement           Instagram, Facebook…
 *
 * Tout est repéré d'après le HTML existant : un atelier ou un événement
 * ajouté dans Sanity est suivi sans rien modifier ici.
 */
(() => {
  const PAGES = {
    "/": "Accueil",
    "/ateliers/": "Ateliers",
    "/calendrier/": "Calendrier",
    "/actualites/": "Actualités",
    "/lassociation/": "L'association",
    "/livre-dor/": "Livre d'or",
    "/contact/": "Contact",
    "/confidentialite/": "Confidentialité",
  };
  const path = window.location.pathname.replace(/index\.html$/, "");
  const page = PAGES[path] || path;

  const clean = (text) => (text || "").replace(/\s+/g, " ").replace(/[↗→↓]/g, "").trim().slice(0, 100);

  // Envoi d'un événement (seulement si la balise GA4 est chargée).
  const track = (name, params = {}) => {
    if (!window.googleTagLoaded || typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
  };
  window.neotisseTrack = track;

  // « Accueil · Menu », « Ateliers · Carte atelier », « Accueil · Organiser un atelier »…
  const zoneOf = (el) => {
    if (el.closest(".thread-card")) return "Carte atelier";
    if (el.closest(".header-cta")) return "Bouton de l'en-tête";
    if (el.closest("header, nav")) return "Menu";
    if (el.closest("footer")) return "Pied de page";
    if (el.closest(".contact-info")) return "Coordonnées";
    const section = el.closest("section, aside, article");
    const heading = section?.querySelector("h1, h2, h3");
    // innerText : garde l'espace des <br> (« Organiser<br>un atelier »).
    return clean(heading?.innerText || heading?.textContent) || "Autre";
  };
  const placeOf = (el) => `${page} · ${zoneOf(el)}`;
  const atelierOf = (el) => clean(el.closest(".thread-card")?.querySelector(".thread-card__title")?.textContent);

  /* ---------- Clics ---------- */

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      const url = new URL(link.href, window.location.href);

      if (href.startsWith("mailto:")) {
        return track("click_contact", { contact_type: "email", emplacement: placeOf(link) });
      }
      if (href.startsWith("tel:")) {
        return track("click_contact", { contact_type: "telephone", emplacement: placeOf(link) });
      }

      if (link.dataset.social) {
        return track("clic_reseau_social", { reseau: link.dataset.social, emplacement: placeOf(link) });
      }

      if (url.origin === window.location.origin && url.pathname === "/contact/" && path !== "/contact/") {
        const params = { emplacement: placeOf(link) };
        const atelier = atelierOf(link);
        if (atelier) params.activity_name = atelier;
        return track("clic_bouton_contact", params);
      }

      // Accueil : lien d'un atelier dans la liste dépliable.
      if (link.closest(".atelier-list")) {
        return track("clic_atelier_accueil", { activity_name: clean(link.textContent) });
      }

      // Calendrier : lien vers la structure qui accueille l'événement.
      const box = link.closest("[data-next-event], [data-calendar-detail]");
      if (box && url.origin !== window.location.origin) {
        const title = box.querySelector("[data-next-title], h3");
        return track("inscription_evenement", {
          activity_name: clean(title?.textContent),
          structure: url.hostname.replace(/^www\./, ""),
        });
      }
    },
    true,
  );

  /* ---------- Adresse e-mail copiée ---------- */
  // Il n'y a pas de bouton « copier » : on repère une copie (Ctrl+C, clic
  // droit → Copier) dont le texte contient une adresse e-mail du site.

  document.addEventListener("copy", () => {
    const selection = window.getSelection();
    const text = String(selection || "");
    if (!text.includes("@")) return;
    const emails = [...document.querySelectorAll('a[href^="mailto:"]')]
      .map((a) => a.getAttribute("href").slice(7).split("?")[0].toLowerCase());
    if (!emails.some((email) => email && text.toLowerCase().includes(email))) return;
    const node = selection.anchorNode;
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    track("click_contact", { contact_type: "copie_email", emplacement: el ? placeOf(el) : page });
  });

  /* ---------- Actualités : articles ouverts ---------- */
  // Un article s'ouvre au clic sur sa card ou sur « Lire l'article »
  // (actualites.js) : on observe le bouton, qui passe à aria-expanded="true".

  const setupArticles = () => {
    document.querySelectorAll(".timeline__toggle").forEach((toggle) => {
      new MutationObserver(() => {
        if (toggle.getAttribute("aria-expanded") !== "true") return;
        const title = toggle.closest(".timeline__card, li, article")?.querySelector("h2, h3");
        track("ouverture_article", { article: clean(title?.textContent) });
      }).observe(toggle, { attributes: true, attributeFilter: ["aria-expanded"] });
    });
  };

  /* ---------- Ateliers consultés ---------- */
  // Une fois par atelier et par page vue : un passage rapide de la souris
  // ne compte pas, et revenir sur la même card ne gonfle pas les chiffres.

  const seen = new Set();
  const consulted = (atelier, emplacement) => {
    if (!atelier || seen.has(atelier)) return;
    seen.add(atelier);
    track("click_atelier", { activity_name: atelier, emplacement });
  };

  const setupAteliers = () => {
    if (path !== "/ateliers/" && path !== "/") return;
    document.querySelectorAll(".thread-card").forEach((card) => {
      const name = () => atelierOf(card);
      // Ordinateur : survol d'au moins 1 seconde.
      let timer;
      card.addEventListener("mouseenter", () => {
        timer = setTimeout(() => consulted(name(), page), 1000);
      });
      card.addEventListener("mouseleave", () => clearTimeout(timer));
      // Écran tactile : la card s'ouvre au toucher (classe is-open, fil.js).
      const row = card.closest(".thread-row");
      if (row) {
        new MutationObserver(() => {
          if (row.classList.contains("is-open")) consulted(name(), page);
        }).observe(row, { attributes: true, attributeFilter: ["class"] });
      }
    });

    // Accueil : dépliage d'un atelier dans la liste.
    document.querySelectorAll(".atelier-list details").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) consulted(clean(details.querySelector("summary a")?.textContent), page);
      });
    });
  };

  /* ---------- Formulaire de contact ---------- */

  const setupContactForm = () => {
    if (path !== "/contact/") return;
    const form = document.querySelector(".contact-form-card form");
    if (!form) return;
    form.addEventListener("input", () => track("debut_formulaire", { form_name: "contact" }), { once: true });
    // « submit » n'arrive que si les champs obligatoires sont remplis. Tant
    // que le formulaire n'est pas relié à Formspree (pas d'attribut action),
    // rien n'est envoyé : on ne compte pas de faux envois.
    form.addEventListener("submit", () => {
      // « beacon » : l'envoi part même si la page change aussitôt après.
      if (form.getAttribute("action")) {
        track("generate_lead", { form_name: "contact", transport_type: "beacon" });
      }
    });
  };

  const start = () => {
    setupAteliers();
    setupArticles();
    setupContactForm();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
