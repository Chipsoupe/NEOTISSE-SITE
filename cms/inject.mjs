/*
 * Injection du contenu Sanity dans les pages HTML (au build et en dev).
 *
 * Chaque page garde son HTML actuel : ce module remplace les textes, images
 * et listes repérés par leurs classes CSS. Un champ vide dans Sanity laisse
 * le contenu d'origine du fichier HTML (rien ne disparaît par accident),
 * sauf pour les listes (événements, actualités, avis…) qui reflètent
 * exactement ce qui est publié.
 */
import * as cheerio from "cheerio";
import { SANITY_IMAGE_PARAMS } from "./content.mjs";

/* ---------- Outils ---------- */

export const escapeHtml = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Texte simple ; un retour à la ligne dans Sanity devient un <br />.
const lines = (text) => escapeHtml(text).replace(/\r?\n/g, "<br />");

const attrs = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`))
    .join("");

/*
 * src / srcset / sizes d'une image Sanity, d'après sa taille d'affichage :
 * - widths : largeurs voulues (jamais plus que l'original) ;
 * - sizes  : attribut sizes (largeur affichée selon l'écran) ;
 * - height : hauteur maximale (logos : boîte w × h, sans recadrage).
 * Sans `base` (contenu de test), l'URL déjà fournie est gardée.
 */
const responsive = (image, { widths, sizes, height } = {}) => {
  if (!widths || !image.base) return { src: image.url };
  let list = image.width ? widths.filter((w) => w <= image.width) : widths;
  if (!list.length) list = [image.width];
  const url = (w) => `${image.base}?w=${w}${height ? `&h=${height}` : ""}&${SANITY_IMAGE_PARAMS}`;
  if (list.length === 1) return { src: url(list[0]) };
  return {
    src: url(list[0]),
    srcset: list.map((w) => `${url(w)} ${w}w`).join(", "),
    sizes,
  };
};

// Largeurs et sizes des images, d'après style.css.
const FULL_WIDTH = { widths: [800, 1600], sizes: "100vw" };
const HALF_WIDTH = { widths: [800, 1600], sizes: "(max-width: 800px) 100vw, 50vw" };
const PROMISE_CARD = { widths: [800, 1600], sizes: "(max-width: 800px) 100vw, 65vw" };
const THUMBNAIL = { widths: [240] }; // .atelier-detail img : 120 × 90 px
const PARTNER_LOGO = { widths: [260], height: 140 }; // .partners img : 130 × 70 px max

const imgTag = (image, extra = {}) => {
  if (!image?.url) return "";
  const { responsive: options, ...rest } = extra;
  const loading = rest.loading ?? "lazy";
  return `<img${attrs({
    ...responsive(image, options),
    alt: rest.alt ?? image.alt ?? "",
    loading,
    decoding: loading === "lazy" ? "async" : undefined,
    style: image.focus ? `object-position: ${image.focus}` : undefined,
    ...Object.fromEntries(Object.entries(rest).filter(([k]) => !["alt", "loading"].includes(k))),
  })} />`;
};

const monthsShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const parseDate = (value) => {
  const [y, m, d] = String(value).split("-").map(Number);
  return { y, m, d };
};

/* ---------- Remplacements génériques ---------- */

const makeHelpers = ($) => ({
  // Remplace le contenu d'un élément par un texte (si le texte existe).
  text(selector, value) {
    if (typeof value === "string" && value.trim()) $(selector).first().html(lines(value.trim()));
  },
  // Remplace une image (src, alt, cadrage) si une image est fournie.
  // Les autres attributs (classes, loading, data-parallax…) sont gardés.
  image(selector, image, { keepAlt = false, ...options } = {}) {
    if (!image?.url) return null;
    const el = $(selector).first();
    if (!el.length) return null;
    const { src, srcset, sizes } = responsive(image, options);
    el.attr("src", src);
    if (srcset) el.attr("srcset", srcset).attr("sizes", sizes);
    else el.removeAttr("srcset").removeAttr("sizes");
    if (!keepAlt) el.attr("alt", image.alt || "");
    if (image.focus) el.attr("style", `object-position: ${image.focus}`);
    return { src, srcset, sizes };
  },
  // Remplace le contenu d'un bloc JSON <script type="application/json">.
  json(id, data) {
    const el = $(`script#${id}`);
    if (el.length) {
      const body = JSON.stringify(data, null, 2)
        .replace(/</g, "\\u003c")
        .split("\n")
        .map((line) => `        ${line}`)
        .join("\n");
      el.html(`\n${body}\n      `);
    }
  },
});

/* ---------- Parties communes (footer, e-mail) ---------- */

