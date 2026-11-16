/*
 * Configuration Sanity du site (lue par le build, `npm run dev` et l'import).
 *
 * Les valeurs viennent des variables d'environnement :
 * - en local : fichier `.env` à la racine du projet (voir `.env.example`) ;
 * - sur Netlify : Site configuration → Environment variables.
 *
 * SANITY_PROJECT_ID   identifiant du projet Sanity (pas secret)
 * SANITY_DATASET      jeu de données, « production » par défaut
 * SANITY_WRITE_TOKEN  jeton d'écriture (SECRET : jamais dans le code ni sur
 *                     GitHub) — sert à l'import du contenu et au livre d'or.
 *
 * Sans SANITY_PROJECT_ID, le site fonctionne comme avant : le contenu écrit
 * dans les fichiers HTML est publié tel quel.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Charge le fichier .env de la racine (sans écraser les variables déjà
// définies, par exemple celles de Netlify).
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) {
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

export const sanityConfig = {
  projectId: process.env.SANITY_PROJECT_ID || "",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
};

export const isSanityConfigured = () => Boolean(sanityConfig.projectId);
