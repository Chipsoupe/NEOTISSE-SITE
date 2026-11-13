/*
 * Page Ateliers : « Le fil des ateliers ».
 *
 * Un fil entre par le bord droit de la page puis descend en vagues en
 * passant derrière le centre de chaque card : on ne le voit qu'entre deux
 * cards, il les relie sans leur voler la vedette.
 * - Le fil suit le défilement : son extrémité est toujours au niveau de
 *   lecture (60 % de la hauteur de l'écran) ; il se rembobine si on remonte.
 * - Chaque atelier (card + texte) apparaît quand le fil l'atteint.
 * - Chaque atelier est une rangée : la card (photo, titre, bouton flèche)
 *   d'un côté, une mini description de l'autre. Le texte complet se déplie
 *   au survol de la card (CSS), ou au toucher sur mobile (classe .is-open).
 * - Après la dernière card, le fil fait une dernière vague et s'arrête
 *   au-dessus du CTA final « Tissons ensemble votre atelier ».
 * - Arrivée par un lien /ateliers/#id : la page défile jusqu'à l'atelier.
 * - Le fond de l'intro et du parcours change de couleur au défilement
 *   (bords crème, centre qui vire au jaune), couleurs réglables en CSS.
 *
 * Le tracé est calculé en points (polyligne) : on connaît ainsi la longueur
 * exacte à chaque point, et le recalcul reste rapide.
 */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Fond qui évolue au défilement ---------- */
  // Les couleurs viennent des variables CSS --journey-* posées sur
  // [data-scroll-bg] (voir style.css) : on les change là, pas ici.
  const scrollBg = document.querySelector("[data-scroll-bg]");
  if (scrollBg) {
    const regionStart = scrollBg.querySelector(".thread-journey") || scrollBg;
    const footer = document.querySelector(".site-footer");

    const parseColor = (value) => {
      const v = value.trim();
      let m = v.match(/^#([0-9a-f]{3})$/i);
      if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
      m = v.match(/^#([0-9a-f]{6})$/i);
      if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      m = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
      if (m) return [m[1], m[2], m[3]].map(Number);
      return null;
    };
    const mix = (a, b, t) =>
      `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(" ")})`;
    // Luminance relative (WCAG), pour savoir quand le fond devient sombre.
    const luminance = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const smoothstep = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    let palette = null;
    const readPalette = () => {
      const styles = getComputedStyle(scrollBg);
      const get = (name) => parseColor(styles.getPropertyValue(name));
      const from = get("--journey-from");
      const to = get("--journey-to");
      const inkFrom = get("--journey-ink-from");
      const inkTo = get("--journey-ink-to");
      if (!from || !to || !inkFrom || !inkTo) return null;
      // Moment où le fond devient assez sombre pour un texte clair : le
      // texte change de teinte autour de ce point, sur une plage resserrée,
      // pour ne jamais avoir texte et fond de même valeur.
      // Si le fond ne devient jamais sombre (arrivée claire, ex. jaune),
      // le texte reste sombre du début à la fin.
      let pivot = 2;
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const rgb = from.map((v, k) => v + (to[k] - v) * t);
        if (luminance(rgb) < 0.18) {
          pivot = t;
          break;
        }
      }
      return { from, to, inkFrom, inkTo, pivot };
    };

    let bgFrame = 0;
    const updateBg = () => {
      bgFrame = 0;
      if (!palette) return;
      // Départ : dès que la section des cards entre en bas de l'écran
      // (et non quand elle atteint le haut), pour que le jaune arrive tôt.
      const start =
        regionStart.getBoundingClientRect().top +
        window.scrollY -
        window.innerHeight;
      // Arrivée : quand le footer entre en bas de l'écran.
      const end = footer
        ? footer.getBoundingClientRect().top + window.scrollY - window.innerHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const linear =
        end > start
          ? Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)))
          : 0;
      // Courbe qui monte vite au début : la couleur est bien présente dès
      // les premières cards, puis s'intensifie plus doucement.
      const progress = 1 - (1 - linear) ** 1.8;
      const inkT = smoothstep(palette.pivot - 0.08, palette.pivot + 0.08, progress);
      scrollBg.style.setProperty("--journey-bg", mix(palette.from, palette.to, progress));
      scrollBg.style.setProperty(
        "--journey-ink",
        mix(palette.inkFrom, palette.inkTo, inkT),
      );
    };
    const requestBg = () => {
      if (!bgFrame) bgFrame = requestAnimationFrame(updateBg);
    };

    palette = readPalette();
    updateBg();
    window.addEventListener("scroll", requestBg, { passive: true });
    window.addEventListener("resize", () => {
      palette = readPalette();
      requestBg();
    });
    window.addEventListener("load", requestBg);
  }

  const section = document.querySelector("[data-thread]");
  if (!section) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const threadSvg = section.querySelector(".thread-journey__thread");
  const list = section.querySelector(".thread-journey__list");
  const finalCta = section.querySelector(".thread-journey__cta");
  // Une rangée = une card (photo, titre, accroche) + le texte complet en face.
  const rows = [...section.querySelectorAll(".thread-row")];
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const mobileQuery = window.matchMedia("(max-width: 800px)");

  // Niveau de lecture : là où se trouve l'extrémité du fil.
  const READING_LINE = 0.6;

  section.classList.add("thread-journey--js");
  if (reducedMotion) section.classList.add("thread-journey--static");

  /* ---------- Calques du fil ---------- */

  const make = (tag, attrs = {}, parent = threadSvg) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    parent.append(el);
    return el;
  };

  const defs = make("defs");
  const mask = make(
    "mask",
    { id: "thread-reveal", maskUnits: "userSpaceOnUse" },
    defs,
  );
  // Tracé de masque : révèle le fil au fil du défilement.
  const maskMain = make("path", { class: "thread-mask" }, mask);

  const threadGroup = make("g", { mask: "url(#thread-reveal)" });
  // Fil simple : un seul trait continu.
  const layers = ["body"].map((name) =>
    make("path", { class: `thread-layer thread-layer--${name}` }, threadGroup),
  );

  /* ---------- Géométrie ---------- */

  let geometry = null;

  // Position d'un élément dans la section, sans les transformations CSS
  // (les cards glissent en apparaissant : le fil ne doit pas bouger).
  const layoutBox = (el) => {
    let top = 0;
    let left = 0;
    let node = el;
    while (node && node !== section) {
      top += node.offsetTop;
      left += node.offsetLeft;
      node = node.offsetParent;
    }
    return {
      top,
      left,
      width: el.offsetWidth,
      height: el.offsetHeight,
      bottom: top + el.offsetHeight,
      right: left + el.offsetWidth,
    };
  };

  const pushCubic = (points, p0, p1, p2, p3, step = 6) => {
    const approx =
      Math.hypot(p1.x - p0.x, p1.y - p0.y) +
      Math.hypot(p2.x - p1.x, p2.y - p1.y) +
      Math.hypot(p3.x - p2.x, p3.y - p2.y);
    const n = Math.max(4, Math.ceil(approx / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      points.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      });
    }
  };

  // Courbe en S à tangentes verticales entre deux points (une « vague »).
  const pushWave = (points, from, to) => {
    const pull = Math.max(40, (to.y - from.y) * 0.6);
    pushCubic(
      points,
      from,
      { x: from.x, y: from.y + pull },
      { x: to.x, y: to.y - pull },
      to,
    );
  };

  const toPath = (points) =>
    points
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join("");

  const cumulativeLengths = (points) => {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      lengths.push(
        lengths[i - 1] +
          Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y),
      );
    }
    return lengths;
  };

  const build = () => {
    const width = section.clientWidth;
    const height = section.offsetHeight;
    const isMobile = mobileQuery.matches;
    threadSvg.setAttribute("width", width);
    threadSvg.setAttribute("height", height);
    threadSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Points de passage : derrière le centre de chaque card. Sur mobile les
    // cards sont empilées pleine largeur, on décale donc le passage à gauche
    // puis à droite pour garder des vagues entre deux cards.
    // Mobile : le texte de chaque atelier est sous sa card, le fil ne peut
    // donc pas serpenter au milieu ; il longe le bord gauche en petites vagues.
    const anchors = rows.map((row, index) => {
      const box = layoutBox(row.querySelector(".thread-card") || row);
      return {
        x: isMobile ? (index % 2 ? 6 : 14) : box.left + box.width / 2,
        y: box.top + box.height / 2,
        // La card apparaît un peu avant que le fil l'atteigne : elle est
        // déjà opaque quand le fil passe derrière elle.
        mark: box.top - window.innerHeight * 0.15,
      };
    });

    // Entrée : depuis l'extérieur de la page, à droite, au-dessus des cards.
    const listBox = layoutBox(list);
    // (dans l'espace libre entre le titre et la première card)
    const entryY = listBox.top + (isMobile ? 32 : 56);
    const start = { x: width + 40, y: entryY };
    const main = [start];
    const first = anchors[0];
    pushCubic(
      main,
      start,
      { x: width * 0.55, y: entryY },
      { x: first.x, y: entryY + (first.y - entryY) * 0.25 },
      first,
    );
    for (let i = 1; i < anchors.length; i++) {
      pushWave(main, anchors[i - 1], anchors[i]);
    }

    // Fin : une dernière vague jusque juste au-dessus du titre du CTA final.
    const ctaTitle = finalCta.querySelector("h2") || finalCta;
    pushWave(main, anchors[anchors.length - 1], {
      x: width / 2,
      y: layoutBox(ctaTitle).top - (isMobile ? 28 : 40),
    });

    const mainLengths = cumulativeLengths(main);
    // Hauteurs croissantes pour retrouver la longueur à une hauteur donnée.
    const mainY = [];
    let maxY = -Infinity;
    main.forEach((p) => {
      maxY = Math.max(maxY, p.y);
      mainY.push(maxY);
    });

    const d = toPath(main);
    layers.forEach((layer) => layer.setAttribute("d", d));
    maskMain.setAttribute("d", d);

    const mainTotal = mainLengths[mainLengths.length - 1];
    maskMain.style.strokeDasharray = `${mainTotal} ${mainTotal}`;

    geometry = {
      mainY,
      mainLengths,
      mainTotal,
      cardMarks: anchors.map((a) => a.mark),
    };
  };

  // Longueur du fil principal déroulée jusqu'à la hauteur y (dans la section).
  const mainLengthAt = (y) => {
    const { mainY, mainLengths, mainTotal } = geometry;
    if (y <= mainY[0]) return 0;
    if (y >= mainY[mainY.length - 1]) return mainTotal;
    let lo = 0;
    let hi = mainY.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (mainY[mid] <= y) lo = mid;
      else hi = mid;
    }
    const span = mainY[hi] - mainY[lo];
    const t = span > 0 ? (y - mainY[lo]) / span : 1;
    return mainLengths[lo] + (mainLengths[hi] - mainLengths[lo]) * t;
  };

  /* ---------- Rendu au défilement ---------- */

  const render = () => {
    if (!geometry) return;

    const sectionTop = section.getBoundingClientRect().top;
    let reading = window.innerHeight * READING_LINE - sectionTop;
    // En bas de page, tout le fil est déroulé.
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4;
    if (reducedMotion || atBottom) reading = Infinity;

    const mainDrawn = mainLengthAt(reading);
    maskMain.style.strokeDashoffset = geometry.mainTotal - mainDrawn;

    rows.forEach((row, index) => {
      row.classList.toggle("is-visible", reading >= geometry.cardMarks[index]);
    });
  };

  let frame = 0;
  const requestRender = () => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
    }
  };

  let buildFrame = 0;
  const requestBuild = () => {
    if (!buildFrame) {
      buildFrame = requestAnimationFrame(() => {
        buildFrame = 0;
        build();
        render();
      });
    }
  };

  const scrollToY = (y) => {
    if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };

  /* ---------- Dépliage au toucher (mobile, tablette) ---------- */
  // Sur ordinateur, le texte complet se déplie au survol (CSS) et un clic ne
  // fait rien. Sur écran tactile, toucher la card la déplie (une à la fois).
  const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  // Si une card ouverte plus haut se referme, la card touchée ne doit pas
  // sauter à l'écran : on compense le défilement pendant l'animation.
  const keepInPlace = (el, duration = 650) => {
    const startTop = el.getBoundingClientRect().top;
    const until = performance.now() + duration;
    const step = () => {
      const drift = el.getBoundingClientRect().top - startTop;
      if (Math.abs(drift) > 0.5) scrollToY(window.scrollY + drift);
      if (performance.now() < until) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  rows.forEach((row) => {
    row.querySelector(".thread-card")?.addEventListener("click", (event) => {
      if (hoverQuery.matches) return;
      if (event.target.closest("a")) return; // le bouton flèche mène au contact
      const willOpen = !row.classList.contains("is-open");
      rows.forEach((other) => other !== row && other.classList.remove("is-open"));
      row.classList.toggle("is-open", willOpen);
      if (!reducedMotion) keepInPlace(row);
    });
  });

  /* ---------- Liens vers un atelier précis (#id) ---------- */

  const rowFromHash = (hash) =>
    hash ? rows.find((row) => `#${row.id}` === decodeURIComponent(hash)) : null;

  // Défile jusqu'à la rangée de l'atelier (le fil se déroule jusqu'à elle).
  const goToRow = (row) => {
    const y = row.getBoundingClientRect().top + window.scrollY - 130;
    if (window.lenis && !reducedMotion) window.lenis.scrollTo(y);
    else scrollToY(y);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href*='#']");
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname) return;
    const row = rowFromHash(url.hash);
    if (!row) return;
    event.preventDefault();
    history.replaceState(null, "", url.hash);
    goToRow(row);
  });

  /* ---------- Démarrage ---------- */

  build();
  render();

  const initialRow = rowFromHash(window.location.hash);
  if (initialRow) requestAnimationFrame(() => goToRow(initialRow));

  // Changement d'ancre sans rechargement (adresse modifiée, historique…).
  window.addEventListener("hashchange", () => {
    const row = rowFromHash(window.location.hash);
    if (row) goToRow(row);
  });

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestBuild);
  mobileQuery.addEventListener?.("change", requestBuild);
  // Taille de la section qui change (images chargées, polices…).
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(requestBuild);
    observer.observe(section);
    rows.forEach((row) => observer.observe(row));
  }
  window.addEventListener("load", requestBuild);
});
