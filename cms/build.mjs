/*
 * Build du site pour Netlify : `npm run build`.
 *
 * 1. Lit tout le contenu publié dans Sanity (si SANITY_PROJECT_ID est défini).
 * 2. Copie le site dans dist/ : pages, scripts, styles, polices, textures,
 *    images (dossier IMAGES → dist/images ; versions optimisées produites
 *    par `npm run images` à partir des originaux de images-src/).
 * 3. Insère le contenu Sanity dans chaque page HTML (voir inject.mjs).
 *
 * Option de test : SANITY_FIXTURE=chemin/vers/contenu.json utilise un
 * contenu enregistré au lieu de Sanity (même format que fetchContent).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, isSanityConfigured } from "./config.mjs";
import { fetchContent } from "./content.mjs";
import { injectPage } from "./inject.mjs";

const DIST = join(ROOT, "dist");

// Dossiers qui ne font pas partie du site publié.
const EXCLUDED = new Set([
  "node_modules", "dist", "studio", "cms", "scripts", "netlify", "docs",
  "references", "Photos", "public", "IMAGES", "images-src", ".git", ".astro",
]);
const ASSET_DIRS = ["textures", "vendor", "fonts"];

const loadContent = async () => {
  if (process.env.SANITY_FIXTURE) {
    console.log(`Contenu lu dans ${process.env.SANITY_FIXTURE}`);
    return JSON.parse(readFileSync(process.env.SANITY_FIXTURE, "utf8"));
  }
  if (!isSanityConfigured()) {
    console.log("SANITY_PROJECT_ID absent : le contenu des fichiers HTML est publié tel quel.");
    return null;
  }
  console.log("Lecture du contenu dans Sanity…");
  return fetchContent();
};

const content = await loadContent();

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// Images : public/images puis IMAGES (les deux étaient servis en /images).
for (const source of ["public/images", "IMAGES"]) {
  if (existsSync(join(ROOT, source))) {
    cpSync(join(ROOT, source), join(DIST, "images"), { recursive: true });
  }
}
for (const dir of ASSET_DIRS) {
  if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true });
}

// Fichiers de la racine : pages, scripts, styles.
const pages = [];
for (const entry of readdirSync(ROOT)) {
  const path = join(ROOT, entry);
  const isDir = statSync(path).isDirectory();
  if (!isDir && /\.(js|css|html|ico|txt|xml|webmanifest)$/.test(entry) && !entry.includes(".config.")) {
    cpSync(path, join(DIST, entry));
    if (entry.endsWith(".html")) pages.push(entry);
  } else if (isDir && !EXCLUDED.has(entry) && !ASSET_DIRS.includes(entry) && existsSync(join(path, "index.html"))) {
    cpSync(join(path, "index.html"), join(DIST, entry, "index.html"));
    pages.push(`${entry}/index.html`);
  }
}

if (content) {
  for (const page of pages) {
    const file = join(DIST, page);
    writeFileSync(file, injectPage(readFileSync(file, "utf8"), page, content));
  }
  console.log(`Contenu Sanity inséré dans ${pages.length} pages.`);
}
console.log(`Site prêt dans ${relative(ROOT, DIST)}/`);
