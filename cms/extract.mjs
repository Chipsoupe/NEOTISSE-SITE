/*
 * Lit le contenu actuellement écrit dans les pages HTML et le met dans le
 * même format que fetchContent() (content.mjs).
 *
 * Sert à l'import initial dans Sanity (scripts/sanity-import.mjs) et aux
 * tests du build sans Sanity (SANITY_FIXTURE).
 */
import * as cheerio from "cheerio";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./config.mjs";

const load = (page) => cheerio.load(readFileSync(join(ROOT, page), "utf8"));

// Texte d'un élément : <br> → retour à la ligne, espaces normalisés.
const textOf = ($, selector) => {
  const el = $(selector).first().clone();
  if (!el.length) return "";
  el.find("br").replaceWith("\u0001");
  return el
    .text()
    .replace(/\s+/g, " ")
    .split("\u0001")
    .map((line) => line.trim())
    .join("\n")
    .trim();
};

const imageOf = ($, selector) => {
  const el = $(selector).first();
  if (!el.length || !el.attr("src")) return null;
  const focus = (el.attr("style") || "").match(/object-position:\s*([^;]+)/)?.[1]?.trim() || null;
  return { url: el.attr("src"), alt: el.attr("alt") || "", focus };
};

const json = ($, id) => JSON.parse($(`script#${id}`).text() || "[]");