const injectCommon = ($, content, h) => {
  const { settings, ateliers } = content;
  h.text(".footer-about p", settings.footerText);

  // Réseaux sociaux du footer (l'icône reste si le champ est vide).
  for (const network of ["facebook", "instagram"]) {
    if (settings[network]) $(`.footer-social a[data-social="${network}"]`).attr("href", settings[network]);
  }

  if (settings.email) {
    $('a[href^="mailto:"]').each((_, a) => {
      $(a).attr("href", `mailto:${settings.email}`).text(settings.email);
    });
  }

  // Footer, colonne « Ateliers » : un lien par atelier.
  if (ateliers.length) {
    const list = $(".footer-links > div")
      .filter((_, div) => $(div).find("h2").text().trim() === "Ateliers")
      .find("ul");
    list.html(
      ateliers
        .map((a) => `\n              <li><a href="/ateliers/#${escapeHtml(a.slug)}">${escapeHtml(a.shortName)}</a></li>`)
        .join("") + "\n            ",
    );
  }
};

/* ---------- Pages ---------- */

const injectAccueil = ($, content, h) => {
  const p = content.pages.accueil || {};
  h.text(".hero__content h1", p.heroTitle);
  h.text(".hero__content p", p.heroText);
  // Hero : image du LCP, préchargée dans le <head> avec les mêmes URL.
  const hero = h.image(".hero > img", p.heroImage, FULL_WIDTH);
  if (hero) {
    const preload = $("link[data-hero-preload]");
    preload.attr("href", hero.src);
    if (hero.srcset) preload.attr("imagesrcset", hero.srcset).attr("imagesizes", hero.sizes);
    else preload.removeAttr("imagesrcset").removeAttr("imagesizes");
  }
  h.text(".intro__content p", p.introText);

  (p.promises || []).forEach((promise, i) => {
    const card = `.promises .image-card:nth-of-type(${i + 1})`;
    h.text(`${card} h2`, promise.title);
    h.text(`${card} p`, promise.text);
    h.image(`${card} > img`, promise.image, PROMISE_CARD);
  });

  // Partenaires : deux groupes identiques pour le défilement en boucle.
  h.text(".partners h2", p.partnersTitle);
  if (content.partners.length) {
    const logos = (hidden) =>
      content.partners
        .filter((partner) => partner.logo?.url)
        // Le 2e groupe (copie pour la boucle) est masqué aux lecteurs d'écran
        // (alt vide) ; le 1er porte le nom du partenaire : c'est une info.
        .map((partner) => `\n              ${imgTag(partner.logo, {
          alt: hidden ? "" : partner.name || partner.logo.alt,
          responsive: PARTNER_LOGO,
        })}`)
        .join("");
    $(".partners__track").html(
      `\n            <div class="partners__group">${logos(false)}\n            </div>` +
        `\n            <div class="partners__group" aria-hidden="true">${logos(true)}\n            </div>\n          `,
    );
  }

  // Ateliers (liste dépliable).
  h.text(".atelier-feature h2", p.ateliersTitle);
  h.image(".atelier-feature__image img", p.ateliersImage, HALF_WIDTH);
  if (content.ateliers.length) {
    $(".atelier-list").html(
      content.ateliers
        .map(
          (a) => `
            <details id="${escapeHtml(a.slug)}">
              <summary>
                <a href="/ateliers/#${escapeHtml(a.slug)}">${escapeHtml(a.name)}</a><span aria-hidden="true">↗</span>
              </summary>
              <div class="atelier-detail">
                ${imgTag(a.homeImage || a.image, { responsive: THUMBNAIL })}
                <p>${lines(a.summary)}</p>
              </div>
            </details>`,
        )
        .join("") + "\n          ",
    );
  }

  h.text(".publics h2", p.publicsTitle);
  h.text(".publics > div > p", p.publicsText);
  h.image(".publics > img", p.publicsImage, FULL_WIDTH);

  // Prochaines dates : les trois prochains événements.
  h.text(".dates > h2", p.datesTitle);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = content.events.filter((e) => (e.end || e.start) >= today);
  const rows = upcoming
    .slice(0, 3)
    .map((e) => {
      const { m, d } = parseDate(e.start);
      const meta = [e.location, e.audience].filter(Boolean).join(" – ");
      return `
            <div class="date-row">
              <strong>${d === 1 ? "1er" : d}<small>${monthsShort[m - 1].toUpperCase()}</small></strong>
              <p>${escapeHtml(e.title)}${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</p>
              <a href="/calendrier/">Voir <span>↗</span></a>
            </div>`;
    })
    .join("");
  const list = $(".dates-list");
  if (list.length) {
    list.find(".date-row, .dates-empty").remove();
    list
      .find(".eyebrow")
      .after(rows || `\n            <p class="dates-empty">Les prochaines dates seront bientôt annoncées.</p>`);
  }
  const next = upcoming[0];
  const card = $(".event-card");
  if (next) {
    const { y, m } = parseDate(next.start);
    const month = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    card.html(`
            <p>${escapeHtml(month.charAt(0).toUpperCase() + month.slice(1))}</p>
            <h3>${escapeHtml(next.title)}</h3>
            <span>${escapeHtml(next.location)}</span>
          `);
  } else {
    card.remove();
  }

  // Témoignages : les avis mis en avant (sinon les plus récents).
  h.text(".testimonial h2", p.testimonialTitle);
  h.image(".testimonial > img", p.testimonialImage, { keepAlt: true, ...FULL_WIDTH });
  const featured = content.reviews.filter((r) => r.featured);
  const quotes = (featured.length ? featured : content.reviews).slice(0, 6);
  if (quotes.length) {
    $(".testimonial-track").html(
      quotes
        .map(
          (r) => `
            <blockquote>
              <span>“${escapeHtml(r.text)}”</span>
              <cite><strong>${escapeHtml(r.name)}</strong>${r.structure ? `<br />${escapeHtml(r.structure)}` : ""}</cite>
            </blockquote>`,
        )
        .join("") + "\n          ",
    );
  }

  h.text(".contact-copy h2", p.contactTitle);
  h.text(".contact-copy p", p.contactText);
  h.image(".contact-section > img", p.contactImage, FULL_WIDTH);
};

