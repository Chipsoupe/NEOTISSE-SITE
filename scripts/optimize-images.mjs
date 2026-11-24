/*
 * Optimisation des images du site : `npm run images`.
 *
 * Les ORIGINAUX restent dans images-src/ (et images-src/textures/) : on ne
 * les modifie jamais. Ce script écrit les versions publiées :
 *
 *   images-src/<nom>.jpg   →  IMAGES/<nom>-800.webp, IMAGES/<nom>-1600.webp
 *                              (WebP q75, jamais plus large que l'original ;
 *                              original < 800 px → une seule version
 *                              <nom>-<largeur>.webp)
 *                           +  IMAGES/<nom>.jpg recompressé (≤ 1600 px), pour
 *                              les pages et les liens qui citent encore le .jpg
 *   images-src/<photo>.png →  WebP uniquement (pas de PNG pour une photo)
 *   logos / wordmark       →  redimensionnés à 2× leur taille d'affichage,
 *                              en WebP + PNG/JPG compressé sous le même nom
 *   images-src/textures/*  →  textures/*.webp (WebP q60, même nom)
 *
 * Ajouter une image : la déposer dans images-src/, puis `npm run images`.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { ROOT } from "../cms/config.mjs";

const SRC = join(ROOT, "images-src");
const OUT = join(ROOT, "IMAGES");
const TEXTURES_SRC = join(SRC, "textures");
const TEXTURES_OUT = join(ROOT, "textures");

const PHOTO_WIDTHS = [800, 1600];
const PHOTO_QUALITY = 75;
const TEXTURE_QUALITY = 60;

/*
 * Logos : boîte maximale = 2× la taille d'affichage (voir style.css).
 * - Neotisse_* : en-tête 68 px, footer 94 px → 190 px de large.
 * - neotisse-logo-noir : 156 px au repos, jusqu'à ~390 px pendant
 *   l'animation d'arrivée → l'original (310 px) est gardé.
 * - wordmark : pleine largeur du footer → 720 et 1440 px (srcset).
 * - logos partenaires : max 130 × 70 px → 260 × 140 px.
 */
const LOGO_RULES = [
  { test: /^Neotisse[-_]/, widths: [190] },
  { test: /^neotisse-logo-noir/, widths: [390] },
  { test: /^neotisse-wordmark/, widths: [720, 1440] },
  { test: /^Logo-/i, box: [260, 140] },
];

const kb = (bytes) => `${Math.round(bytes / 1024)} Ko`;
let before = 0;
let after = 0;

const write = async (pipeline, file) => {
  const info = await pipeline.toFile(file);
  after += info.size;
  return info;
};

// Copie compatible sous le nom d'origine : si l'image n'est pas réduite et
// que le réencodage est plus lourd, on garde simplement l'original.
const writeCompat = async (pipeline, source, file) => {
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  const meta = await sharp(source).metadata();
  const original = statSync(source).size;
  if (info.width === meta.width && data.length >= original) {
    copyFileSync(source, file);
    after += original;
  } else {
    writeFileSync(file, data);
    after += data.length;
  }
};

const optimizePhoto = async (file, name, ext, meta) => {
  const widths = PHOTO_WIDTHS.filter((w) => w <= meta.width);
  if (!widths.length) widths.push(meta.width);
  const outputs = [];
  for (const w of widths) {
    await write(
      sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: PHOTO_QUALITY, effort: 6 }),
      join(OUT, `${name}-${w}.webp`),
    );
    outputs.push(`${name}-${w}.webp`);
  }
  // Copie compatible (même nom) pour les JPG : pages secondaires, og:image…
  if (ext === ".jpg" || ext === ".jpeg") {
    await writeCompat(
      sharp(file).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: PHOTO_QUALITY, mozjpeg: true }),
      file,
      join(OUT, `${name}${ext}`),
    );
    outputs.push(`${name}${ext}`);
  }
  return outputs;
};

const optimizeLogo = async (file, name, ext, meta, rule) => {
  const outputs = [];
  const resize = (w) =>
    rule.box
      ? { width: rule.box[0], height: rule.box[1], fit: "inside", withoutEnlargement: true }
      : { width: w, withoutEnlargement: true };
  const widths = rule.box ? [null] : rule.widths;
  for (const w of widths) {
    const width = Math.min(w ?? meta.width, meta.width);
    const suffix = rule.box ? "" : `-${width}`;
    await write(
      sharp(file).resize(resize(w)).webp({ quality: 85, alphaQuality: 100, effort: 6 }),
      join(OUT, `${name}${suffix}.webp`),
    );
    outputs.push(`${name}${suffix}.webp`);
  }
  // Copie compatible sous le nom d'origine, à la plus grande taille utile.
  const largest = rule.box ? null : Math.max(...rule.widths);
  const pipeline = sharp(file).resize(resize(largest));
  if (ext === ".png") {
    await writeCompat(pipeline.png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 }), file, join(OUT, `${name}.png`));
  } else if (ext === ".webp") {
    if (!rule.box || outputs[0] !== `${name}.webp`) {
      await writeCompat(pipeline.webp({ quality: 85, alphaQuality: 100 }), file, join(OUT, `${name}.webp`));
    }
  } else {
    await writeCompat(pipeline.jpeg({ quality: 85, mozjpeg: true }), file, join(OUT, `${name}${ext}`));
  }
  if (ext !== ".webp") outputs.push(`${name}${ext}`);
  return outputs;
};

mkdirSync(OUT, { recursive: true });

for (const entry of readdirSync(SRC).sort()) {
  const file = join(SRC, entry);
  if (statSync(file).isDirectory()) continue;
  const ext = extname(entry).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;
  const name = basename(entry, extname(entry));
  const meta = await sharp(file).metadata();
  const start = after;
  before += statSync(file).size;

  const rule = LOGO_RULES.find((r) => r.test.test(name));
  const outputs = rule
    ? await optimizeLogo(file, name, ext, meta, rule)
    : await optimizePhoto(file, name, ext, meta);
  console.log(`${entry} (${meta.width}px, ${kb(statSync(file).size)}) → ${outputs.join(", ")} (${kb(after - start)})`);
}

// Textures : même nom, recompressées.
for (const entry of readdirSync(TEXTURES_SRC)) {
  const file = join(TEXTURES_SRC, entry);
  const size = statSync(file).size;
  before += size;
  const info = await write(sharp(file).webp({ quality: TEXTURE_QUALITY, effort: 6 }), join(TEXTURES_OUT, `${basename(entry, extname(entry))}.webp`));
  console.log(`textures/${entry} (${kb(size)}) → ${kb(info.size)}`);
}

console.log(`\nOriginaux : ${kb(before)} → publiés : ${kb(after)}`);