export const extractContent = () => {
  const home = load("index.html");
  const ateliers = load("ateliers/index.html");
  const calendrier = load("calendrier/index.html");
  const equipe = load("lassociation/index.html");
  const actualites = load("actualites/index.html");
  const livre = load("livre-dor/index.html");
  const contact = load("contact/index.html");

  /* Paramètres du site */
  const phones = contact(".contact-info-card")
    .toArray()
    .map((card) => contact(card))
    .filter((card) => card.find('a[href^="tel:"]').length)
    .map((card) => ({
      number: card.find('a[href^="tel:"]').text().trim(),
      label: card.find("p").text().replace(/\s+/g, " ").trim(),
    }));
  const settings = {
    email: contact('.contact-info a[href^="mailto:"]').first().text().trim(),
    phones,
    footerText: textOf(home, ".footer-about p"),
    area: textOf(contact, ".contact-info-card--dark p"),
  };

  /* Textes des pages */
  const pages = {
    accueil: {
      heroTitle: textOf(home, ".hero__content h1"),
      heroText: textOf(home, ".hero__content p"),
      heroImage: imageOf(home, ".hero > img"),
      introText: textOf(home, ".intro__content p"),
      promises: home(".promises .image-card")
        .toArray()
        .map((card) => {
          const $card = home(card);
          return {
            title: $card.find("h2").text().trim(),
            text: $card.find("p").text().replace(/\s+/g, " ").trim(),
            image: imageOf(home, $card.children("img")),
          };
        }),
      partnersTitle: textOf(home, ".partners h2"),
      ateliersTitle: textOf(home, ".atelier-feature h2"),
      ateliersImage: imageOf(home, ".atelier-feature__image img"),
      publicsTitle: textOf(home, ".publics h2"),
      publicsText: textOf(home, ".publics > div > p"),
      publicsImage: imageOf(home, ".publics > img"),
      datesTitle: textOf(home, ".dates > h2"),
      testimonialTitle: textOf(home, ".testimonial h2"),
      testimonialImage: imageOf(home, ".testimonial > img"),
      contactTitle: textOf(home, ".contact-copy h2"),
      contactText: textOf(home, ".contact-copy p"),
      contactImage: imageOf(home, ".contact-section > img"),
    },
    ateliers: {
      heroTitle: textOf(ateliers, ".atelier-hero h1"),
      heroText: textOf(ateliers, ".atelier-hero p"),
      heroImage: imageOf(ateliers, ".atelier-hero img"),
      listTitle: textOf(ateliers, "#thread-journey-title"),
      ctaTitle: textOf(ateliers, ".thread-journey__cta h2"),
      ctaText: textOf(ateliers, ".thread-journey__cta p"),
    },
    calendrier: {
      heroTitle: textOf(calendrier, ".calendar-hero h1"),
      heroText: textOf(calendrier, ".calendar-hero p"),
      heroImage: imageOf(calendrier, ".calendar-hero img"),
      welcomeTitle: textOf(calendrier, ".calendar-welcome h2"),
      welcomeText: textOf(calendrier, ".calendar-welcome p"),
    },
    equipe: {
      heroTitle: textOf(equipe, ".team-hero h1"),
      heroText: textOf(equipe, ".team-hero p"),
      heroImage: imageOf(equipe, ".team-hero img"),
      membersTitle: textOf(equipe, ".team-members__intro h2"),
      membersText: textOf(equipe, ".team-members__intro p"),
      engagementsTitle: textOf(equipe, ".team-loom__intro h2"),
      engagementsText: textOf(equipe, ".team-loom__intro p"),
      contactTitle: textOf(equipe, ".team-contact h2"),
      contactText: textOf(equipe, ".team-contact p"),
    },
    actualites: {
      heroTitle: textOf(actualites, ".news-heading h1"),
      heroText: textOf(actualites, ".news-heading > p"),
      heroImage: imageOf(actualites, ".news-heading img"),
      ctaTitle: textOf(actualites, ".news-contact h2"),
      ctaText: textOf(actualites, ".news-contact p"),
    },
    livreDor: {
      heroTitle: textOf(livre, ".book-stage__head h1"),
      heroText: textOf(livre, ".book-stage__head p"),
      invitationTitle: textOf(livre, ".book__page--left h2"),
      invitationText: textOf(livre, ".book__page--left > p"),
      sheetsTitle: textOf(livre, "#guestbook-title"),
      ctaTitle: textOf(livre, ".guestbook-contact h2"),
      ctaText: textOf(livre, ".guestbook-contact p"),
    },
    contact: {
      heroTitle: textOf(contact, ".contact-intro h1"),
      heroText: textOf(contact, ".contact-intro p"),
      heroImage: imageOf(contact, ".contact-intro > img"),
    },
  };

  /* Événements */
  const events = json(calendrier, "calendar-events").map((e) => ({
    title: e.title,
    start: e.start,
    end: e.end || e.start,
    location: e.location || "",
    audience: e.audience || "",
    site: e.site || "",
    url: e.url || "",
    image: e.image ? { url: e.image, alt: "", focus: null } : null,
  }));

  /* Actualités */
  const news = actualites("[data-timeline] > .timeline__item")
    .toArray()
    .map((item) => {
      const $item = actualites(item);
      return {
        slug: $item.attr("id"),
        date: $item.find("time").attr("datetime"),
        title: $item.find(".timeline__title").text().replace(/\s+/g, " ").trim(),
        excerpt: $item.find(".timeline__excerpt").text().replace(/\s+/g, " ").trim(),
        body: $item
          .find(".timeline__article-inner p:not(.timeline__todo)")
          .toArray()
          .map((p) => actualites(p).html().trim()),
        image: imageOf(actualites, $item.find(".timeline__media img")),
      };
    });

  /* Avis du livre d’or (tous mis en avant sur l’accueil au départ) */
  const reviews = livre("[data-sheets] .sheet")
    .toArray()
    .map((sheet, index) => {
      const $sheet = livre(sheet);
      const cite = $sheet.find("cite");
      return {
        name: cite.find("strong").text().trim(),
        structure: cite.text().replace(cite.find("strong").text(), "").replace(/^[\s·]+/, "").trim(),
        text: $sheet.find("blockquote > p").text().trim().replace(/^«\s*/, "").replace(/\s*»$/, ""),
        featured: true,
      };
    });

  /* Équipe et engagements */
  const team = json(equipe, "team-members").map((m) => ({
    name: m.name,
    role: m.role,
    photo: { url: m.photo, alt: m.alt || "", focus: m.focus || null },
    bio: m.bio || [],
  }));
  const engagements = json(equipe, "team-engagements").map((e) => ({
    label: e.label,
    title: e.title,
    text: e.text,
    image: e.image ? { url: e.image, alt: "", focus: null } : null,
  }));

  /* Partenaires (logos dorés de l'accueil) */
  const partners = home(".partners__group:not([aria-hidden]) img")
    .toArray()
    .map((img) => ({
      name: home(img).attr("alt"),
      url: "",
      logo: { url: home(img).attr("src"), alt: home(img).attr("alt"), focus: null },
    }));

  /* Ateliers : page Ateliers + liste de l'accueil + liens du footer */
  const footerNames = Object.fromEntries(
    ateliers(".footer-links a[href^='/ateliers/#']")
      .toArray()
      .map((a) => [ateliers(a).attr("href").split("#")[1], ateliers(a).text().trim()]),
  );
  const atelierList = ateliers(".thread-journey__list > .thread-row")
    .toArray()
    .map((row) => {
      const $row = ateliers(row);
      const slug = $row.attr("id");
      const homeItem = home(`.atelier-list details#${slug}`);
      return {
        slug,
        name: homeItem.find("summary a").text().replace(/\s+/g, " ").trim() || $row.find(".thread-card__title").text().trim(),
        shortName: footerNames[slug] || "",
        title: $row.find(".thread-card__title").text().replace(/\s+/g, " ").trim(),
        summary: homeItem.find(".atelier-detail p").text().replace(/\s+/g, " ").trim(),
        description: $row
          .find(".thread-card__detail-inner p")
          .toArray()
          .map((p) => ateliers(p).text().replace(/\s+/g, " ").trim()),
        image: imageOf(ateliers, $row.find(".thread-card__media img")),
        homeImage: imageOf(home, homeItem.find(".atelier-detail img")),
      };
    });

  return { settings, pages, events, news, reviews, team, engagements, partners, ateliers: atelierList };
};

// `node cms/extract.mjs` : affiche le contenu lu (pour vérification).
if (process.argv[1]?.endsWith("extract.mjs")) {
  console.log(JSON.stringify(extractContent(), null, 2));
}
