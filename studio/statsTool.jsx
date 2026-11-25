/*
 * Onglet « Statistiques » du Studio : affiche le rapport Looker Studio
 * (fréquentation du site, données GA4) en plein écran.
 *
 * L'adresse du rapport se règle dans studio/.env :
 *   SANITY_STUDIO_STATS_URL=https://lookerstudio.google.com/embed/reporting/…
 * (Looker Studio → Fichier → Intégrer le rapport → « Activer l'intégration »,
 * puis copier l'« URL d'intégration »). Voir docs/SANITY.md.
 */
import { definePlugin } from "sanity";

const STATS_URL = process.env.SANITY_STUDIO_STATS_URL || "";

const fill = { width: "100%", height: "100%", border: 0, display: "block" };

const StatsView = () => {
  if (!STATS_URL) {
    return (
      <div style={{ padding: 32, maxWidth: 640, lineHeight: 1.6, fontFamily: "inherit" }}>
        <h2>Statistiques</h2>
        <p>
          Le tableau de bord n’est pas encore branché. Ajouter
          <code> SANITY_STUDIO_STATS_URL </code>
          (adresse d’intégration du rapport Looker Studio) dans le fichier
          <code> studio/.env</code>, puis redéployer le Studio.
        </p>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <iframe title="Statistiques du site" src={STATS_URL} style={fill} allowFullScreen />
      <a
        href={STATS_URL.replace("/embed/", "/")}
        target="_blank"
        rel="noreferrer"
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          padding: "6px 12px",
          borderRadius: 6,
          background: "#fff",
          boxShadow: "0 2px 8px rgb(0 0 0 / 20%)",
          fontSize: 13,
        }}
      >
        Ouvrir dans un nouvel onglet ↗
      </a>
    </div>
  );
};

export const statsTool = definePlugin({
  name: "neotisse-stats",
  tools: [
    {
      name: "statistiques",
      title: "Statistiques",
      icon: () => "📊",
      component: StatsView,
    },
  ],
});
