/*
 * Configuration de la ligne de commande Sanity (sanity dev / deploy).
 * L'identifiant du projet est lu dans studio/.env (voir .env.example).
 */
import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || "production",
  },
  // Adresse du back office : https://neotisse-asso.sanity.studio
  studioHost: "neotisse-asso",
  deployment: {
    appId: "tq2hvmwrvds56eqng1omw9zv",
  },
});
