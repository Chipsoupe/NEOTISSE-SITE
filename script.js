document.addEventListener("DOMContentLoaded", () => {
  // Smooth scroll (Lenis).
  // The anchor offset leaves room for the fixed header.
  if (typeof window.Lenis === "function") {
    window.lenis = new window.Lenis({
      autoRaf: true,
      lerp: 0.12,
      respectReducedMotion: false,
      anchors: { offset: -102 },
    });
  }

  // Navbar : voile léger en haut de page (sur le hero), plus opaque ensuite.
  const siteHeader = document.querySelector(".site-header");
  const heroSection = document.querySelector("main > section:first-child");
  const updateHeaderState = () => {
    if (!siteHeader) return;
    const threshold = heroSection
      ? heroSection.offsetHeight - siteHeader.offsetHeight
      : 40;
    siteHeader.classList.toggle("is-scrolled", window.scrollY > threshold);
  };
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  window.addEventListener("resize", updateHeaderState);
  updateHeaderState();

  const menuToggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#site-menu");

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menu?.classList.toggle("is-open", !isOpen);
  });

  // Close the mobile menu after an in-page link is followed.
  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle?.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
    });
  });

  const banner = document.querySelector("[data-cookie-banner]");
  const consentKey = "neotisse-cookie-consent";
  const saveConsent = (value) => {
    document.cookie = `${consentKey}=${value}; max-age=${60 * 60 * 24 * 183}; path=/; SameSite=Lax`;
    if (banner) banner.hidden = true;
    // Balise Google (définie dans le <head>) : chargée dès l'accord donné.
    if (value === "statistics") window.loadGoogleTag?.();
  };

  if (banner && !document.cookie.includes(`${consentKey}=`)) {
    banner.hidden = false;
  }

  document
    .querySelector("[data-cookie-accept]")
    ?.addEventListener("click", () => saveConsent("statistics"));
  document
    .querySelector("[data-cookie-deny]")
    ?.addEventListener("click", () => saveConsent("necessary"));
  document
    .querySelector("[data-manage-cookies]")
    ?.addEventListener("click", () => {
      if (banner) banner.hidden = false;
    });

  const homepageAteliers = document.querySelectorAll(
    ".homepage .atelier-list details",
  );
  const supportsHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

  const parallaxImages = document.querySelectorAll("[data-parallax]");
  const parallaxBackgrounds = document.querySelectorAll("[data-parallax-bg]");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const parallaxIntensity = 90;
  let parallaxFrame = 0;

  // Accueil, section logo Néotisse : le logo part grand (×2,5) et rétrécit
  // au fil du défilement jusqu'à sa taille normale, atteinte quand les cards
  // « Rigueur scientifique » / « Sur mesure » touchent la section.
  // Le logo change de largeur (pas de transform) : le texte remonte avec lui.
  const introSection = document.querySelector(".homepage .intro");
  const introTrack = document.querySelector(".home-scroll-sequence__intro");
  const introLogo = introSection?.querySelector(".intro__content img");

  if (introSection && introTrack && introLogo && !reducedMotion) {
    const START_SCALE = 2.5;
    let metrics = null;
    let logoFrame = 0;

    // Mesures au repos (logo à sa taille normale), refaites au redimensionnement.
    const measureIntro = () => {
      introSection.style.removeProperty("--intro-logo-w");
      const baseWidth = introLogo.offsetWidth;
      if (!baseWidth) return null;
      const ratio = introLogo.offsetHeight / baseWidth || 1;
      const restHeight = introSection.offsetHeight;
      const isSticky = getComputedStyle(introSection).position === "sticky";

      if (isSticky) {
        // Ordinateur : le bloc est collé sous la navbar dans la piste.
        const stickyTop = parseFloat(getComputedStyle(introSection).top) || 0;
        const range = introTrack.offsetHeight - restHeight;
        // Le bloc agrandi doit tenir dans la piste, sinon il chevaucherait
        // les cards : on plafonne la taille de départ à la place disponible.
        const startWidth = Math.min(
          baseWidth * START_SCALE,
          baseWidth + Math.max(0, range) / ratio,
        );
        return { isSticky, baseWidth, startWidth, stickyTop, range };
      }

      // Mobile : pas de séquence collante. Le logo rétrécit entre l'entrée
      // de la section à l'écran et son arrivée sous la navbar.
      const startWidth = Math.min(
        baseWidth * START_SCALE,
        introSection.clientWidth - 48,
      );
      return { isSticky, baseWidth, startWidth };
    };

    const updateIntroLogo = () => {
      logoFrame = 0;
      if (!metrics) return;
      let progress;

      if (metrics.isSticky) {
        progress =
          metrics.range > 0
            ? (metrics.stickyTop - introTrack.getBoundingClientRect().top) /
              metrics.range
            : 1;
      } else {
        const headerHeight = siteHeader?.offsetHeight || 0;
        const start = window.innerHeight * 0.85;
        const end = headerHeight;
        progress =
          (start - introSection.getBoundingClientRect().top) / (start - end);
      }

      progress = Math.max(0, Math.min(1, progress));
      const width =
        metrics.startWidth + (metrics.baseWidth - metrics.startWidth) * progress;
      introSection.style.setProperty("--intro-logo-w", `${width}px`);
    };

    const requestIntroLogoUpdate = () => {
      if (!logoFrame) {
        logoFrame = window.requestAnimationFrame(updateIntroLogo);
      }
    };

    const remeasureIntro = () => {
      metrics = measureIntro();
      updateIntroLogo();
    };

    window.addEventListener("scroll", requestIntroLogoUpdate, { passive: true });
    window.addEventListener("resize", remeasureIntro);
    // Les attributs width/height du logo donnent déjà ses proportions ;
    // on remesure quand même une fois l'image (lazy) chargée.
    remeasureIntro();
    if (!introLogo.complete) {
      introLogo.addEventListener("load", remeasureIntro, { once: true });
    }
  }

  const updateParallax = () => {
    parallaxFrame = 0;
    const viewportCenter = window.innerHeight / 2;

    parallaxImages.forEach((image) => {
      // Mesure sur le cadre (non transformé) plutôt que sur l'image déplacée.
      const frame = image.parentElement || image;
      const bounds = frame.getBoundingClientRect();
      const distanceFromCenter =
        (bounds.top + bounds.height / 2 - viewportCenter) / window.innerHeight;
      // Le zoom CSS de 1.18 laisse 9 % de marge en haut et en bas :
      // on ne décale jamais plus, pour ne pas faire apparaître de bord vide.
      const maxOffset = Math.min(
        parallaxIntensity,
        Math.max(0, image.offsetHeight * 0.09 - 1),
      );
      const offset = Math.max(-1, Math.min(1, distanceFromCenter)) * -maxOffset;
      image.style.setProperty("--parallax-offset", `${offset}px`);
    });

    parallaxBackgrounds.forEach((section) => {
      const bounds = section.getBoundingClientRect();
      const distanceFromCenter =
        (bounds.top + bounds.height / 2 - viewportCenter) / window.innerHeight;
      const offset =
        Math.max(-1, Math.min(1, distanceFromCenter)) * -parallaxIntensity;
      section.style.setProperty("--bg-parallax-offset", `${offset}px`);
    });
  };

  if ((parallaxImages.length || parallaxBackgrounds.length) && !reducedMotion) {
    const requestParallaxUpdate = () => {
      if (!parallaxFrame) {
        parallaxFrame = window.requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
    window.addEventListener("resize", requestParallaxUpdate);
    requestParallaxUpdate();
  }

  if (supportsHover) {
    homepageAteliers.forEach((atelier) => {
      const summary = atelier.querySelector("summary");

      atelier.addEventListener("mouseenter", () => {
        atelier.open = true;
      });
      atelier.addEventListener("mouseleave", () => {
        atelier.open = false;
      });
      summary?.addEventListener("click", (event) => {
        if (event.detail > 0 && !event.target.closest("a")) {
          event.preventDefault();
        }
      });
    });
  }

  // Coutures entre deux sections ([data-seam]) : la ligne de points se coud
  // de gauche à droite quand elle arrive à l'écran.
  const seams = document.querySelectorAll("[data-seam]");
  if (seams.length && !reducedMotion && "IntersectionObserver" in window) {
    const seamObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-sewn");
          seamObserver.unobserve(entry.target);
        });
      },
      { threshold: 1, rootMargin: "0px 0px -15% 0px" },
    );
    seams.forEach((seam) => {
      seam.classList.add("seam--animated");
      seamObserver.observe(seam);
    });
  }

  // Feuilles d'avis (page Livre d'or et « Ce qu'ils en disent » de
  // l'accueil) : elles tombent doucement en place quand elles apparaissent,
  // et un texte de plus de 6 lignes reçoit « Lire la suite ».
  const sheetLists = document.querySelectorAll("[data-sheets]");
  const allSheets = () => document.querySelectorAll("[data-sheets] .sheet");
  const revealSheet = (sheet) => sheet.classList.add("is-in");
  const sheetObserver =
    !reducedMotion && "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            // Les feuilles qui apparaissent ensemble tombent l'une après
            // l'autre (délai selon leur rang dans ce groupe, pas dans la
            // rangée : on les découvre au fil du carrousel).
            entries
              .filter((entry) => entry.isIntersecting)
              .forEach((entry, rank) => {
                entry.target.style.setProperty("--i", rank);
                revealSheet(entry.target);
                sheetObserver.unobserve(entry.target);
              });
          },
          { threshold: 0.25 },
        )
      : null;

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

  if (sheetObserver) sheetLists.forEach((list) => list.classList.add("sheets--js"));
  allSheets().forEach((sheet) => {
    if (sheetObserver) sheetObserver.observe(sheet);
    else revealSheet(sheet);
  });
  // Mesure une fois l'écriture manuscrite chargée (elle change la hauteur).
  const clampAll = () => allSheets().forEach(clampSheet);
  if (document.fonts?.ready) document.fonts.ready.then(clampAll);
  else clampAll();

  // Carrousels d'avis ([data-carousel] : « Ce qu'ils en disent » sur
  // l'accueil, feuilles du livre d'or). La rangée défile horizontalement
  // (au doigt sur mobile) ; les flèches ‹ › avancent d'un écran d'avis.
  // Elles sont masquées quand tous les avis tiennent à l'écran.
  document.querySelectorAll("[data-carousel]").forEach((track, index) => {
    if (!track.id) track.id = `carousel-${index + 1}`;
    const nav = document.createElement("div");
    nav.className = "carousel-nav";
    nav.innerHTML = `
      <button type="button" class="carousel-nav__button" data-dir="-1"
        aria-controls="${track.id}" aria-label="Avis précédents">
        <span aria-hidden="true">‹</span>
      </button>
      <button type="button" class="carousel-nav__button" data-dir="1"
        aria-controls="${track.id}" aria-label="Avis suivants">
        <span aria-hidden="true">›</span>
      </button>`;
    track.after(nav);
    const [prev, next] = nav.querySelectorAll("button");

    // Pas d'un avis (largeur + écart), multiplié par le nombre d'avis
    // entièrement visibles.
    const step = () => {
      const items = track.children;
      if (items.length < 2) return track.clientWidth;
      const one = items[1].offsetLeft - items[0].offsetLeft;
      return Math.max(1, Math.floor(track.clientWidth / one)) * one;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      // Tolérance de quelques pixels : le calage (scroll-snap) et le
      // rembourrage de la rangée laissent un petit décalage aux bouts.
      nav.hidden = max <= 8;
      prev.disabled = track.scrollLeft <= 8;
      next.disabled = track.scrollLeft >= max - 8;
    };

    nav.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      track.scrollBy({
        left: Number(button.dataset.dir) * step(),
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
    track.addEventListener("scroll", update, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(track);
    else window.addEventListener("resize", update);
    document.fonts?.ready.then(update);
    update();
  });

  // Le calendrier de la page Calendrier est géré par calendrier.js.
});
