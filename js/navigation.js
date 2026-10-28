(() => {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector("#siteNavigation");
  if (!navToggle || !siteNav) return;
  const setNavOpen = open => {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    navToggle.innerHTML = `<i class="fa-solid ${open ? "fa-xmark" : "fa-bars"}" aria-hidden="true"></i>`;
    siteNav.classList.toggle("is-open", open);
  };
  navToggle.addEventListener("click", () => setNavOpen(navToggle.getAttribute("aria-expanded") !== "true"));
  siteNav.addEventListener("click", event => { if (event.target.closest("a")) setNavOpen(false); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") setNavOpen(false); });
  document.addEventListener("click", event => { if (!event.target.closest(".site-header")) setNavOpen(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 860) setNavOpen(false); });
})();
