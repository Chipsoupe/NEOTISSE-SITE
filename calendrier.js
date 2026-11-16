/*
 * Page Calendrier.
 *
 * Toutes les données viennent du bloc JSON « calendar-events » en bas de
 * calendrier/index.html. Pour ajouter un événement, il suffit de le
 * compléter : rien à modifier ici.
 *
 * 1. Prochain rendez-vous : le premier événement à venir, avec le nombre
 *    de jours restants et un lien vers le site de la structure d'accueil.
 * 2. Calendrier : changement de mois animé, jours d'événement en couleur, aperçu au survol, jour d'aujourd'hui repéré, bouton
 *    « Prochain événement ».
 */
document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const readJson = (id) => {
    try {
      return JSON.parse(document.getElementById(id)?.textContent || "[]");
    } catch {
      return [];
    }
  };
  const events = readJson("calendar-events").sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  /* ---------- Dates ---------- */

  const parseDate = (value) => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const todayKey = dateKey(new Date());
  const longDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const monthTitle = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const eventDates = (event) =>
    event.start === event.end
      ? longDate.format(parseDate(event.start))
      : `${longDate.format(parseDate(event.start))} au ${longDate.format(parseDate(event.end))}`;

  // Prochain événement : le premier qui n'est pas encore terminé.
  const nextEvent = events.find((event) => event.end >= todayKey);

  /* ---------- 1. Prochain rendez-vous ---------- */

  const spotlight = document.querySelector("[data-next-event]");
  if (spotlight && nextEvent) {
    const start = parseDate(nextEvent.start);
    const end = parseDate(nextEvent.end);
    const q = (sel) => spotlight.querySelector(sel);

    // Ex. « 9 et 10 octobre 2027 », « du 9 au 12 octobre 2027 »,
    // « du 30 octobre au 2 novembre 2027 ».
    q("[data-next-date]").textContent = (() => {
      const day = (date) => (date.getDate() === 1 ? "1er" : String(date.getDate()));
      const month = (date) => date.toLocaleDateString("fr-FR", { month: "long" });
      const year = (date) => date.getFullYear();
      if (nextEvent.start === nextEvent.end) {
        return `${day(start)} ${month(start)} ${year(start)}`;
      }
      if (year(start) !== year(end)) {
        return `Du ${day(start)} ${month(start)} ${year(start)} au ${day(end)} ${month(end)} ${year(end)}`;
      }
      if (start.getMonth() !== end.getMonth()) {
        return `Du ${day(start)} ${month(start)} au ${day(end)} ${month(end)} ${year(end)}`;
      }
      const joiner = end.getDate() - start.getDate() === 1 ? "et" : "au";
      return `${joiner === "au" ? "Du " : ""}${day(start)} ${joiner} ${day(end)} ${month(end)} ${year(end)}`;
    })();
    q("[data-next-title]").textContent = nextEvent.title;
    const fill = (sel, text) => {
      const node = q(sel);
      if (text) node.textContent = text;
      else node.remove();
    };
    fill("[data-next-place]", nextEvent.location);
    fill("[data-next-audience]", nextEvent.audience);

    const image = q("[data-next-image]");
    if (nextEvent.image) {
      image.src = nextEvent.image;
      image.alt = "";
    } else {
      q(".next-event__media")?.remove();
    }

    // « En savoir plus » : site de la structure qui accueille l'événement
    // (champ « site »), ouvert dans un nouvel onglet.
    const moreLink = q("[data-next-more]");
    if (nextEvent.site) moreLink.href = nextEvent.site;
    else moreLink.remove();

    // Délai avant l'événement, en jours (« Dans 326 jours », « Demain »…).
    const countdown = q("[data-countdown]");
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysLeft = Math.round((start - midnight) / 86400000);
    countdown.textContent =
      daysLeft > 1
        ? `Dans ${daysLeft} jours`
        : daysLeft === 1
          ? "Demain"
          : "En ce moment";

    spotlight.hidden = false;
  }

  /* ---------- 2. Calendrier ---------- */

  const grid = document.querySelector("[data-calendar-days]");
  const title = document.querySelector("#calendar-title");
  const detail = document.querySelector("[data-calendar-detail]");
  const preview = document.querySelector("[data-calendar-preview]");
  const card = grid?.closest(".calendar-card");

  if (grid && title && detail) {
    const eventOn = (date) => {
      const key = dateKey(date);
      return events.find((event) => key >= event.start && key <= event.end);
    };

    // Détail de l'événement sélectionné (construit en texte brut).
    const showDetail = (event) => {
      detail.replaceChildren();
      if (!event) {
        detail.hidden = true;
        return;
      }
      const h3 = document.createElement("h3");
      h3.textContent = event.title;
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = eventDates(event);
      p.append(strong, document.createElement("br"),
        [event.location, event.audience].filter(Boolean).join(" · "));
      detail.append(h3, p);
      if (event.url) {
        const a = document.createElement("a");
        a.href = event.url;
        a.innerHTML = 'En savoir plus <span aria-hidden="true">→</span>';
        detail.append(a);
      }
      detail.hidden = false;
    };

    // Aperçu au survol d'un jour d'événement.
    const showPreview = (event, cell) => {
      if (!preview || !card) return;
      preview.replaceChildren();
      if (event.image) {
        const img = document.createElement("img");
        img.src = event.image;
        img.alt = "";
        preview.append(img);
      }
      const t = document.createElement("strong");
      t.textContent = event.title;
      const d = document.createElement("span");
      d.textContent = eventDates(event);
      preview.append(t, d);
      preview.hidden = false;
      const c = card.getBoundingClientRect();
      const r = cell.getBoundingClientRect();
      const left = Math.min(
        Math.max(12, r.left - c.left + r.width / 2 - 130),
        c.width - 272,
      );
      preview.style.left = `${left}px`;
      preview.style.top = `${r.bottom - c.top + 10}px`;
    };
    const hidePreview = () => {
      if (preview) preview.hidden = true;
    };

    let shown = nextEvent ? parseDate(nextEvent.start) : new Date();
    shown = new Date(shown.getFullYear(), shown.getMonth(), 1);

    const render = (direction = 0, selectKey = null) => {
      const year = shown.getFullYear();
      const month = shown.getMonth();
      const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi d'abord
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      title.textContent = monthTitle.format(shown);
      const cells = [];

      for (let i = 0; i < 42; i++) {
        const n = i - offset + 1;
        const date = new Date(year, month, n);
        const inMonth = n > 0 && n <= daysInMonth;
        const event = inMonth ? eventOn(date) : undefined;
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";
        cell.setAttribute("role", "gridcell");
        cell.style.setProperty("--i", i);
        cell.disabled = !inMonth;
        let label = longDate.format(date);
        if (!inMonth) cell.classList.add("is-outside");
        if (inMonth && dateKey(date) === todayKey) {
          cell.classList.add("is-today");
          label += ", aujourd’hui";
        }
        const num = document.createElement("span");
        num.textContent = date.getDate();
        cell.append(num);
        if (event) {
          cell.classList.add("has-event");
          label += `, ${event.title}`;
          cell.addEventListener("mouseenter", () => showPreview(event, cell));
          cell.addEventListener("focus", () => showPreview(event, cell));
          cell.addEventListener("mouseleave", hidePreview);
          cell.addEventListener("blur", hidePreview);
        }
        cell.setAttribute("aria-label", label);
        cell.addEventListener("click", () => {
          grid.querySelectorAll(".is-selected").forEach((d) => d.classList.remove("is-selected"));
          cell.classList.add("is-selected");
          hidePreview();
          showDetail(event);
        });
        if (selectKey && inMonth && dateKey(date) === selectKey) {
          cell.classList.add("is-selected");
          showDetail(event);
        }
        cells.push(cell);
      }

      grid.replaceChildren(...cells);
      if (!selectKey) showDetail(undefined);
      hidePreview();

      // Animation : le mois glisse dans le sens de la navigation.
      if (!reducedMotion && direction) {
        grid.classList.remove("is-next", "is-prev");
        void grid.offsetWidth; // relance l'animation
        grid.classList.add(direction > 0 ? "is-next" : "is-prev");
      }
    };

    const go = (delta) => {
      shown = new Date(shown.getFullYear(), shown.getMonth() + delta, 1);
      render(delta);
    };
    document.querySelector("[data-calendar-prev]")?.addEventListener("click", () => go(-1));
    document.querySelector("[data-calendar-next]")?.addEventListener("click", () => go(1));

    const gotoButton = document.querySelector("[data-calendar-goto]");
    if (nextEvent && gotoButton) {
      gotoButton.addEventListener("click", () => {
        const target = parseDate(nextEvent.start);
        const before = shown;
        shown = new Date(target.getFullYear(), target.getMonth(), 1);
        render(Math.sign(shown - before) || 1, nextEvent.start);
      });
    } else {
      gotoButton?.remove();
    }

    render(0, nextEvent ? nextEvent.start : null);
  }
});
