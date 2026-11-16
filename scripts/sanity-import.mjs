/*
 * Import initial : recopie le contenu actuel des pages HTML dans Sanity.
 *
 *   npm run sanity:import            crée ce qui n'existe pas encore
 *   npm run sanity:import -- --force remplace aussi ce qui existe déjà
 *                                    (écrase les modifications faites
 *                                    dans le Studio : à éviter ensuite)
 *   npm run sanity:import -- --dry-run affiche ce qui serait importé
 *
 * Nécessite SANITY_PROJECT_ID et SANITY_WRITE_TOKEN dans le fichier .env.
 * Les photos sont envoyées dans Sanity (une seule fois chacune).
 */
import { createClient } from "@sanity/client";
import { createReadStream, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { ROOT, sanityConfig } from "../cms/config.mjs";
import { extractContent } from "../cms/extract.mjs";

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

if (!dryRun && (!sanityConfig.projectId || !process.env.SANITY_WRITE_TOKEN)) {
  console.error("Il manque SANITY_PROJECT_ID ou SANITY_WRITE_TOKEN dans le fichier .env (voir docs/SANITY.md).");
  process.exit(1);
}

const client = dryRun
  ? null
  : createClient({ ...sanityConfig, token: process.env.SANITY_WRITE_TOKEN, useCdn: false });

let keyCounter = 0;
const key = () => `k${(keyCounter++).toString(36)}`;

/* ---------- Photos ---------- */

const uploaded = new Map();
const uploadImage = async (image) => {
  if (!image?.url) return undefined;
  const file = image.url.replace(/^\/images\//, "");
  const path = [join(ROOT, "IMAGES", file), join(ROOT, "public", "images", file)].find(existsSync);
  if (!path) {
    console.warn(`  ⚠ Photo introuvable : ${image.url}`);
    return undefined;
  }
  if (!uploaded.has(path)) {
    if (dryRun) uploaded.set(path, "image-dryrun");
    else {
      const asset = await client.assets.upload("image", createReadStream(path), { filename: basename(path) });
      uploaded.set(path, asset._id);
      console.log(`  photo envoyée : ${basename(path)}`);
    }
  }
  const value = { _type: "image", asset: { _type: "reference", _ref: uploaded.get(path) } };
  if (image.alt) value.alt = image.alt;
  const focus = image.focus?.match(/([\d.]+)%\s+([\d.]+)%/);
  if (focus) {
    value.hotspot = {
      _type: "sanity.imageHotspot",
      x: Number(focus[1]) / 100,
      y: Number(focus[2]) / 100,
      width: 0.4,
      height: 0.4,
    };
  }
  return value;
};

/* ---------- Texte ---------- */

const stripTags = (html) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

const block = (text) => ({
  _type: "block",
  _key: key(),
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: key(), text, marks: [] }],
});

/* ---------- Construction des documents ---------- */

const PAGE_TYPES = {
  accueil: "pageAccueil",
  ateliers: "pageAteliers",
  calendrier: "pageCalendrier",
  equipe: "pageEquipe",
  actualites: "pageActualites",
  livreDor: "pageLivreDor",
  contact: "pageContact",
};

