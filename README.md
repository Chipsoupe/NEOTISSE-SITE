Néotisse : site vitrine

Site vitrine de l'association Néotisse (Montpellier), qui fait de la médiation scientifique autour des savoir-faire textiles anciens : filage, tissage, teinture végétale.

Projet réalisé par l'agence Trace (moi) pour la cliente Néotisse. Il existe en deux versions, WordPress et vibecoding, comparées selon la facilité de gestion par les deux fondatrices. Ce dépôt contient la version vibecoding.
Le site présente l'association, ses ateliers, son équipe et ses partenaires;
Reçoit les demandes d'atelier des structures (musées, associations, établissements scolaires, structures culturelles) via un formulaire dont la première question est le profil du visiteur. Les particuliers sont redirigés vers le calendrier.
Le calendrier sur le site affiche des événements. Chaque événement a un bouton « Réserver sur le site de [structure] » qui renvoie vers la page de la structure organisatrice : aucune réservation ne passe par ce site.
Le site publie aussi un livre d'or(avis) : un avis n'apparaît qu'après validation par une fondatrice.
Offre un back office (Sanity Studio, https://neotisse-asso.sanity.studio) où les fondatrices modèrent les avis et gèrent événements, actualités, ateliers, équipe, partenaires et textes des pages, sans toucher au code. Mise en place et fonctionnement : docs/SANITY.md.
Technologies
Rôle et Outil
Pages et design	HTML, CSS, JavaScript
Contenu et back office	Sanity (avis, événements, actualités, ateliers, équipe, partenaires, textes des pages)
Formulaire de contact	Netlify Forms
Hébergement	Netlify
Polices	Google Fonts (Cinzel, Manrope)

Structure du dépôt
index.html, ateliers/, calendrier/, lassociation/ (l'équipe), actualites/,
livre-dor/, contact/, confidentialite/   pages du site (une page = un index.html)
style.css                  design du site
script.js                  comportements communs (menu, cookies, parallax…)
calendrier.js, lassociation.js, actualites.js, livre-dor.js, fil.js
                           comportements propres à chaque page
IMAGES/, public/           photos et logos (publiés en /images)
cms/                       lecture du contenu Sanity et insertion dans les pages au build
studio/                    back office Sanity Studio (déployé sur neotisse-asso.sanity.studio)
netlify/functions/         fonction du livre d'or (enregistre les avis à valider)
scripts/sanity-import.mjs  import initial du contenu actuel dans Sanity
netlify.toml               configuration Netlify (build : npm run build → dist/)
docs/SANITY.md             mise en place et utilisation du back office
