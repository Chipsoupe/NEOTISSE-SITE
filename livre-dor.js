/*
 * Page Livre d'or.
 *
 * - Le livre en cuir s'ouvre au défilement : la scène reste collée à l'écran
 *   pendant que la couverture tourne autour du dos (variable CSS --open,
 *   de 0 = fermé à 1 = ouvert). Sur mobile, la couverture s'efface et laisse
 *   une seule page.
 * - On écrit son mot directement dans le livre. À l'envoi, un « Merci »
 *   s'affiche dans le livre et le mot rejoint les feuilles d'avis en dessous
 *   (chez ce visiteur seulement, tant que Formspree n'est pas branché).
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
    scene.style.setProperty("--open", open.toFixed(4));
    scene.classList.toggle("is-open", open > 0.97);
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

  /* ---------- Feuilles d'avis ---------- */

  const sheetsList = document.querySelector("[data-sheets]");

  const revealSheet = (sheet) => sheet.classList.add("is-in");
  const observer =
    !reducedMotion && "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                revealSheet(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.25 },
        )
      : null;

  // Texte limité à 6 lignes : si le mot est plus long, on ajoute
  // « Lire la suite » pour déplier la feuille.
  const clampSheet = (sheet) => {
    const text = sheet.querySelector("blockquote > p");
    if (!text || sheet.querySelector(".sheet__more")) return;
    text.classList.add("is-clamped");
    if (text.scrollHeight <= text.clientHeight + 2) return; // tout tient
    const more = document.createElement("button");
    more.type = "button";
    more.className = "sheet__more";
    more.textContent = "Lire la suite";
    more.setAttribute("aria-expanded", "false");
    more.addEventListener("click", () => {
      const expanded = sheet.classList.toggle("is-expanded");
      more.textContent = expanded ? "Réduire" : "Lire la suite";
      more.setAttribute("aria-expanded", String(expanded));
    });
    text.after(more);
  };

  if (observer) sheetsList?.classList.add("sheets--js");
  sheetsList?.querySelectorAll(".sheet").forEach((sheet, index) => {
    sheet.style.setProperty("--i", index);
    if (observer) observer.observe(sheet);
    else revealSheet(sheet);
  });
  // Mesure une fois l'écriture manuscrite chargée (elle change la hauteur).
  const clampAll = () => sheetsList?.querySelectorAll(".sheet").forEach(clampSheet);
  if (document.fonts?.ready) document.fonts.ready.then(clampAll);
  else clampAll();

  /* ---------- Envoi d'un mot ---------- */

  const form = document.querySelector("[data-book-form]");
  const thanks = document.querySelector("[data-book-thanks]");
  const errorBox = document.querySelector("[data-book-error]");

  // Crée une feuille avec le mot envoyé (textes insérés comme texte brut).
  const addSheet = ({ nom, structure, temoignage }) => {
    if (!sheetsList) return;
    const sheet = document.createElement("li");
    sheet.className = "sheet sheet--new";
    sheet.style.setProperty("--tilt", `${(Math.random() * 6 - 3).toFixed(1)}deg`);
    sheet.style.setProperty("--i", 0);

    const quote = document.createElement("blockquote");
    const text = document.createElement("p");
    text.textContent = `« ${temoignage} »`;
    const cite = document.createElement("cite");
    const strong = document.createElement("strong");
    strong.textContent = nom;
    cite.append(strong);
    if (structure) cite.append(` · ${structure}`);
    quote.append(text, cite);
    sheet.append(quote);

    sheetsList.prepend(sheet);
    clampSheet(sheet);
    requestAnimationFrame(() => revealSheet(sheet));
  };

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nom = String(data.get("nom") || "").trim();
    const structure = String(data.get("structure") || "").trim();
    const temoignage = String(data.get("temoignage") || "").trim();
    const consent = data.get("consentement");

    if (!nom || !temoignage || !consent) {
      if (errorBox) errorBox.hidden = false;
      const firstInvalid = [
        [form.elements.nom, nom],
        [form.elements.temoignage, temoignage],
        [form.elements.consentement, consent],
      ].find(([, value]) => !value);
      firstInvalid?.[0]?.focus();
      return;
    }

    if (errorBox) errorBox.hidden = true;
    addSheet({ nom, structure, temoignage });
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
