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

  const calendar = document.querySelector("[data-calendar-days]");
  const calendarTitle = document.querySelector("#calendar-title");
  const calendarDetail = document.querySelector("[data-calendar-detail]");
  const previousMonth = document.querySelector("[data-calendar-prev]");
  const nextMonth = document.querySelector("[data-calendar-next]");

  if (calendar && calendarTitle && calendarDetail) {
    const events = [
      {
        start: "2027-10-09",
        end: "2027-10-10",
        title: "Festival d’Archéologie Expérimentale d’Occitanie",
        location: "Musée de l’Aurignacien",
        audience: "Tout public",
        url: "/actualites/",
      },
    ];
    const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    });
    const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    let displayedMonth = new Date(2027, 9, 1);

    const parseDate = (date) => {
      const [year, month, day] = date.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const getDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const getEventForDay = (date) =>
      events.find((event) => {
        const day = getDateKey(date);
        return day >= event.start && day <= event.end;
      });

    const formatEventDates = (event) => {
      const start = parseDate(event.start);
      const end = parseDate(event.end);
      if (event.start === event.end) return dateFormatter.format(start);
      return `${dateFormatter.format(start)} au ${dateFormatter.format(end)}`;
    };

    const showEvent = (event) => {
      if (!event) {
        calendarDetail.hidden = true;
        calendarDetail.innerHTML = "";
        return;
      }
      calendarDetail.hidden = false;
      calendarDetail.innerHTML = `
        <p class="eyebrow">Événement sélectionné</p>
        <h3>${event.title}</h3>
        <p><strong>${formatEventDates(event)}</strong><br>
          ${event.location}, ${event.audience}</p>
        <a href="${event.url}">En savoir plus <span aria-hidden="true">↗</span></a>
      `;
    };

    const renderCalendar = () => {
      const year = displayedMonth.getFullYear();
      const month = displayedMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
      const cells = [];

      calendarTitle.textContent = monthFormatter.format(displayedMonth);
      for (let index = 0; index < 42; index += 1) {
        const dayNumber = index - mondayFirstOffset + 1;
        const date = new Date(year, month, dayNumber);
        const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
        const event = isCurrentMonth ? getEventForDay(date) : undefined;
        const dateLabel = dateFormatter.format(date);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", dateLabel);
        cell.disabled = !isCurrentMonth;
        if (!isCurrentMonth) cell.classList.add("is-outside");
        if (event) {
          cell.classList.add("has-event");
          cell.dataset.eventDate = event.start;
          cell.setAttribute("aria-label", `${dateLabel}, ${event.title}`);
        }
        cell.innerHTML = `<span>${date.getDate()}</span>${event ? '<i aria-hidden="true"></i>' : ""}`;
        cell.addEventListener("click", () => {
          calendar.querySelectorAll(".calendar-day.is-selected").forEach((day) => {
            day.classList.remove("is-selected");
          });
          cell.classList.add("is-selected");
          showEvent(event);
        });
        cells.push(cell);
      }
      calendar.replaceChildren(...cells);
      showEvent(undefined);
    };

    previousMonth?.addEventListener("click", () => {
      displayedMonth = new Date(
        displayedMonth.getFullYear(),
        displayedMonth.getMonth() - 1,
        1,
      );
      renderCalendar();
    });
    nextMonth?.addEventListener("click", () => {
      displayedMonth = new Date(
        displayedMonth.getFullYear(),
        displayedMonth.getMonth() + 1,
        1,
      );
      renderCalendar();
    });
    renderCalendar();
  }
});