const injectAteliers = ($, content, h) => {
  const p = content.pages.ateliers || {};
  h.text(".atelier-hero h1", p.heroTitle);
  h.text(".atelier-hero p", p.heroText);
  h.image(".atelier-hero img", p.heroImage);
  h.text("#thread-journey-title", p.listTitle);
  h.text(".thread-journey__cta h2", p.ctaTitle);
  h.text(".thread-journey__cta p", p.ctaText);

  if (content.ateliers.length) {
    $(".thread-journey__list").html(
      content.ateliers
        .map(
          (a, i) => `
          <li class="thread-row" id="${escapeHtml(a.slug)}" data-side="${i % 2 ? "left" : "right"}">
            <article class="thread-card">
              <div class="thread-card__media">
                ${imgTag(a.image)}
              </div>
              <div class="thread-card__body">
                <h3 class="thread-card__title">${escapeHtml(a.title)}</h3>
                <a class="thread-card__go" href="/contact/" aria-label="Organiser cet atelier : ${escapeHtml(a.title)}"><span aria-hidden="true">↗</span></a>
                <div class="thread-card__detail">
                  <div class="thread-card__detail-inner">
                    ${a.description.map((text) => `<p>${lines(text)}</p>`).join("\n                    ")}
                  </div>
                </div>
              </div>
            </article>
          </li>`,
        )
        .join("\n") + "\n        ",
    );
  }
};

const injectCalendrier = ($, content, h) => {
  const p = content.pages.calendrier || {};
  h.text(".calendar-hero h1", p.heroTitle);
  h.text(".calendar-hero p", p.heroText);
  h.image(".calendar-hero img", p.heroImage);
  h.text(".calendar-welcome h2", p.welcomeTitle);
  h.text(".calendar-welcome p", p.welcomeText);
  h.json(
    "calendar-events",
    content.events.map((e) => ({
      start: e.start,
      end: e.end,
      title: e.title,
      location: e.location || undefined,
      audience: e.audience || undefined,
      url: e.url || undefined,
      site: e.site || undefined,
      image: e.image?.url || undefined,
    })),
  );
};

const injectEquipe = ($, content, h) => {
  const p = content.pages.equipe || {};
  h.text(".team-hero h1", p.heroTitle);
  h.text(".team-hero p", p.heroText);
  h.image(".team-hero img", p.heroImage);
  h.text(".team-members__intro h2", p.membersTitle);
  h.text(".team-members__intro p", p.membersText);
  h.text(".team-loom__intro h2", p.engagementsTitle);
  h.text(".team-loom__intro p", p.engagementsText);
  h.text(".team-contact h2", p.contactTitle);
  h.text(".team-contact p", p.contactText);
  h.json(
    "team-members",
    content.team.map((m) => ({
      name: m.name,
      role: m.role,
      photo: m.photo?.url,
      focus: m.photo?.focus || undefined,
      alt: m.photo?.alt || "",
      bio: m.bio,
    })),
  );
  h.json(
    "team-engagements",
    content.engagements.map((e) => ({
      label: e.label,
      title: e.title,
      text: e.text,
      image: e.image?.url,
    })),
  );
};

