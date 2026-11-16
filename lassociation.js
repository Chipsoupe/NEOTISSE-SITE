/*
 * Page L'équipe (/lassociation/).
 *
 * Toutes les données viennent de deux blocs JSON en bas de
 * lassociation/index.html : « team-members » (les fondatrices) et
 * « team-engagements » (les engagements). Pour modifier une bio ou un
 * engagement, il suffit de les compléter : rien à modifier ici.
 *
 * 1. Les fondatrices : une carte par membre, qui se retourne au survol
 *    (ou au toucher sur mobile, ou au focus clavier). Recto : photo, nom,
 *    rôle ; verso : parcours.
 * 2. Nos engagements : un métier à tisser à pesons. Quand il arrive à
 *    l'écran, l'ensouple se pose puis les pesons tombent un à un. Un clic
 *    (ou les flèches du clavier) sur un peson le fait osciller et affiche
 *    l'engagement.
 */
document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const readJson = (id) => {
    try {
      return JSON.parse(document.getElementById(id)?.textContent || "[]");
    } catch {
      return [];
    }
  };
  const members = readJson("team-members");
  const engagements = readJson("team-engagements");

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  // Allume un élément (classe .is-lit) quand il arrive à l'écran.
  const lightOnView = (target, threshold = 0.3) => {
    const light = () => target.classList.add("is-lit");
    // Les éléments ne sont masqués (CSS) qu'une fois le script prêt.
    target.classList.add("light-ready");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      light();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          light();
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(target);
  };

  /* ---------- 1. Les fondatrices : cartes qui se retournent ---------- */

  const teamGrid = document.querySelector("[data-team-grid]");
  if (teamGrid && members.length) {
    members.forEach((member, index) => {
      const card = el("article", "flip-card");
      card.style.setProperty("--i", index);
      // Focusable : au clavier, la carte se retourne au focus (CSS).
      card.tabIndex = 0;
      const inner = el("div", "flip-card__inner");

      // Recto
      const front = el("div", "flip-card__face flip-card__front");
      const photo = el("div", "flip-card__photo");
      if (member.photo) {
        const img = el("img");
        img.src = member.photo;
        img.alt = member.alt || "";
        img.loading = "lazy";
        if (member.focus) img.style.objectPosition = member.focus;
        photo.append(img);
      }
      const caption = el("div", "flip-card__caption");
      caption.append(
        el("h3", "flip-card__name", member.name),
        el("p", "flip-card__role", member.role),
      );
      const hint = el(
        "p",
        "flip-card__hint",
        canHover ? "Survolez pour lire son parcours" : "Touchez pour lire son parcours",
      );
      hint.setAttribute("aria-hidden", "true");
      caption.append(hint);
      front.append(photo, caption);

      // Verso : le parcours, en texte simple.
      const back = el("div", "flip-card__face flip-card__back");
      back.append(el("h3", "flip-card__name", member.name));
      (member.bio || []).forEach((text) => back.append(el("p", "flip-card__bio", text)));

      inner.append(front, back);
      card.append(inner);
      teamGrid.append(card);

      // Écrans tactiles : un toucher retourne la carte (le survol fait le
      // reste sur ordinateur, en CSS).
      if (!canHover) {
        card.addEventListener("click", () => card.classList.toggle("is-flipped"));
      }
    });
    lightOnView(teamGrid, 0.2);
  }

  /* ---------- 2. Nos engagements : le métier à pesons ---------- */

  const loom = document.querySelector("[data-loom]");
  const weightsBox = loom?.querySelector("[data-loom-weights]");
  const detail = document.querySelector("[data-loom-detail]");

  if (loom && weightsBox && detail && engagements.length) {
    // Longueurs de fil variées, comme sur un vrai métier.
    const lengths = [86, 116, 98, 74, 104, 90];
    const panelId = "loom-panel";
    detail.id = panelId;

    const weights = engagements.map((item, index) => {
      const button = el("button", "loom-weight");
      button.type = "button";
      button.id = `loom-step-${index + 1}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panelId);
      button.style.setProperty("--i", index);
      button.style.setProperty("--len", `${lengths[index % lengths.length]}px`);

      // Deux enveloppes : l'une pour la chute à l'apparition, l'autre pour
      // l'oscillation au clic (les deux animations ne s'écrasent pas).
      const pendulum = el("span", "loom-weight__pendulum");
      pendulum.setAttribute("aria-hidden", "true");
      const swinger = el("span", "loom-weight__swing");
      swinger.append(el("span", "loom-weight__thread"), el("span", "loom-weight__stone"));
      pendulum.append(swinger);
      button.append(pendulum, el("span", "loom-weight__label", item.label));
      weightsBox.append(button);
      return { button, swinger, item };
    });

    // Le peson choisi oscille (l'animation est relancée à chaque clic).
    const swing = (swinger) => {
      if (reducedMotion) return;
      swinger.classList.remove("is-swinging");
      void swinger.offsetWidth;
      swinger.classList.add("is-swinging");
    };
    weights.forEach(({ swinger }) =>
      swinger.addEventListener("animationend", () => swinger.classList.remove("is-swinging")),
    );

    const showItem = ({ item }, index, animate) => {
      detail.replaceChildren();
      detail.setAttribute("aria-labelledby", `loom-step-${index + 1}`);
      if (item.image) {
        const media = el("div", "loom-detail__media");
        const img = el("img");
        img.src = item.image;
        img.alt = "";
        media.append(img);
        detail.append(media);
      }
      const body = el("div", "loom-detail__body");
      body.append(el("h3", null, item.title));
      if (item.text) body.append(el("p", "loom-detail__text", item.text));
      detail.append(body);
      detail.classList.toggle("has-media", Boolean(item.image));
      // Fondu à chaque changement d'engagement.
      detail.classList.remove("is-changing");
      if (animate && !reducedMotion) {
        void detail.offsetWidth;
        detail.classList.add("is-changing");
      }
    };

    const select = (index, { focus = false, animate = true } = {}) => {
      weights.forEach((weight, i) => {
        const active = i === index;
        weight.button.classList.toggle("is-selected", active);
        weight.button.setAttribute("aria-selected", String(active));
        weight.button.tabIndex = active ? 0 : -1;
      });
      const weight = weights[index];
      showItem(weight, index, animate);
      if (!animate) return;
      swing(weight.swinger);
      if (focus) weight.button.focus();
      // Sur mobile (métier défilant), on garde le peson choisi visible
      // (défilement horizontal du métier seul, sans faire bouger la page).
      if (loom.scrollWidth > loom.clientWidth) {
        const b = weight.button;
        loom.scrollTo({
          left: b.offsetLeft + b.offsetWidth / 2 - loom.clientWidth / 2,
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }
    };

    weights.forEach((weight, index) => {
      weight.button.addEventListener("click", () => select(index));
      weight.button.addEventListener("keydown", (event) => {
        const last = weights.length - 1;
        const target = {
          ArrowRight: Math.min(index + 1, last),
          ArrowLeft: Math.max(index - 1, 0),
          Home: 0,
          End: last,
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(target, { focus: true });
      });
    });

    select(0, { animate: false });
    lightOnView(loom, 0.35);
  }
});
