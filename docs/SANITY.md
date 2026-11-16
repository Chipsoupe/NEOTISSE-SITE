# Back office Sanity

Les fondatrices modifient le site depuis **https://neotisse-asso.sanity.studio**
(Sanity Studio, en français). Chaque publication met le site à jour tout
seul en une à deux minutes.

## Comment ça marche

```
Sanity Studio (studio/)  ──publication──▶  webhook  ──▶  Netlify relance le build
                                                         │
     npm run build (cms/build.mjs) : lit le contenu ◀────┘
     publié dans Sanity et l'insère dans les pages HTML
     (cms/inject.mjs) → dossier dist/ mis en ligne

Formulaire du livre d'or ──▶ /api/livre-dor (netlify/functions/livre-dor.mjs)
                           ──▶ avis « En attente » dans Sanity
```

- Le HTML des pages reste la source du design : le build remplace seulement
  les textes, photos et listes repérés par leurs classes CSS.
- Un champ vide dans Sanity laisse le texte écrit dans le fichier HTML.
- Sans `SANITY_PROJECT_ID`, le site est publié tel qu'écrit dans les
  fichiers HTML (rien ne casse).

### Ce qui est modifiable

| Menu du Studio        | Où ça apparaît sur le site                                    |
| --------------------- | ------------------------------------------------------------- |
| Paramètres du site    | E-mail, téléphones, zone d'intervention, texte du pied de page |
| Textes des pages      | Titres, introductions et photos de chaque page                 |
| Événements            | Calendrier, « Prochain rendez-vous », « Prochaines dates » de l'accueil |
| Actualités            | Frise de la page Actualités                                    |
| Livre d'or            | Feuilles d'avis (+ « Ce qu'ils en disent » sur l'accueil)      |
| Ateliers              | Page Ateliers, liste de l'accueil, liens du pied de page       |
| Équipe / Engagements  | Cartes des fondatrices et métier à pesons de la page L'équipe  |
| Partenaires           | Bandeau de logos de l'accueil                                  |

Les pages légales (confidentialité…) restent dans les fichiers HTML.

---

## Mise en place (une seule fois)

### 1. Créer le projet Sanity

1. Créer un compte sur https://www.sanity.io (gratuit) et un projet
   « Neotisse » sur https://www.sanity.io/manage, avec un dataset
   **production** (public).
2. Noter l'**ID du projet** (Project ID, ex. `a1b2c3d4`).

### 2. Configurer les fichiers `.env`

```bash
cp .env.example .env                 # à la racine
cp studio/.env.example studio/.env   # pour le Studio
```

Remplir `SANITY_PROJECT_ID` (racine) et `SANITY_STUDIO_PROJECT_ID` (studio)
avec l'ID du projet.

### 3. Créer le jeton d'écriture

Sur sanity.io/manage → le projet → **API → Tokens → Add API token** :
nom « Site Netlify », permissions **Editor**. Copier le jeton dans
`SANITY_WRITE_TOKEN` du fichier `.env` (racine). Il est secret : il ne doit
jamais être commité (`.env` est dans `.gitignore`).

### 4. Autoriser le site à lire Sanity (CORS)

sanity.io/manage → **API → CORS origins → Add CORS origin** :
- `http://localhost:5173` (développement) ;
- l'adresse du site en ligne (ex. `https://neotisse.fr`).

### 5. Importer le contenu actuel

```bash
npm run sanity:import -- --dry-run   # vérifie sans rien envoyer
npm run sanity:import                # envoie textes et photos dans Sanity
```

L'import ne touche jamais un document déjà présent dans Sanity
(`--force` pour tout remplacer, à éviter une fois que les fondatrices ont
commencé à modifier le contenu).

### 6. Mettre le Studio en ligne

```bash
cd studio
npm install
npx sanity login         # connexion au compte Sanity
npm run dev              # essai local : http://localhost:3333
npm run deploy           # publie https://neotisse-asso.sanity.studio
```

Inviter les fondatrices : sanity.io/manage → **Members → Invite** (rôle
Editor).

### 7. Netlify

1. Relier le dépôt GitHub au site Netlify. Le fichier `netlify.toml` règle
   tout (commande `npm run build`, dossier `dist`, fonctions).
2. **Site configuration → Environment variables** : ajouter
   `SANITY_PROJECT_ID`, `SANITY_DATASET` (`production`) et
   `SANITY_WRITE_TOKEN`.
3. **Site configuration → Build & deploy → Build hooks → Add build hook**
   (nom « Sanity ») : copier l'adresse obtenue.

### 8. Mise à jour automatique après publication

sanity.io/manage → **API → Webhooks → Create webhook** :
- URL : l'adresse du build hook Netlify (étape 7.3) ;
- Dataset : `production` ;
- Trigger on : Create, Update, Delete ;
- Filter : laisser vide ; HTTP method : POST.

Désormais, chaque publication dans le Studio relance le build Netlify.

> Les « Prochaines dates » de l'accueil et le « Prochain rendez-vous » se
> calculent au build. Pour qu'un événement passé disparaisse même sans
> nouvelle publication, on peut programmer un build quotidien (par exemple
> une tâche planifiée qui appelle le build hook chaque nuit).

---

## Au quotidien (fondatrices)

- **Modifier un texte ou une photo** : l'ouvrir dans le Studio, modifier,
  cliquer sur **Publier**. Le site est à jour une à deux minutes après.
- **Photos** : après l'envoi, l'icône de recadrage permet de choisir la
  partie de la photo qui reste visible (le « point focal »).
- **Livre d'or** : les nouveaux mots arrivent dans **Livre d'or → À
  valider**. Passer le statut sur « Publié » (ou « Refusé ») puis
  **Publier**. Cocher « Afficher aussi sur l'accueil » pour le mettre dans
  « Ce qu'ils en disent ».
- **Ordre d'affichage** (ateliers, équipe, engagements, partenaires) :
  champ « Ordre d'affichage », 1 = en premier.

## Développement

- `npm run dev` : site en local ; avec un `.env` rempli, les pages affichent
  le contenu Sanity (relu toutes les 10 secondes).
- `npm run build` : génère `dist/` comme sur Netlify.
- `SANITY_FIXTURE=contenu.json npm run build` : build avec un contenu
  enregistré (format de `node cms/extract.mjs`), sans Sanity.
- Le formulaire du livre d'or n'est actif qu'avec la fonction Netlify :
  tester avec `npx netlify dev`.
- Ajouter un champ : le déclarer dans `studio/schemaTypes/`, le lire dans
  `cms/inject.mjs` (et `cms/extract.mjs` pour l'import), puis
  `npm run deploy` dans `studio/`.