const injectActualites = ($, content, h) => {
  const p = content.pages.actualites || {};
  h.text(".news-heading h1", p.heroTitle);
  h.text(".news-heading > p", p.heroText);
  h.image(".news-heading img", p.heroImage, { keepAlt: true });
  h.text(".news-contact h2", p.ctaTitle);
  h.text(".news-contact p", p.ctaText);

  $("[data-timeline]").html(
    content.news
      .map((n, i) => {
        const { y, m, d } = parseDate(n.date);
        const id = escapeHtml(n.slug);
        const body = n.body.length
          ? n.body.map((html) => `<p>${html}</p>`).join("\n                    ")
          : `<p class="timeline__todo">Texte complet de l’article à venir.</p>`;
        return `
          <li class="timeline__item" id="${id}">
            <time class="timeline__date" datetime="${escapeHtml(n.date)}"><span class="timeline__day">${d === 1 ? "1er" : d} ${monthsShort[m - 1]}</span><span class="timeline__year">${y}</span></time>
            <article class="timeline__card">
              ${n.image ? `<div class="timeline__media">\n                ${imgTag(n.image, { loading: i === 0 ? "eager" : "lazy" })}\n              </div>` : ""}
              <div class="timeline__body">
                <h2 class="timeline__title">${escapeHtml(n.title)}</h2>
                <p class="timeline__excerpt">${lines(n.excerpt)}</p>
                <div class="timeline__article" id="${id}-article">
                  <div class="timeline__article-inner">
                    ${body}
                  </div>
                </div>
                <button class="timeline__toggle" type="button" aria-expanded="false" aria-controls="${id}-article">
                  <span data-toggle-label>Lire l’article</span>
                  <span class="timeline__toggle-icon" aria-hidden="true">↓</span>
                </button>
              </div>
            </article>
          </li>`;
      })
      .join("\n") + "\n        ",
  );
};

const injectLivreDor = ($, content, h) => {
  const p = content.pages.livreDor || {};
  h.text(".book-stage__head h1", p.heroTitle);
  h.text(".book-stage__head p", p.heroText);
  h.text(".book__page--left h2", p.invitationTitle);
  h.text(".book__page--left > p", p.invitationText);
  h.text("#guestbook-title", p.sheetsTitle);
  h.text(".guestbook-contact h2", p.ctaTitle);
  h.text(".guestbook-contact p", p.ctaText);

  // Feuilles d'avis, légèrement inclinées (inclinaison fixe par avis).
  const tilts = [-3, 2, -1.5, 2.5, -2, 1.5];
  $("[data-sheets]").html(
    content.reviews
      .map(
        (r, i) => `
          <li class="sheet" style="--tilt: ${tilts[i % tilts.length]}deg">
            <blockquote>
              <p>« ${escapeHtml(r.text)} »</p>
              <cite><strong>${escapeHtml(r.name)}</strong>${r.structure ? ` · ${escapeHtml(r.structure)}` : ""}</cite>
            </blockquote>
          </li>`,
      )
      .join("") + "\n        ",
  );
};

const injectContact = ($, content, h) => {
  const p = content.pages.contact || {};
  h.text(".contact-intro h1", p.heroTitle);
  h.text(".contact-intro p", p.heroText);
  h.image(".contact-intro > img", p.heroImage);

  const { settings } = content;
  const info = $(".contact-info");
  if (info.length && (settings.email || settings.phones.length || settings.area)) {
    const cards = [];
    if (settings.email) {
      cards.push(`
          <div class="contact-info-card">
            <a href="mailto:${escapeHtml(settings.email)}">${escapeHtml(settings.email)}</a>
          </div>`);
    }
    for (const phone of settings.phones) {
      const tel = phone.number.replace(/[^\d+]/g, "").replace(/^0/, "+33");
      cards.push(`
          <div class="contact-info-card">
            <a href="tel:${escapeHtml(tel)}">${escapeHtml(phone.number)}</a>${phone.label ? `\n            <p>${escapeHtml(phone.label)}</p>` : ""}
          </div>`);
    }
    if (settings.area) {
      cards.push(`
          <div class="contact-info-card contact-info-card--dark">
            <p>${escapeHtml(settings.area)}</p>
          </div>`);
    }
    info.html(cards.join("") + "\n        ");
  }
};

// Page → fonction, d'après le chemin du fichier (« ateliers/index.html »…).
const PAGES = {
  "index.html": injectAccueil,
  "ateliers/index.html": injectAteliers,
  "calendrier/index.html": injectCalendrier,
  "lassociation/index.html": injectEquipe,
  "actualites/index.html": injectActualites,
  "livre-dor/index.html": injectLivreDor,
  "contact/index.html": injectContact,
};

export const injectPage = (html, pagePath, content) => {
  const key = pagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const $ = cheerio.load(html, { decodeEntities: false }, true);
  const h = makeHelpers($);
  injectCommon($, content, h);
  PAGES[key]?.($, content, h);
  return $.html();
};