const buildDocuments = async (content) => {
  const docs = [];

  docs.push({
    _id: "siteSettings",
    _type: "siteSettings",
    email: content.settings.email,
    phones: content.settings.phones.map((p) => ({ _key: key(), _type: "phone", ...p })),
    area: content.settings.area,
    footerText: content.settings.footerText,
    facebook: content.settings.facebook || undefined,
    instagram: content.settings.instagram || undefined,
  });

  for (const [pageKey, fields] of Object.entries(content.pages)) {
    const doc = { _id: `page-${pageKey}`, _type: PAGE_TYPES[pageKey] };
    for (const [name, value] of Object.entries(fields)) {
      if (value && typeof value === "object" && !Array.isArray(value)) doc[name] = await uploadImage(value);
      else if (Array.isArray(value)) {
        doc[name] = [];
        for (const item of value) {
          doc[name].push({
            _key: key(),
            _type: "promise",
            title: item.title,
            text: item.text,
            image: await uploadImage(item.image),
          });
        }
      } else if (value) doc[name] = value;
    }
    docs.push(doc);
  }

  const newsIds = new Map();
  for (const news of content.news) {
    const _id = `news-${news.slug}`;
    newsIds.set(news.slug, _id);
    docs.push({
      _id,
      _type: "newsPost",
      title: news.title,
      date: news.date,
      slug: { _type: "slug", current: news.slug },
      image: await uploadImage(news.image),
      excerpt: news.excerpt,
      body: news.body.map((html) => block(stripTags(html))),
    });
  }

  for (const [i, e] of content.events.entries()) {
    const newsSlug = e.url?.match(/^\/actualites\/#(.+)$/)?.[1];
    docs.push({
      _id: `event-${e.start}-${i + 1}`,
      _type: "event",
      title: e.title,
      start: e.start,
      end: e.end !== e.start ? e.end : undefined,
      location: e.location || undefined,
      audience: e.audience || undefined,
      site: e.site || undefined,
      image: await uploadImage(e.image),
      news: newsIds.has(newsSlug) ? { _type: "reference", _ref: newsIds.get(newsSlug) } : undefined,
    });
  }

  const now = Date.now();
  content.reviews.forEach((r, i) =>
    docs.push({
      _id: `review-initial-${i + 1}`,
      _type: "review",
      status: "approved",
      name: r.name,
      structure: r.structure || undefined,
      text: r.text,
      featured: r.featured,
      // Ordre d'origine conservé (le premier est le plus récent).
      publishedAt: new Date(now - i * 60_000).toISOString(),
    }),
  );

  for (const [i, m] of content.team.entries()) {
    docs.push({
      _id: `member-${i + 1}`,
      _type: "teamMember",
      name: m.name,
      role: m.role,
      photo: await uploadImage(m.photo),
      bio: m.bio,
      order: i + 1,
    });
  }

  for (const [i, e] of content.engagements.entries()) {
    docs.push({
      _id: `engagement-${i + 1}`,
      _type: "engagement",
      label: e.label,
      title: e.title,
      text: e.text,
      image: await uploadImage(e.image),
      order: i + 1,
    });
  }

  for (const [i, p] of content.partners.entries()) {
    docs.push({
      _id: `partner-${i + 1}`,
      _type: "partner",
      name: p.name,
      logo: await uploadImage({ url: p.logo.url }),
      order: i + 1,
    });
  }

  for (const [i, a] of content.ateliers.entries()) {
    docs.push({
      _id: `atelier-${a.slug}`,
      _type: "atelier",
      name: a.name,
      shortName: a.shortName,
      slug: { _type: "slug", current: a.slug },
      title: a.title,
      summary: a.summary,
      description: a.description,
      image: await uploadImage(a.image),
      homeImage: await uploadImage(a.homeImage),
      order: i + 1,
    });
  }

  // Retire les champs vides (undefined) avant l'envoi.
  return docs.map((doc) => JSON.parse(JSON.stringify(doc)));
};

/* ---------- Envoi ---------- */

console.log("Lecture du contenu actuel des pages…");
const content = extractContent();
const docs = await buildDocuments(content);

if (dryRun) {
  const count = docs.reduce((acc, d) => ({ ...acc, [d._type]: (acc[d._type] || 0) + 1 }), {});
  console.log(`${docs.length} documents prêts, ${uploaded.size} photos :`, count);
  process.exit(0);
}

const transaction = client.transaction();
for (const doc of docs) {
  if (force) transaction.createOrReplace(doc);
  else transaction.createIfNotExists(doc);
}
await transaction.commit();
console.log(
  `${docs.length} documents ${force ? "importés (remplacés si existants)" : "importés (ceux qui existaient déjà n’ont pas été touchés)"}.`,
);
