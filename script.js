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
});
