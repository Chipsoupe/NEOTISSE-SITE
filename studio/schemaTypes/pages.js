/*
 * Textes des pages : un formulaire par page du site (documents uniques).
 *
 * Les noms des champs correspondent à ceux lus par le site
 * (cms/inject.mjs à la racine du projet) : ne pas les renommer sans
 * modifier aussi ce fichier.
 *
 * Un champ laissé vide garde le texte actuellement écrit dans la page.
 */
import { defineField, defineType } from "sanity";
import { imageField } from "./fields";

const LINE_BREAK_HELP = "Un retour à la ligne ici crée un retour à la ligne sur le site.";

const title = (name, label, fieldset) =>
  defineField({ name, title: label, type: "text", rows: 2, description: LINE_BREAK_HELP, fieldset });
const text = (name, label, fieldset) =>
  defineField({ name, title: label, type: "text", rows: 4, fieldset });

const hero = (withImage = true) => [
  title("heroTitle", "Titre", "hero"),
  text("heroText", "Texte d’introduction", "hero"),
  ...(withImage ? [imageField("heroImage", "Photo de fond", { fieldset: "hero" })] : []),
];

const page = ({ name, label, fieldsets, fields }) =>
  defineType({
    name,
    title: label,
    type: "document",
    fieldsets: [
      { name: "hero", title: "Haut de page", options: { collapsible: true, collapsed: false } },
      ...fieldsets.map((fs) => ({ ...fs, options: { collapsible: true, collapsed: true } })),
    ],
    fields,
    preview: { prepare: () => ({ title: label }) },
  });

export const pageAccueil = page({
  name: "pageAccueil",
  label: "Accueil",
  fieldsets: [
    { name: "intro", title: "Présentation (sous le haut de page)" },
    { name: "promises", title: "Cartes « Rigueur scientifique » / « Sur mesure »" },
    { name: "sections", title: "Titres des sections" },
    { name: "publics", title: "Section « Des ateliers ouverts à tous les publics »" },
    { name: "contact", title: "Section « Organiser un atelier »" },
  ],
  fields: [
    ...hero(),
    text("introText", "Texte de présentation", "intro"),
    defineField({
      name: "promises",
      title: "Cartes",
      type: "array",
      fieldset: "promises",
      validation: (rule) => rule.max(2),
      of: [
        {
          type: "object",
          name: "promise",
          title: "Carte",
          fields: [
            defineField({ name: "title", title: "Titre", type: "string" }),
            defineField({ name: "text", title: "Texte", type: "text", rows: 3 }),
            imageField("image", "Photo"),
          ],
        },
      ],
    }),
    title("partnersTitle", "Titre « Nos partenaires »", "sections"),
    title("ateliersTitle", "Titre « Nos ateliers »", "sections"),
    imageField("ateliersImage", "Photo de la section « Nos ateliers »", { fieldset: "sections" }),
    title("datesTitle", "Titre « Prochaines dates »", "sections"),
    title("testimonialTitle", "Titre « Ce qu’ils en disent »", "sections"),
    imageField("testimonialImage", "Photo de fond « Ce qu’ils en disent »", { fieldset: "sections" }),
    title("publicsTitle", "Titre", "publics"),
    text("publicsText", "Texte", "publics"),
    imageField("publicsImage", "Photo de fond", { fieldset: "publics" }),
    title("contactTitle", "Titre", "contact"),
    text("contactText", "Texte", "contact"),
    imageField("contactImage", "Photo", { fieldset: "contact" }),
  ],
});

export const pageAteliers = page({
  name: "pageAteliers",
  label: "Ateliers",
  fieldsets: [{ name: "list", title: "Liste et appel à l’action" }],
  fields: [
    ...hero(),
    title("listTitle", "Titre de la liste (ex. « Nos 6 ateliers »)", "list"),
    title("ctaTitle", "Titre de fin de page", "list"),
    text("ctaText", "Texte de fin de page", "list"),
  ],
});

export const pageCalendrier = page({
  name: "pageCalendrier",
  label: "Calendrier",
  fieldsets: [{ name: "welcome", title: "Encadré « Vous souhaitez nous accueillir ? »" }],
  fields: [
    ...hero(),
    title("welcomeTitle", "Titre", "welcome"),
    text("welcomeText", "Texte", "welcome"),
  ],
});

export const pageEquipe = page({
  name: "pageEquipe",
  label: "L’équipe",
  fieldsets: [
    { name: "members", title: "Section des fondatrices" },
    { name: "engagements", title: "Section « Nos engagements »" },
    { name: "contact", title: "Section « Travaillons ensemble »" },
  ],
  fields: [
    ...hero(),
    title("membersTitle", "Titre", "members"),
    text("membersText", "Texte", "members"),
    title("engagementsTitle", "Titre", "engagements"),
    text("engagementsText", "Texte", "engagements"),
    title("contactTitle", "Titre", "contact"),
    text("contactText", "Texte", "contact"),
  ],
});

export const pageActualites = page({
  name: "pageActualites",
  label: "Actualités",
  fieldsets: [{ name: "cta", title: "Bas de page « Suivez nos prochaines actualités »" }],
  fields: [...hero(), title("ctaTitle", "Titre", "cta"), text("ctaText", "Texte", "cta")],
});

export const pageLivreDor = page({
  name: "pageLivreDor",
  label: "Livre d’or",
  fieldsets: [
    { name: "book", title: "Page de gauche du livre" },
    { name: "sheets", title: "Avis et bas de page" },
  ],
  fields: [
    ...hero(false),
    title("invitationTitle", "Titre", "book"),
    text("invitationText", "Texte", "book"),
    title("sheetsTitle", "Titre au-dessus des avis", "sheets"),
    title("ctaTitle", "Titre du bas de page", "sheets"),
    text("ctaText", "Texte du bas de page", "sheets"),
  ],
});

export const pageContact = page({
  name: "pageContact",
  label: "Contact",
  fieldsets: [],
  fields: [...hero()],
});

// Type de document → identifiant fixe (lu par le site : « page-<clé> »).
export const PAGES = [
  { type: "pageAccueil", id: "page-accueil", title: "Accueil" },
  { type: "pageAteliers", id: "page-ateliers", title: "Ateliers" },
  { type: "pageCalendrier", id: "page-calendrier", title: "Calendrier" },
  { type: "pageEquipe", id: "page-equipe", title: "L’équipe" },
  { type: "pageActualites", id: "page-actualites", title: "Actualités" },
  { type: "pageLivreDor", id: "page-livreDor", title: "Livre d’or" },
  { type: "pageContact", id: "page-contact", title: "Contact" },
];

export const pageTypes = [
  pageAccueil,
  pageAteliers,
  pageCalendrier,
  pageEquipe,
  pageActualites,
  pageLivreDor,
  pageContact,
];
