/* Neotisse — liste « Nos ateliers » de l'accueil :
   un seul atelier ouvert à la fois au survol, tout se referme quand la
   souris quitte la liste ; sur écran tactile, 1er tap = ouvrir, 2e = lien. */
(function () {
	document.querySelectorAll('.neotisse-ateliers-liste').forEach(function (liste) {
		var items = Array.prototype.slice.call(liste.querySelectorAll('.neotisse-atelier-item'));
		if (!items.length) return;
		liste.classList.add('is-accordeon');
		// Images des ateliers repliés : chargées d'avance pour s'afficher sans délai.
		liste.querySelectorAll('.neotisse-atelier-item__detail img').forEach(function (img) {
			img.loading = 'eager';
		});

		var minuteur = null;
		function ouvrir(item) {
			items.forEach(function (i) { i.classList.toggle('is-open', i === item); });
		}
		function toutFermer() {
			items.forEach(function (i) { i.classList.remove('is-open'); });
		}

		var tactile = window.matchMedia('(hover: none)').matches;

		items.forEach(function (item) {
			// Survol : petite temporisation pour éviter les ouvertures en cascade.
			item.addEventListener('mouseenter', function () {
				clearTimeout(minuteur);
				minuteur = setTimeout(function () { ouvrir(item); }, 90);
			});
			// Clavier : ouvrir à la prise de focus.
			item.addEventListener('focusin', function () { ouvrir(item); });
			// Tactile : le 1er tap ouvre, le 2e suit le lien.
			item.addEventListener('click', function (e) {
				if (tactile && !item.classList.contains('is-open') && e.target.closest('a')) {
					e.preventDefault();
					ouvrir(item);
				}
			});
		});

		liste.addEventListener('mouseleave', function () {
			clearTimeout(minuteur);
			if (!tactile) toutFermer();
		});
	});
})();
