/*
 * Serveur de développement (`npm run dev`).
 *
 * Si Sanity est configuré (fichier .env), chaque page affichée reçoit le
 * contenu publié dans Sanity, exactement comme au build (cms/inject.mjs).
 * Le contenu est relu au plus toutes les 10 secondes : après une
 * publication dans le Studio, il suffit de recharger la page.
 */
import { defineConfig } from "vite";
import { isSanityConfigured } from "./cms/config.mjs";
import { fetchContent } from "./cms/content.mjs";
import { injectPage } from "./cms/inject.mjs";

const sanityContent = () => {
  let cache = null;
  let cachedAt = 0;
  return {
    name: "neotisse-sanity-content",
    apply: "serve",
    async transformIndexHtml(html, ctx) {
      if (!isSanityConfigured()) return html;
      try {
        if (!cache || Date.now() - cachedAt > 10_000) {
          cache = await fetchContent();
          cachedAt = Date.now();
        }
      } catch (error) {
        console.warn(`[sanity] Contenu indisponible : ${error.message}`);
        return html;
      }
      // ctx.path : « /index.html », « /ateliers/index.html »…
      const page = ctx.path.replace(/^\//, "").replace(/(^|\/)$/, "$1index.html");
      return injectPage(html, page, cache);
    },
  };
};

export default defineConfig({
  plugins: [sanityContent()],
});
