/*
 * Champs réutilisés dans plusieurs formulaires.
 */
import { defineField } from "sanity";

// Image avec texte alternatif et choix du cadrage (point focal).
export const imageField = (name, title, options = {}) =>
  defineField({
    name,
    title,
    type: "image",
    options: { hotspot: true },
    description:
      options.description ||
      "Cliquez sur l’icône de recadrage pour choisir la partie de la photo à garder visible.",
    validation: options.required ? (rule) => rule.required() : undefined,
    fields: [
      defineField({
        name: "alt",
        title: "Description de l’image",
        type: "string",
        description:
          "Décrit la photo pour les personnes malvoyantes et Google (ex. « Enfant tissant sur un carton »). Laisser vide si l’image est purement décorative.",
      }),
    ],
    ...(options.fieldset ? { fieldset: options.fieldset } : {}),
  });

// Ordre d'affichage (le plus petit nombre en premier).
export const orderField = defineField({
  name: "order",
  title: "Ordre d’affichage",
  type: "number",
  description: "1 = en premier, 2 = en deuxième…",
  initialValue: 10,
});

export const orderByOrder = [
  { title: "Ordre d’affichage", name: "order", by: [{ field: "order", direction: "asc" }] },
];
