(() => {
function initializeMenu() {
  const products = window.FOODMANIA_PRODUCTS || [];
  const categories = ["Burgers", "Sandwiches", "Pizza", "Sides & Snacks", "Pasta & Rice Bowls", "Dips & Sauces", "Beverages", "Desserts", "Deals & Combos"];
  const BUDGET = 700;
  const nav = document.querySelector("#categoryNav");
  const content = document.querySelector("#menuContent");
  const search = document.querySelector("#menuSearch");
  const filterBar = document.querySelector("#menuFilters");
  if (!nav || !content || !window.FoodMania) return;

  if (search && products.length) {
    const basePlaceholder = "Search for ";
    const menuNames = [...new Set(products.filter(item => item.category !== "Deals & Combos").map(item => item.name).filter(Boolean))];
    let animationTimer;
    let animationIndex = 0;
    let animationText = basePlaceholder;
    let deleting = false;
    const stopSearchAnimation = () => window.clearTimeout(animationTimer);
    const animateSearchPlaceholder = () => {
      if (document.activeElement === search || search.value) {
        animationTimer = window.setTimeout(animateSearchPlaceholder, 350);
        return;
      }
      if (!menuNames.length) return;
      const target = basePlaceholder + menuNames[animationIndex];
      if (!deleting) {
        animationText = target.slice(0, animationText.length + 1);
        if (animationText === target) {
          deleting = true;
          animationTimer = window.setTimeout(animateSearchPlaceholder, 1400);
          search.placeholder = animationText;
          return;
        }
      } else {
        animationText = animationText.slice(0, -1);
        if (animationText.length <= basePlaceholder.length) {
          animationText = basePlaceholder;
          deleting = false;
          animationIndex = (animationIndex + 1 + Math.floor(Math.random() * Math.min(3, menuNames.length))) % menuNames.length;
        }
      }
      search.placeholder = animationText;
      animationTimer = window.setTimeout(animateSearchPlaceholder, deleting ? 38 : 68);
    };
    search.placeholder = basePlaceholder;
    animationTimer = window.setTimeout(animateSearchPlaceholder, 450);
    search.addEventListener("focus", () => { stopSearchAnimation(); search.placeholder = basePlaceholder; });
    search.addEventListener("blur", () => {
      if (!search.value) {
        animationText = basePlaceholder;
        deleting = false;
        animationTimer = window.setTimeout(animateSearchPlaceholder, 300);
      }
    });
    search.addEventListener("input", () => {
      if (search.value) { stopSearchAnimation(); }
      else if (document.activeElement !== search) animationTimer = window.setTimeout(animateSearchPlaceholder, 300);
    });
  }

  if (window.FOODMANIA_LOAD_FAILED || !products.length) {
    nav.hidden = true;
    content.innerHTML = `<div class="load-error"><i class="fa-solid fa-triangle-exclamation"></i><div><h3>The menu couldn't load</h3><p>Please refresh the page. If it keeps happening, message us on WhatsApp and we'll take your order directly.</p></div></div>`;
    return;
  }

  const slug = category => category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  nav.innerHTML = categories.map((category, index) => `<a class="category-pill ${index === 0 ? "is-active" : ""}" href="#${slug(category)}">${category}<span>${String(products.filter(item => item.category === category).length).padStart(2,"0")}</span></a>`).join("");

  const filters = { veg: false, spicy: false, budget: false };
  const matchesFilters = item => (!filters.veg || item.veg) && (!filters.spicy || item.spicy) && (!filters.budget || item.price < BUDGET);
  const anyFilter = () => Object.values(filters).some(Boolean);

  function renderMenu(query = "") {
    const normalized = query.trim().toLowerCase();
    const matching = products.filter(item => matchesFilters(item) && `${item.name} ${item.category} ${item.description} ${item.tag || ""}`.toLowerCase().includes(normalized));
    content.innerHTML = categories.map((category, index) => {
      const items = matching.filter(item => item.category === category);
      if (!items.length) return "";
      return `<section class="menu-category-section" id="${slug(category)}"><div class="menu-category-heading"><div><span class="category-index">${String(index + 1).padStart(2,"0")}</span><h2>${category}</h2></div><span>${items.length} ${items.length === 1 ? "item" : "items"}</span></div><div class="menu-product-grid">${items.map(item => window.FoodMania.productCard(item, "menu-product-card")).join("")}</div></section>`;
    }).join("");
    if (!matching.length) content.innerHTML = `<div class="no-results"><i class="fa-solid fa-magnifying-glass"></i><h2>No dishes match.</h2><p>Try a different word, or remove a filter.</p>${anyFilter() || normalized ? `<button class="button button-primary" type="button" id="resetMenuFilters">Show the full menu</button>` : ""}</div>`;
    observeSections();
  }
  let observer;
  function observeSections() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          nav.querySelectorAll(".category-pill").forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: "-25% 0px -60% 0px" });
    content.querySelectorAll(".menu-category-section").forEach(section => observer.observe(section));
  }
  nav.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      nav.querySelectorAll(".category-pill").forEach(item => item.classList.toggle("is-active", item === link));
      history.replaceState(null, "", link.getAttribute("href"));
    }
  });
  search.addEventListener("input", () => renderMenu(search.value));
  filterBar?.addEventListener("click", event => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    filters[chip.dataset.filter] = !filters[chip.dataset.filter];
    chip.setAttribute("aria-pressed", String(filters[chip.dataset.filter]));
    chip.classList.toggle("is-on", filters[chip.dataset.filter]);
    renderMenu(search.value);
  });
  content.addEventListener("click", event => {
    if (!event.target.closest("#resetMenuFilters")) return;
    Object.keys(filters).forEach(key => { filters[key] = false; });
    filterBar?.querySelectorAll("[data-filter]").forEach(chip => { chip.setAttribute("aria-pressed", "false"); chip.classList.remove("is-on"); });
    search.value = "";
    renderMenu();
  });
  renderMenu();

  const modal = document.getElementById("productDetailsModal");
  const modalArt = document.getElementById("productModalArt");
  const modalCategory = document.getElementById("productModalCategory");
  const modalTitle = document.getElementById("productModalTitle");
  const modalDescription = document.getElementById("productModalDescription");
  const modalPrice = document.getElementById("productModalPrice");
  const modalAdd = document.getElementById("productModalAdd");
  const pairing = document.getElementById("productModalPairing");
  const pairs = document.getElementById("productModalPairs");
  let activeProduct = null;
  let modalOpener = null;
  const escapeText = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const pairWith = {
    "Burgers": ["Sides & Snacks", "Beverages", "Dips & Sauces"],
    "Sandwiches": ["Sides & Snacks", "Beverages", "Dips & Sauces"],
    "Pizza": ["Sides & Snacks", "Beverages", "Desserts"],
    "Pasta & Rice Bowls": ["Beverages", "Sides & Snacks", "Desserts"],
    "Sides & Snacks": ["Dips & Sauces", "Beverages"],
    "Dips & Sauces": ["Sides & Snacks", "Beverages"],
    "Beverages": ["Sides & Snacks", "Desserts"],
    "Desserts": ["Beverages"],
    "Deals & Combos": ["Dips & Sauces", "Desserts"]
  };
  const pairingFor = item => (pairWith[item.category] || []).map(category => {
    return products.filter(other => other.category === category && other.id !== item.id)
      .sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0) || (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0))[0];
  }).filter(Boolean);

  const closeProductModal = () => {
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("product-modal-open");
    history.replaceState(null, "", location.pathname + location.hash);
    if (modalOpener && typeof modalOpener.focus === "function") modalOpener.focus();
  };
  const openProductModal = id => {
    const item = products.find(product => product.id === id);
    if (!item || !modal) return;
    activeProduct = item;
    modalOpener = document.activeElement;
    modalCategory.textContent = item.category;
    modalTitle.textContent = item.name;
    modalDescription.textContent = item.description;
    modalPrice.textContent = window.FoodMania.money(item.price);
    modalArt.innerHTML = item.image ? `<img src="${escapeText(item.image)}" alt="${escapeText(item.name)}">` : `<div class="product-modal-placeholder"><i class="fa-solid fa-utensils"></i></div>`;
    const suggestions = pairingFor(item);
    pairing.hidden = !suggestions.length;
    pairs.innerHTML = suggestions.map(other => `<div class="pairing-item"><div class="pairing-thumb">${other.image ? `<img src="${escapeText(other.image)}" alt="" loading="lazy">` : `<i class="fa-solid fa-utensils"></i>`}</div><div class="pairing-info"><strong>${escapeText(other.name)}</strong><span>${window.FoodMania.money(other.price)}</span></div><button class="add-button" type="button" data-add="${escapeText(other.id)}" aria-label="Add ${escapeText(other.name)} to cart"><i class="fa-solid fa-plus"></i></button></div>`).join("");
    modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("product-modal-open");
    history.replaceState(null, "", `?product=${encodeURIComponent(item.id)}`);
    modal.querySelector("[data-close-product-modal]")?.focus();
  };
  content.addEventListener("click", event => {
    if (event.target.closest("[data-add]")) return;
    const trigger = event.target.closest("[data-view-details], [data-product-details]");
    if (trigger) openProductModal(trigger.dataset.viewDetails || trigger.dataset.productDetails);
  });
  modal?.addEventListener("click", event => { if (event.target.closest("[data-close-product-modal]")) closeProductModal(); });
  document.addEventListener("keydown", event => {
    if (!modal?.classList.contains("is-open")) return;
    if (event.key === "Escape") closeProductModal();
    else window.FoodMania.trapFocus(modal, event);
  });
  modalAdd?.addEventListener("click", () => { if (activeProduct) window.FoodMania.addToCart(activeProduct.id); });
  if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  const requestedProduct = new URLSearchParams(location.search).get("product");
  if (requestedProduct) setTimeout(() => openProductModal(requestedProduct), 420);
}
if (window.FOODMANIA_PRODUCTS) initializeMenu();
else window.addEventListener("foodmania:products-ready", initializeMenu, { once: true });
})();
