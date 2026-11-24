/*
 * Lecture du contenu dans Sanity, mis en forme pour l'injection dans les pages
 * (voir inject.mjs). Toutes les images deviennent { url, alt, focus } et les
 * textes riches des actualités deviennent des paragraphes HTML.
 */
import { createClient } from "@sanity/client";
import { sanityConfig } from "./config.mjs";

export const PAGE_IDS = [
  "accueil",
  "ateliers",
  "calendrier",
  "equipe",
  "actualites",
  "livreDor",
  "contact",
];

const QUERY = `{
  "settings": *[_id == "siteSettings"][0],
  "pages": *[_id in $pageIds],
  "events": *[_type == "event" && !(_id in path("drafts.**"))] | order(start asc) {
    ..., "newsSlug": news->slug.current
  },
  "news": *[_type == "newsPost" && !(_id in path("drafts.**"))] | order(date desc),
  "reviews": *[_type == "review" && status == "approved" && !(_id in path("drafts.**"))] | order(coalesce(publishedAt, _createdAt) desc),
  "team": *[_type == "teamMember" && !(_id in path("drafts.**"))] | order(order asc),
  "engagements": *[_type == "engagement" && !(_id in path("drafts.**"))] | order(order asc),
  "partners": *[_type == "partner" && !(_id in path("drafts.**"))] | order(order asc),
  "ateliers": *[_type == "atelier" && !(_id in path("drafts.**"))] | order(order asc)
}`;

/* ---------- Images ---------- */

// Paramètres communs des images Sanity : jamais agrandies, format moderne
// (WebP/AVIF) choisi selon le navigateur, qualité 75.
export const SANITY_IMAGE_PARAMS = "fit=max&auto=format&q=75";

// « image-<id>-<l>x<h>-<ext> » → URL du CDN Sanity, sans paramètres.
const imageBase = (image) => {
  const ref = image?.asset?._ref;
  if (!ref) return null;
  const [, id, size, ext] = ref.split("-");
  const { projectId, dataset } = sanityConfig;
  return {
    base: `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${size}.${ext}`,
    width: Number(size.split("x")[0]) || null,
  };
};

// URL du CDN Sanity redimensionnée (voir SANITY_IMAGE_PARAMS).
export const imageUrl = (image, width = 1600) => {
  const asset = imageBase(image);
  return asset ? `${asset.base}?w=${width}&${SANITY_IMAGE_PARAMS}` : "";
};

const toImage = (image, width) => {
  const url = imageUrl(image, width);
  if (!url) return null;
  const hotspot = image.hotspot;
  // base + width : inject.mjs en tire des srcset (plusieurs largeurs).
  const { base, width: originalWidth } = imageBase(image);
  return {
    url,
    base,
    width: originalWidth,
    alt: image.alt || "",
    focus: hotspot
      ? `${Math.round(hotspot.x * 100)}% ${Math.round(hotspot.y * 100)}%`
      : null,
  };
};

/* ---------- Texte riche (Portable Text) → HTML ---------- */

const escapeHtml = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const blockToHtml = (block) => {
  if (block?._type !== "block") return "";
  const links = Object.fromEntries(
    (block.markDefs || []).map((def) => [def._key, def]),
  );
  return (block.children || [])
    .map((span) => {
      let html = escapeHtml(span.text).replace(/\n/g, "<br />");
      for (const mark of span.marks || []) {
        if (mark === "strong") html = `<strong>${html}</strong>`;
        else if (mark === "em") html = `<em>${html}</em>`;
        else if (links[mark]?.href) {
          const href = escapeHtml(links[mark].href);
          const external = /^https?:/.test(links[mark].href);
          html = `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ""}>${html}</a>`;
        }
      }
      return html;
    })
    .join("");
};

const richText = (blocks) =>
  (blocks || []).map(blockToHtml).filter((html) => html.trim());

/* ---------- Mise en forme ---------- */

// Remplace récursivement les images Sanity d'une page par { url, alt, focus }.
const normalizePage = (value) => {
  if (Array.isArray(value)) return value.map(normalizePage);
  if (value && typeof value === "object") {
    if (value._type === "image") return toImage(value);
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, v]) => [key, normalizePage(v)]),
    );
  }
  return value;
};

export const normalize = (raw) => {
  const pages = {};
  for (const doc of raw.pages || []) {
    pages[doc._id.replace(/^page-/, "")] = normalizePage(doc);
  }
  const settings = raw.settings || {};
  return {
    settings: {
      email: settings.email || "",
      phones: (settings.phones || []).map(({ number, label }) => ({ number, label })),
      footerText: settings.footerText || "",
      area: settings.area || "",
      facebook: settings.facebook || "",
      instagram: settings.instagram || "",
    },
    pages,
    events: (raw.events || []).map((e) => ({
      title: e.title,
      start: e.start,
      end: e.end || e.start,
      location: e.location || "",
      audience: e.audience || "",
      site: e.site || "",
      url: e.newsSlug ? `/actualites/#${e.newsSlug}` : e.url || "",
      image: toImage(e.image, 1400),
    })),
    news: (raw.news || []).map((n) => ({
      slug: n.slug?.current || "",
      date: n.date,
      title: n.title,
      excerpt: n.excerpt || "",
      body: richText(n.body),
      image: toImage(n.image, 1400),
    })),
    reviews: (raw.reviews || []).map((r) => ({
      name: r.name,
      structure: r.structure || "",
      text: r.text,
      featured: Boolean(r.featured),
    })),
    team: (raw.team || []).map((m) => ({
      name: m.name,
      role: m.role || "",
      photo: toImage(m.photo, 1200),
      bio: m.bio || [],
    })),
    engagements: (raw.engagements || []).map((e) => ({
      label: e.label,
      title: e.title,
      text: e.text || "",
      image: toImage(e.image, 1400),
    })),
    partners: (raw.partners || []).map((p) => ({
      name: p.name,
      url: p.url || "",
      logo: toImage(p.logo, 600),
    })),
    ateliers: (raw.ateliers || []).map((a) => ({
      slug: a.slug?.current || "",
      name: a.name,
      shortName: a.shortName || a.name,
      title: a.title || a.name,
      summary: a.summary || "",
      description: a.description || [],
      image: toImage(a.image, 1400),
      homeImage: toImage(a.homeImage, 1000),
    })),
  };
};

export const fetchContent = async () => {
  const client = createClient({
    ...sanityConfig,
    useCdn: false,
    perspective: "published",
  });
  const raw = await client.fetch(QUERY, {
    pageIds: PAGE_IDS.map((id) => `page-${id}`),
  });
  return normalize(raw);
};
