/*
 * Livre d'or : reçoit un mot envoyé depuis le site (POST /api/livre-dor) et
 * le crée dans Sanity avec le statut « En attente de validation ».
 * Une fondatrice le publie (ou le refuse) depuis le Studio.
 *
 * Variables d'environnement Netlify : SANITY_PROJECT_ID, SANITY_DATASET,
 * SANITY_WRITE_TOKEN (jeton secret, rôle « Editor »).
 *
 * Anti-spam : le champ « site » est invisible pour les visiteurs ; s'il est
 * rempli, c'est un robot : on répond « OK » sans rien enregistrer.
 */
import { createClient } from "@sanity/client";

const LIMITS = { nom: 80, structure: 120, temoignage: 2000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { error: "Requête invalide." });
  }

  // Robot : champ piège rempli.
  if (String(data.site || "").trim()) return json(200, { ok: true });

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const nom = clean(data.nom);
  const structure = clean(data.structure);
  const temoignage = String(data.temoignage || "").trim();

  if (!nom || !temoignage || !data.consentement) {
    return json(400, { error: "Merci d’indiquer votre nom, votre mot et d’accepter la politique de confidentialité." });
  }
  if (nom.length > LIMITS.nom || structure.length > LIMITS.structure || temoignage.length > LIMITS.temoignage) {
    return json(400, { error: "Votre message est trop long." });
  }

  const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN } = process.env;
  if (!SANITY_PROJECT_ID || !SANITY_WRITE_TOKEN) {
    console.error("Livre d'or : SANITY_PROJECT_ID ou SANITY_WRITE_TOKEN manquant.");
    return json(500, { error: "Le livre d’or est momentanément indisponible." });
  }

  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET || "production",
    apiVersion: "2025-01-01",
    token: SANITY_WRITE_TOKEN,
    useCdn: false,
  });

  try {
    await client.create({
      _type: "review",
      status: "pending",
      featured: false,
      name: nom,
      structure: structure || undefined,
      text: temoignage,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Livre d'or : échec de l'enregistrement dans Sanity.", error);
    return json(502, { error: "L’envoi n’a pas fonctionné. Merci de réessayer plus tard." });
  }

  return json(200, { ok: true });
};

export const config = { path: "/api/livre-dor" };
