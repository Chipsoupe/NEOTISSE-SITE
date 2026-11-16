/*
 * Page Actualités : frise chronologique.
 *
 * - Une couture (point avant) se fait au défilement, point après point,
 *   jusqu'au niveau de lecture (60 % de la hauteur de l'écran) ; elle se
 *   défait si on remonte.
 * - À chaque date, la couture fait un point de croix et la date s'allume ;
 *   la card de l'actualité apparaît juste avant.
 * - Un clic sur une card déplie l'article complet sur place (une seule card
 *   ouverte à la fois).
 * - Arrivée par un lien /actualites/#id : la page défile jusqu'à l'actualité
 *   et l'ouvre.
 *
 * Rien à modifier ici pour ajouter une actualité : voir le modèle en
 * commentaire dans actualites/index.html (l'alternance gauche/droite est
 * faite en CSS).
 */
document.addEventListener("DOMContentLoaded", () => {
  const timeline = document.querySelector("[data-timeline]");
  if (!timeline) return;

  const items = [...timeline.querySelectorAll(".timeline__item")];
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const READING_LINE = 0.6;
  // Hauteur du point de croix dans chaque élément (= top: 40px en CSS).
  const DOT_OFFSET = 40;
  // Longueur d'un point de couture + espace (= --stitch en CSS).
  const STITCH = 24;

  timeline.classList.add("timeline--js");

  /* ---------- Remplissage de la ligne au défilement ---------- */

  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = timeline.getBoundingClientRect();
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4;
    const fill =
      reducedMotion || atBottom
        ? rect.height
        : Math.min(
            rect.height,
            Math.max(0, window.innerHeight * READING_LINE - rect.top),
          );
    // Arrondi au point près : les points de couture apparaissent un à un.
    const sewn = Math.floor(fill / STITCH) * STITCH;
    timeline.style.setProperty("--fill", `${sewn}px`);

    items.forEach((item) => {
      const dotY = item.offsetTop + DOT_OFFSET;
      item.classList.toggle("is-reached", fill >= dotY);
      // La card apparaît un peu avant que la ligne atteigne sa date.
      item.classList.toggle(
        "is-visible",
        fill >= dotY - window.innerHeight * 0.25 || item.classList.contains("is-open"),
      );
    });
  };
  const requestUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate);
  update();

  /* ---------- Dépliage des articles au clic ---------- */

  const scrollToY = (y, smooth = false) => {
    if (window.lenis) window.lenis.scrollTo(y, smooth ? {} : { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
  };

  // Si un article ouvert plus haut se referme, l'article cliqué ne doit pas
  // sauter à l'écran : on compense le défilement pendant l'animation.
  const keepInPlace = (el, duration = 650) => {
    const startTop = el.getBoundingClientRect().top;
    const until = performance.now() + duration;
    const step = () => {
      const drift = el.getBoundingClientRect().top - startTop;
      if (Math.abs(drift) > 0.5) scrollToY(window.scrollY + drift);
      requestUpdate();
      if (performance.now() < until) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const setOpen = (item, open) => {
    item.classList.toggle("is-open", open);
    const toggle = item.querySelector(".timeline__toggle");
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector("[data-toggle-label]");
    if (label) label.textContent = open ? "Refermer" : "Lire l’article";
  };

  const openOnly = (item, open) => {
    items.forEach((other) => other !== item && setOpen(other, false));
    setOpen(item, open);
  };

  items.forEach((item) => {
    item.querySelector(".timeline__card")?.addEventListener("click", (event) => {
      if (event.target.closest("a")) return; // un lien garde son rôle
      // Clic dans le texte d'un article ouvert (sélection…) : on ne referme pas.
      if (
        item.classList.contains("is-open") &&
        !event.target.closest(".timeline__toggle") &&
        event.target.closest(".timeline__article")
      ) {
        return;
      }
      openOnly(item, !item.classList.contains("is-open"));
      if (!reducedMotion) keepInPlace(item);
    });
  });

  /* ---------- Liens vers une actualité précise (#id) ---------- */

  const itemFromHash = (hash) =>
    hash ? items.find((item) => `#${item.id}` === decodeURIComponent(hash)) : null;

  const goToItem = (item) => {
    openOnly(item, true);
    setTimeout(() => {
      const y = item.getBoundingClientRect().top + window.scrollY - 130;
      scrollToY(y, !reducedMotion);
    }, reducedMotion ? 0 : 520);
  };

  const initial = itemFromHash(window.location.hash);
  if (initial) requestAnimationFrame(() => goToItem(initial));
  window.addEventListener("hashchange", () => {
    const item = itemFromHash(window.location.hash);
    if (item) goToItem(item);
  });
});
