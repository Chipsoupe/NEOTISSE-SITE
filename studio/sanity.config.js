/*
 * Back office Neotisse (Sanity Studio).
 *
 * Menu de gauche organisé pour les fondatrices :
 * - Paramètres du site et textes des pages (documents uniques) ;
 * - Événements, Actualités ;
 * - Livre d'or, avec les avis à valider en premier ;
 * - Ateliers, Équipe, Engagements, Partenaires.
 *
 * Chaque publication déclenche la mise à jour du site (webhook Netlify,
 * voir docs/SANITY.md) : le changement est en ligne une à deux minutes après.
 */
import { frFRLocale } from "@sanity/locale-fr-fr";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";
import { PAGES } from "./schemaTypes/pages";

const API_VERSION = "2025-01-01";

// Documents uniques : on ne peut ni en créer d'autres, ni les supprimer.
const SINGLETONS = new Map([
  ["siteSettings", "siteSettings"],
  ...PAGES.map((page) => [page.type, page.id]),
]);

const icon = (emoji) => () => emoji;

const structure = (S) => {
  const single = (title, type, id, emoji) =>
    S.listItem()
      .title(title)
      .id(id)
      .icon(icon(emoji))
      .child(S.document().schemaType(type).documentId(id).title(title));

  const list = (title, type, emoji, ordering) =>
    S.listItem()
      .title(title)
      .id(type)
      .icon(icon(emoji))
      .child(
        S.documentTypeList(type)
          .title(title)
          .defaultOrdering(ordering || [{ field: "order", direction: "asc" }]),
      );

  const reviews = (title, id, filter, emoji) =>
    S.listItem()
      .title(title)
      .id(id)
      .icon(icon(emoji))
      .child(
        S.documentList()
          .id(id)
          .title(title)
          .apiVersion(API_VERSION)
          .schemaType("review")
          .filter(`_type == "review" && ${filter}`)
          .defaultOrdering([{ field: "publishedAt", direction: "desc" }]),
      );

  return S.list()
    .id("neotisse")
    .title("Neotisse")
    .items([
      single("Paramètres du site", "siteSettings", "siteSettings", "⚙️"),
      S.listItem()
        .title("Textes des pages")
        .id("pages")
        .icon(icon("📄"))
        .child(
          S.list()
            .id("textes-des-pages")
            .title("Textes des pages")
            .items(PAGES.map((page) => single(page.title, page.type, page.id, "📄"))),
        ),
      S.divider(),
      list("Événements", "event", "📅", [{ field: "start", direction: "desc" }]),
      list("Actualités", "newsPost", "📰", [{ field: "date", direction: "desc" }]),
      S.listItem()
        .title("Livre d’or")
        .id("livre-dor")
        .icon(icon("✒️"))
        .child(
          S.list()
            .id("livre-dor-liste")
            .title("Livre d’or")
            .items([
              reviews("À valider", "avis-en-attente", 'status == "pending"', "⏳"),
              reviews("Publiés", "avis-publies", 'status == "approved"', "✅"),
              reviews("Refusés", "avis-refuses", 'status == "refused"', "⛔"),
            ]),
        ),
      S.divider(),
      list("Ateliers", "atelier", "🧶"),
      list("Équipe", "teamMember", "👩"),
      list("Engagements", "engagement", "🪨"),
      list("Partenaires", "partner", "🤝"),
    ]);
};

export default defineConfig({
  name: "neotisse",
  title: "Neotisse",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [structureTool({ structure }), frFRLocale()],
  schema: {
    types: schemaTypes,
    // Pas de bouton « Créer » pour les documents uniques.
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.has(schemaType)),
  },
  document: {
    // Documents uniques : seulement publier / annuler les modifications.
    actions: (actions, { schemaType }) =>
      SINGLETONS.has(schemaType)
        ? actions.filter(({ action }) => ["publish", "discardChanges", "restore"].includes(action))
        : actions,
  },
});
