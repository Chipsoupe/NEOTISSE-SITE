/*
 * Page Ateliers : « Le fil des ateliers ».
 *
 * Un fuseau (SVG) file un fil qui descend en vagues de gauche à droite.
 * - Le fil suit le défilement : son extrémité est toujours au niveau de
 *   lecture (60 % de la hauteur de l'écran) ; il se rembobine si on remonte.
 * - Chaque card d'atelier apparaît quand le fil l'atteint.
 * - Un clic sur une card l'agrandit sur place (une seule ouverte à la fois) ;
 *   le fil se recalcule autour.
 * - En bas, le fil fait des allers-retours de plus en plus serrés (trame) et
 *   rejoint le footer tissé.
 * - Arrivée par un lien /ateliers/#id : la card est ouverte et la page y défile.
 *
 * Le tracé est calculé en points (polyligne) plutôt qu'avec getPointAtLength :
 * on connaît ainsi la longueur exacte à chaque point, et le recalcul reste
 * assez rapide pour suivre l'ouverture d'une card image par image.
 */
document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("[data-thread]");
  if (!section) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const threadSvg = section.querySelector(".thread-journey__thread");
  const spindle = section.querySelector(".thread-journey__spindle");
  const weaveZone = section.querySelector(".thread-journey__weave");
  const cards = [...section.querySelectorAll(".thread-card")];
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const mobileQuery = window.matchMedia("(max-width: 800px)");

  // Niveau de lecture : là où se trouve l'extrémité du fil.
  const READING_LINE = 0.6;

  section.classList.add("thread-journey--js");
  if (reducedMotion) section.classList.add("thread-journey--static");

  /* ---------- Fuseau : enroulement et marques qui défilent ---------- */

  const wrapsGroup = spindle?.querySelector("[data-spindle-wraps]");
  const marksGroup = spindle?.querySelector("[data-spindle-marks]");
  const WRAP_PERIOD = 9;
  const MARK_PERIOD = 14;

  const fillSpindle = () => {
    if (!wrapsGroup || !marksGroup) return;
    // Fils enroulés sur la bobine : traits obliques, sur deux périodes de
    // large pour pouvoir les faire défiler en boucle.
    for (let x = -60; x <= 180; x += WRAP_PERIOD) {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", x);
      line.setAttribute("y1", 36);
      line.setAttribute("x2", x + 26);
      line.setAttribute("y2", 132);
      wrapsGroup.append(line);
    }
    // Marques gravées sur la fusaïole.
    for (let x = -40; x <= 160; x += MARK_PERIOD) {
      const mark = document.createElementNS(SVG_NS, "line");
      mark.setAttribute("x1", x);
      mark.setAttribute("y1", 146);
      mark.setAttribute("x2", x);
      mark.setAttribute("y2", 170);
      marksGroup.append(mark);
    }
  };
  fillSpindle();

  const spinSpindle = () => {
    if (!wrapsGroup || !marksGroup || reducedMotion) return;
    const turn = window.scrollY * 0.35;
    wrapsGroup.setAttribute(
      "transform",
      `translate(${-(turn % WRAP_PERIOD)} 0)`,
    );
    marksGroup.setAttribute(
      "transform",
      `translate(${-((turn * 1.6) % MARK_PERIOD)} 0)`,
    );
  };

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
  // Deux tracés de masque : le fil principal et la trame, révélés séparément.
  const maskMain = make("path", { class: "thread-mask" }, mask);
  const maskWeave = make("path", { class: "thread-mask" }, mask);

  const threadGroup = make("g", { mask: "url(#thread-reveal)" });
  // Fil réaliste = plusieurs passes sur le même tracé :
  // ombre portée, corps du fil, torsion (brins sombres), reflet.
  const layers = ["shadow", "body", "ply", "sheen"].map((name) =>
    make("path", { class: `thread-layer thread-layer--${name}` }, threadGroup),
  );

  /* ---------- Géométrie ---------- */

  let geometry = null;

  // Position d'un élément dans la section, sans les transformations CSS
  // (les cards glissent en apparaissant : on ne veut pas que le fil bouge).
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
    const pull = Math.max(40, (to.y - from.y) * 0.55);
    pushCubic(
      points,
      from,
      { x: from.x, y: from.y + pull },
      { x: to.x, y: to.y - pull },
      to,
    );
  };

  // Le long d'une card : descente avec un léger balancement.
  const pushSway = (points, x, yTop, yBottom, sway) => {
    const h = yBottom - yTop;
    pushCubic(
      points,
      { x, y: yTop },
      { x: x + sway, y: yTop + h / 3 },
      { x: x - sway, y: yTop + (2 * h) / 3 },
      { x, y: yBottom },
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

    // Départ : sur le flanc de la bobine du fuseau. (Un <svg> n'a pas
    // d'offsetTop : on le mesure à l'écran, il n'est jamais transformé.)
    const sectionRect = section.getBoundingClientRect();
    const spindleRect = spindle.getBoundingClientRect();
    const start = {
      x: spindleRect.left - sectionRect.left + spindleRect.width * 0.72,
      y: spindleRect.top - sectionRect.top + spindleRect.height * 0.4,
    };

    const main = [start];
    const cardMarks = [];
    let previous = start;

    cards.forEach((card, index) => {
      const box = layoutBox(card);
      const side = card.dataset.side;
      let laneX;
      if (isMobile) {
        laneX = 22;
      } else if (side === "right") {
        laneX = box.left * 0.5;
      } else {
        laneX = box.right + (width - box.right) * 0.5;
      }
      const top = { x: laneX, y: box.top + 24 };
      const bottom = { x: laneX, y: box.bottom - 24 };
      pushWave(main, previous, top);
      pushSway(main, laneX, top.y, bottom.y, (index % 2 ? -1 : 1) * (isMobile ? 9 : 26));
      previous = bottom;
      // La card apparaît quand le fil arrive à 20 % de sa hauteur.
      cardMarks.push(box.top + box.height * 0.2);
    });

    // Trame : allers-retours de plus en plus serrés jusqu'au footer.
    const weaveBox = layoutBox(weaveZone);
    const margin = isMobile ? 12 : 24;
    const weave = [];
    let y = weaveBox.top + 8;
    let goingRight = previous.x < width / 2;
    let x = goingRight ? margin : width - margin;
    pushWave(main, previous, { x, y });
    weave.push({ x, y });
    let spacing = isMobile ? 26 : 34;
    while (y + spacing < weaveBox.bottom) {
      const endX = goingRight ? width - margin : margin;
      weave.push({ x: endX, y });
      // Demi-tour arrondi vers le rang suivant.
      const r = spacing / 2;
      const cx = endX;
      const cy = y + r;
      const dir = goingRight ? 1 : -1;
      for (let a = 1; a <= 8; a++) {
        const angle = -Math.PI / 2 + (a / 8) * Math.PI;
        weave.push({ x: cx + dir * Math.cos(angle) * r * 0.6, y: cy + Math.sin(angle) * r });
      }
      y += spacing;
      goingRight = !goingRight;
      spacing = Math.max(4, spacing * 0.8);
    }
    weave.push({ x: goingRight ? width - margin : margin, y });

    const mainLengths = cumulativeLengths(main);
    const weaveLengths = cumulativeLengths(weave);
    // Hauteurs croissantes pour retrouver la longueur à une hauteur donnée.
    const mainY = [];
    let maxY = -Infinity;
    main.forEach((p) => {
      maxY = Math.max(maxY, p.y);
      mainY.push(maxY);
    });

    const d = `${toPath(main)} ${toPath(weave)}`;
    layers.forEach((layer) => layer.setAttribute("d", d));
    maskMain.setAttribute("d", toPath(main));
    maskWeave.setAttribute("d", toPath(weave));

    const mainTotal = mainLengths[mainLengths.length - 1];
    const weaveTotal = weaveLengths[weaveLengths.length - 1];
    maskMain.style.strokeDasharray = `${mainTotal} ${mainTotal}`;
    maskWeave.style.strokeDasharray = `${weaveTotal} ${weaveTotal}`;

    geometry = {
      mainY,
      mainLengths,
      mainTotal,
      weaveTotal,
      weaveTop: weaveBox.top,
      weaveBottom: weaveBox.bottom,
      cardMarks,
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
    spinSpindle();

    const sectionTop = section.getBoundingClientRect().top;
    let reading = window.innerHeight * READING_LINE - sectionTop;
    // En bas de page, tout le fil est déroulé.
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4;
    if (reducedMotion || atBottom) reading = Infinity;

    const mainDrawn = mainLengthAt(reading);
    maskMain.style.strokeDashoffset = geometry.mainTotal - mainDrawn;

    const weaveProgress =
      mainDrawn >= geometry.mainTotal - 1
        ? Math.min(
            1,
            Math.max(
              0,
              (reading - geometry.weaveTop) /
                (geometry.weaveBottom - geometry.weaveTop),
            ),
          )
        : 0;
    maskWeave.style.strokeDashoffset =
      geometry.weaveTotal - geometry.weaveTotal * weaveProgress;

    cards.forEach((card, index) => {
      card.classList.toggle(
        "is-visible",
        reading >= geometry.cardMarks[index] || card.classList.contains("is-open"),
      );
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

  /* ---------- Ouverture des cards ---------- */

  const scrollToY = (y) => {
    if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };

  // Pendant l'animation d'ouverture, on garde la card cliquée immobile à
  // l'écran (une card refermée au-dessus d'elle ferait sinon remonter la page).
  const keepInPlace = (card, duration = 650) => {
    const startTop = card.getBoundingClientRect().top;
    const until = performance.now() + duration;
    const step = () => {
      const drift = card.getBoundingClientRect().top - startTop;
      if (Math.abs(drift) > 0.5) scrollToY(window.scrollY + drift);
      if (performance.now() < until) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const setOpen = (card, open) => {
    card.classList.toggle("is-open", open);
    const toggle = card.querySelector(".thread-card__toggle");
    toggle?.setAttribute("aria-expanded", String(open));
    const label = card.querySelector(".thread-card__more-label");
    if (label) label.textContent = open ? "Refermer" : "Découvrir l’atelier";
  };

  const openCard = (card, { keep = true } = {}) => {
    const willOpen = !card.classList.contains("is-open");
    cards.forEach((other) => {
      if (other !== card && other.classList.contains("is-open")) setOpen(other, false);
    });
    setOpen(card, willOpen);
    if (keep && !reducedMotion) keepInPlace(card);
  };

  cards.forEach((card) => {
    card
      .querySelector(".thread-card__toggle")
      ?.addEventListener("click", () => openCard(card));
  });

  /* ---------- Liens vers un atelier précis (#id) ---------- */

  const cardFromHash = (hash) =>
    hash ? cards.find((card) => `#${card.id}` === decodeURIComponent(hash)) : null;

  const goToCard = (card) => {
    if (!card.classList.contains("is-open")) {
      cards.forEach((other) => other !== card && setOpen(other, false));
      setOpen(card, true);
    }
    // Attend la fin de l'ouverture avant de défiler jusqu'à la card.
    setTimeout(() => {
      build();
      const y = card.getBoundingClientRect().top + window.scrollY - 130;
      if (window.lenis && !reducedMotion) window.lenis.scrollTo(y);
      else scrollToY(y);
    }, reducedMotion ? 0 : 520);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href*='#']");
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname) return;
    const card = cardFromHash(url.hash);
    if (!card) return;
    event.preventDefault();
    history.replaceState(null, "", url.hash);
    goToCard(card);
  });

  /* ---------- Démarrage ---------- */

  build();
  render();

  const initialCard = cardFromHash(window.location.hash);
  if (initialCard) {
    // Évite le saut natif du navigateur vers l'ancre, puis ouvre la card.
    requestAnimationFrame(() => goToCard(initialCard));
  }

  // Changement d'ancre sans rechargement (adresse modifiée, historique…).
  window.addEventListener("hashchange", () => {
    const card = cardFromHash(window.location.hash);
    if (card) goToCard(card);
  });

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestBuild);
  mobileQuery.addEventListener?.("change", requestBuild);
  // Taille de la section qui change (card qui s'ouvre, images chargées…).
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(requestBuild);
    observer.observe(section);
    cards.forEach((card) => observer.observe(card));
  }
  window.addEventListener("load", requestBuild);
});
