document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#site-menu");

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menu?.classList.toggle("is-open", !isOpen);
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
  const calendarStatus = document.querySelector("[data-calendar-status]");
  const calendarDetail = document.querySelector("[data-calendar-detail]");
  const previousMonth = document.querySelector("[data-calendar-prev]");
  const nextMonth = document.querySelector("[data-calendar-next]");

  if (calendar && calendarTitle && calendarStatus && calendarDetail) {
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
          ${event.location} · ${event.audience}</p>
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
      const visibleEvents = events.filter((event) => {
        const eventDate = parseDate(event.start);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
      });
      calendarStatus.textContent = visibleEvents.length
        ? `${visibleEvents.length} événement${visibleEvents.length > 1 ? "s" : ""} ce mois-ci. Sélectionnez une date pour afficher le détail.`
        : "Aucun événement prévu ce mois-ci.";
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
