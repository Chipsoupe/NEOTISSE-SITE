Néotisse : site vitrine

Site vitrine de l'association Néotisse (Montpellier), qui fait de la médiation scientifique autour des savoir-faire textiles anciens : filage, tissage, teinture végétale.

Projet réalisé par l'agence Trace (moi) pour la cliente Néotisse. Il existe en deux versions, WordPress et vibecoding, comparées selon la facilité de gestion par les deux fondatrices. Ce dépôt contient la version vibecoding.
Le site présente l'association, ses ateliers, son équipe et ses partenaires;
Reçoit les demandes d'atelier des structures (musées, associations, établissements scolaires, structures culturelles) via un formulaire dont la première question est le profil du visiteur. Les particuliers sont redirigés vers le calendrier.
Le calendrier sur le site affiche des événements. Chaque événement a un bouton « Réserver sur le site de [structure] » qui renvoie vers la page de la structure organisatrice : aucune réservation ne passe par ce site.
Le site publie aussi un livre d'or(avis) : un avis n'apparaît qu'après validation par une fondatrice.
Offre un espace membres où les fondatrices modèrent les avis et gèrent événements, actualités et partenaires, sans toucher au code.
Technologies
Rôle et Outil
Pages et design	HTML, CSS, JavaScript
Base de données et comptes	Supabase (avis, événements, actualités, partenaires)
Formulaire de contact	Netlify Forms
Hébergement	Netlify
Polices	Google Fonts (Cinzel, Manrope)

Structure du depôt 
index.html, ateliers.html, equipe.html, calendrier.html,
actualites.html, livre-dor.html, contact.html
mentions-legales.html, politique-de-confidentialite.html, gestion-des-cookies.html
admin/index.html           espace membres
assets/css/style.css       design du site
assets/js/config.js        adresse et clé Supabase
assets/js/data.js          lecture et écriture des données
assets/js/site.js          comportements du site public
assets/js/admin.js         espace membres
assets/img/                photos et logos
supabase-schema.sql        tables, règles de sécurité et contenu de départ
netlify.toml               configuration Netlify
