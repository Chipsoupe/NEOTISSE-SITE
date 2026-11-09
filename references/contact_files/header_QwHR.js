/**
 * Neotisse — ajoute la classe « neotisse-scrolled » sur <body> dès que
 * la page a défilé : la barre de navigation devient alors brun texturé
 * (sur l'accueil, elle est semi-transparente tant qu'on est sur la photo).
 */
( function () {
	var body = document.body;
	var ticking = false;

	function threshold() {
		// Sur l'accueil : quand on a dépassé l'accroche (moins la hauteur de la barre).
		var hero = body.classList.contains( 'home' )
			? document.querySelector( '.wp-site-blocks > main .wp-block-cover' )
			: null;
		var header = document.querySelector( '.neotisse-header' );
		var headerH = header ? header.offsetHeight : 0;
		return hero ? Math.max( hero.offsetHeight - headerH, 10 ) : 10;
	}

	function update() {
		body.classList.toggle( 'neotisse-scrolled', window.scrollY > threshold() );
		ticking = false;
	}

	window.addEventListener(
		'scroll',
		function () {
			if ( ! ticking ) {
				window.requestAnimationFrame( update );
				ticking = true;
			}
		},
		{ passive: true }
	);
	window.addEventListener( 'resize', update );
	update();
} )();
