/*
 * Contenus du site : paramètres, événements, actualités, avis du livre d'or,
 * équipe, engagements, partenaires et ateliers.
 *
 * Les noms des champs correspondent à ceux lus par le site
 * (cms/content.mjs à la racine du projet).
 */
import { defineArrayMember, defineField, defineType } from "sanity";
import { imageField, orderByOrder, orderField } from "./fields";

const formatDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

/* ---------- Paramètres du site (document unique) ---------- */

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Paramètres du site",
  type: "document",
  fields: [
    defineField({
      name: "email",
      title: "Adresse e-mail de contact",
      type: "string",
      description: "Affichée sur la page Contact et sur l’accueil.",
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: "phones",
      title: "Téléphones",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "phone",
          title: "Téléphone",
          fields: [
            defineField({ name: "number", title: "Numéro", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "label",
              title: "Légende",
              type: "string",
              description: "Ex. « Marie-Salomé Perrichon, co-créatrice »",
            }),
          ],
          preview: { select: { title: "number", subtitle: "label" } },
        }),
      ],
    }),
    defineField({
      name: "area",
      title: "Zone d’intervention",
      type: "string",
      description: "Encadré de la page Contact (ex. « Basées à Montpellier, nous intervenons partout en France. »).",
    }),
    defineField({
      name: "footerText",
      title: "Texte du pied de page",
      type: "text",
      rows: 2,
    }),
  ],
  preview: { prepare: () => ({ title: "Paramètres du site" }) },
});

/* ---------- Événements (calendrier) ---------- */

export const event = defineType({
  name: "event",
  title: "Événement",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Titre", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "start",
      title: "Premier jour",
      type: "date",
      options: { dateFormat: "DD/MM/YYYY" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "end",
      title: "Dernier jour",
      type: "date",
      options: { dateFormat: "DD/MM/YYYY" },
      description: "À laisser vide pour un événement sur une seule journée.",
      validation: (rule) =>
        rule.custom((end, { document }) =>
          !end || !document?.start || end >= document.start
            ? true
            : "Le dernier jour doit être après le premier jour.",
        ),
    }),
    defineField({ name: "location", title: "Lieu", type: "string", description: "Ex. « Musée de l’Aurignacien, Aurignac »" }),
    defineField({ name: "audience", title: "Public", type: "string", description: "Ex. « Tout public », « Familles »" }),
    imageField("image", "Photo"),
    defineField({
      name: "site",
      title: "Site de la structure d’accueil",
      type: "url",
      description: "Ouvert par « En savoir plus » dans le bloc « Prochain rendez-vous ».",
    }),
    defineField({
      name: "news",
      title: "Actualité liée",
      type: "reference",
      to: [{ type: "newsPost" }],
      description: "Facultatif : ouverte par « En savoir plus » quand on clique sur la date dans le calendrier.",
    }),
  ],
  orderings: [
    { title: "Date (plus proche d’abord)", name: "startAsc", by: [{ field: "start", direction: "asc" }] },
    { title: "Date (plus récente d’abord)", name: "startDesc", by: [{ field: "start", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", start: "start", end: "end", location: "location", media: "image" },
    prepare: ({ title, start, end, location, media }) => ({
      title,
      subtitle: [end && end !== start ? `${formatDate(start)} → ${formatDate(end)}` : formatDate(start), location]
        .filter(Boolean)
        .join(" · "),
      media,
    }),
  },
});

/* ---------- Actualités ---------- */

export const newsPost = defineType({
  name: "newsPost",
  title: "Actualité",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Titre", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      options: { dateFormat: "DD/MM/YYYY" },
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Adresse de l’actualité",
      type: "slug",
      description: "Générée à partir du titre (bouton « Generate »). Sert aux liens vers cette actualité.",
      options: { source: "title", maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    imageField("image", "Photo"),
    defineField({
      name: "excerpt",
      title: "Résumé",
      type: "text",
      rows: 3,
      description: "Une ou deux phrases, toujours visibles.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Article complet",
      type: "array",
      description: "Affiché quand on clique sur « Lire l’article ».",
      of: [
        defineArrayMember({
          type: "block",
          styles: [{ title: "Paragraphe", value: "normal" }],
          lists: [],
          marks: {
            decorators: [
              { title: "Gras", value: "strong" },
              { title: "Italique", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Lien",
                fields: [{ name: "href", type: "url", title: "Adresse", validation: (rule) => rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }) }],
              },
            ],
          },
        }),
      ],
    }),
  ],
  orderings: [{ title: "Date (plus récente d’abord)", name: "dateDesc", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "title", date: "date", media: "image" },
    prepare: ({ title, date, media }) => ({ title, subtitle: formatDate(date), media }),
  },
});

/* ---------- Avis du livre d'or ---------- */

