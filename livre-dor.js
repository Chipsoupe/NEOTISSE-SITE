/*
 * Page Livre d'or.
 *
 * - Le livre en cuir s'ouvre au défilement : la scène reste collée à l'écran
 *   pendant que la couverture tourne autour du dos (variable CSS --open,
 *   de 0 = fermé à 1 = ouvert). Sur mobile, la couverture s'efface et laisse
 *   une seule page.
 * - On écrit son mot directement dans le livre. À l'envoi, il part dans le
 *   back office Sanity (en attente de validation) et un « Merci » s'affiche
 *   dans le livre. Le mot rejoint les feuilles d'avis une fois publié.
 * - Les feuilles d'avis tombent doucement en place quand elles apparaissent.
 */
document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------- Ouverture du livre au défilement ---------- */

  const scene = document.querySelector("[data-book-scene]");
  const mobileQuery = window.matchMedia("(max-width: 800px)");
  const book = scene?.querySelector("[data-book]");

  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  // Plage du défilement (dans la scène) sur laquelle la couverture tourne.
  const OPEN_FROM = 0.06;
  const OPEN_TO = 0.62;

  // Position de la scène dans la page (indépendante de tout parent positionné).
  const sceneTop = () => scene.getBoundingClientRect().top + window.scrollY;

  let openFrame = 0;
  const updateOpen = () => {
    openFrame = 0;
    if (!scene || !book) return;
    let open;
    if (mobileQuery.matches) {
      // Mobile (pas de scène collée) : le livre est visible fermé au
      // chargement, puis la couverture s'ouvre pendant que son haut monte
      // de 32 % de l'écran jusqu'en haut.
      const top = book.getBoundingClientRect().top;
      const h = window.innerHeight;
      open = smoothstep(0, 1, (h * 0.32 - top) / (h * 0.32));
    } else {
      const range = scene.offsetHeight - window.innerHeight;
      const raw = range > 0 ? (window.scrollY - sceneTop()) / range : 1;
      open = smoothstep(OPEN_FROM, OPEN_TO, raw);
    }
    // Presque ouvert = ouvert : on cale la valeur sur 1 pour que le livre
    // n'ait plus d'échelle fractionnaire (sinon Chrome laisse des traits
    // noirs en redessinant la page pendant qu'on écrit).
    if (open > 0.97) open = 1;
    scene.style.setProperty("--open", open.toFixed(4));
    scene.classList.toggle("is-open", open === 1);
  };

  if (scene && book) {
    if (reducedMotion) {
      scene.classList.add("book-scene--static", "is-open");
      scene.style.setProperty("--open", "1");
    } else {
      const requestOpen = () => {
        if (!openFrame) openFrame = requestAnimationFrame(updateOpen);
      };
      window.addEventListener("scroll", requestOpen, { passive: true });
      window.addEventListener("resize", requestOpen);
      updateOpen();

      // Au clavier : si on entre dans le formulaire alors que le livre est
      // encore fermé, on défile jusqu'à ce qu'il soit ouvert.
      book.addEventListener("focusin", () => {
        if (scene.classList.contains("is-open")) return;
        const range = scene.offsetHeight - window.innerHeight;
        const y = mobileQuery.matches
          ? book.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3
          : sceneTop() + range * (OPEN_TO + 0.04);
        if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      });
    }
  }

  // Les feuilles d'avis (apparition, « Lire la suite ») sont gérées par
  // script.js : elles sont aussi sur l'accueil.

  /* ---------- Envoi d'un mot ---------- */

  const form = document.querySelector("[data-book-form]");
  const thanks = document.querySelector("[data-book-thanks]");
  const errorBox = document.querySelector("[data-book-error]");

  const submitButton = form?.querySelector('[type="submit"]');
  const showError = (message) => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  };
  const defaultError = errorBox?.textContent.trim();

  // Envoi à la fonction Netlify (netlify/functions/livre-dor.mjs), qui crée
  // l'avis « en attente » dans Sanity. Il apparaît sur le site une fois
  // validé par une fondatrice dans le back office.
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nom = String(data.get("nom") || "").trim();
    const structure = String(data.get("structure") || "").trim();
    const temoignage = String(data.get("temoignage") || "").trim();
    const consentement = Boolean(data.get("consentement"));

    if (!nom || !temoignage || !consentement) {
      showError(defaultError);
      const firstInvalid = [
        [form.elements.nom, nom],
        [form.elements.temoignage, temoignage],
        [form.elements.consentement, consentement],
      ].find(([, value]) => !value);
      firstInvalid?.[0]?.focus();
      return;
    }

    if (errorBox) errorBox.hidden = true;
    if (submitButton) submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("/api/livre-dor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          structure,
          temoignage,
          consentement,
          site: String(data.get("site") || ""), // champ piège anti-robots
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "");
    } catch (error) {
      showError(
        error.message ||
          "L’envoi n’a pas fonctionné. Merci de réessayer plus tard ou de nous écrire par e-mail.",
      );
      return;
    } finally {
      if (submitButton) submitButton.disabled = false;
      form.removeAttribute("aria-busy");
    }

    form.hidden = true;
    if (thanks) {
      thanks.hidden = false;
      thanks.focus();
    }
  });

  document.querySelector("[data-book-again]")?.addEventListener("click", () => {
    form?.reset();
    if (thanks) thanks.hidden = true;
    if (form) {
      form.hidden = false;
      form.elements.nom?.focus();
    }
  });
});