export const REVIEW_STATUSES = [
  { title: "En attente de validation", value: "pending" },
  { title: "Publié", value: "approved" },
  { title: "Refusé", value: "refused" },
];

export const review = defineType({
  name: "review",
  title: "Avis du livre d’or",
  type: "document",
  fields: [
    defineField({
      name: "status",
      title: "Statut",
      type: "string",
      description: "Seuls les avis « Publié » apparaissent sur le site.",
      options: { list: REVIEW_STATUSES, layout: "radio", direction: "horizontal" },
      initialValue: "pending",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "name", title: "Nom", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "structure", title: "Structure ou ville", type: "string" }),
    defineField({ name: "text", title: "Avis", type: "text", rows: 5, validation: (rule) => rule.required() }),
    defineField({
      name: "featured",
      title: "Afficher aussi sur l’accueil",
      type: "boolean",
      description: "Dans la section « Ce qu’ils en disent » de l’accueil.",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Date de l’avis",
      type: "datetime",
      description: "Remplie automatiquement quand l’avis est envoyé depuis le site.",
    }),
  ],
  orderings: [{ title: "Plus récents d’abord", name: "recent", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: {
    select: { name: "name", structure: "structure", text: "text", status: "status" },
    prepare: ({ name, structure, text, status }) => ({
      title: [name, structure].filter(Boolean).join(" · "),
      subtitle: `${{ pending: "⏳ À valider", approved: "✅ Publié", refused: "⛔ Refusé" }[status] || ""} — ${text || ""}`,
    }),
  },
});

/* ---------- Équipe ---------- */

export const teamMember = defineType({
  name: "teamMember",
  title: "Membre de l’équipe",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Nom", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "role", title: "Rôle", type: "string", description: "Ex. « Co-fondatrice · Systèmes de tissage »" }),
    imageField("photo", "Photo", { required: true }),
    defineField({
      name: "bio",
      title: "Parcours",
      type: "array",
      description: "Un bloc par paragraphe (au dos de la carte).",
      of: [defineArrayMember({ type: "text", rows: 4 })],
    }),
    orderField,
  ],
  orderings: orderByOrder,
  preview: { select: { title: "name", subtitle: "role", media: "photo" } },
});

/* ---------- Engagements (métier à pesons de la page Équipe) ---------- */

export const engagement = defineType({
  name: "engagement",
  title: "Engagement",
  type: "document",
  fields: [
    defineField({
      name: "label",
      title: "Nom sous le peson",
      type: "string",
      description: "Court : « L’originalité », « La rigueur »…",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "title", title: "Titre du panneau", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "text", title: "Texte", type: "text", rows: 4 }),
    imageField("image", "Photo"),
    orderField,
  ],
  orderings: orderByOrder,
  preview: { select: { title: "label", subtitle: "title", media: "image" } },
});

/* ---------- Partenaires ---------- */

export const partner = defineType({
  name: "partner",
  title: "Partenaire",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Nom", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      description: "Version dorée sur fond transparent (PNG), pour le bandeau de l’accueil.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "url", title: "Site internet", type: "url" }),
    orderField,
  ],
  orderings: orderByOrder,
  preview: { select: { title: "name", media: "logo" } },
});

/* ---------- Ateliers ---------- */

export const atelier = defineType({
  name: "atelier",
  title: "Atelier",
  type: "document",
  fieldsets: [
    { name: "home", title: "Sur l’accueil", options: { collapsible: true, collapsed: false } },
    { name: "page", title: "Sur la page Ateliers", options: { collapsible: true, collapsed: false } },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Nom",
      type: "string",
      description: "Ex. « Ateliers enfants » (liste de l’accueil).",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shortName",
      title: "Nom court",
      type: "string",
      description: "Pour le pied de page, ex. « Enfants ».",
    }),
    defineField({
      name: "slug",
      title: "Identifiant",
      type: "slug",
      description: "Sert aux liens vers cet atelier (/ateliers/#identifiant). À ne pas changer une fois en ligne.",
      options: { source: "name", maxLength: 40 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "summary", title: "Résumé", type: "text", rows: 3, fieldset: "home" }),
    imageField("homeImage", "Photo sur l’accueil", {
      fieldset: "home",
      description: "Facultatif : sinon, la photo de la page Ateliers est utilisée.",
    }),
    defineField({ name: "title", title: "Titre", type: "string", fieldset: "page" }),
    defineField({
      name: "description",
      title: "Description",
      type: "array",
      fieldset: "page",
      description: "Un bloc par paragraphe.",
      of: [defineArrayMember({ type: "text", rows: 4 })],
    }),
    imageField("image", "Photo", { fieldset: "page" }),
    orderField,
  ],
  orderings: orderByOrder,
  preview: { select: { title: "name", subtitle: "title", media: "image" } },
});

export const contentTypes = [siteSettings, event, newsPost, review, teamMember, engagement, partner, atelier];
