(() => {
function initializeApp() {
  const site = window.FOODMANIA_SITE || {};
  const business = site.business || {};
  const delivery = site.delivery || {};
  const payments = site.payments || {};
  const WHATSAPP_NUMBER = business.whatsapp || "923152136621";
  const CART_KEY = "foodmaniaCart";
  const CUSTOMER_KEY = "foodmaniaCustomer";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => `Rs. ${Number(value).toLocaleString("en-PK")}`;
  const products = window.FOODMANIA_PRODUCTS || [];
  const cartOverlay = $("#cartOverlay");
  let lastFocus = null;

  const lookup = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  $$("[data-site]").forEach(node => {
    const value = lookup(site, node.dataset.site);
    if (value === undefined || value === "") return;
    node.textContent = Array.isArray(value) ? value.join(", ") : typeof value === "number" ? money(value) : value;
  });
  const deliveryText = delivery.fee
    ? `${money(delivery.fee)} delivery${delivery.freeOver ? `, free over ${money(delivery.freeOver)}` : ""}`
    : "Free delivery";
  $$("[data-delivery-text]").forEach(node => { node.textContent = deliveryText; });
  $$("[data-whatsapp-link]").forEach(link => {
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi FoodMania! I have a question.")}`;
    link.target = "_blank"; link.rel = "noopener";
  });
  $$("[data-tel-link]").forEach(link => { link.href = `tel:+${WHATSAPP_NUMBER}`; });
  const socialHost = $("#footerSocial");
  if (socialHost) {
    const icons = { instagram: "fa-instagram", facebook: "fa-facebook-f", tiktok: "fa-tiktok" };
    const links = Object.entries(site.social || {}).filter(([, url]) => url);
    socialHost.innerHTML = links.map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="FoodMania on ${name}"><i class="fa-brands ${icons[name] || "fa-link"}"></i></a>`).join("");
    socialHost.hidden = !links.length;
  }

  function getCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.filter(row => row && typeof row.id === "string" && products.some(product => product.id === row.id) && Number.isInteger(row.quantity) && row.quantity > 0 && row.quantity <= 99);
    } catch { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
    catch { showToast("Your browser could not save the cart. Check storage settings."); }
    renderCart();
  }
  function addToCart(id) {
    const item = products.find(product => product.id === id);
    if (!item) return;
    const cart = getCart();
    const existing = cart.find(row => row.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ id, quantity: 1 });
    saveCart(cart);
    showToast(`${item.name} added to your cart`);
  }
  function updateQuantity(id, amount) {
    const cart = getCart();
    const row = cart.find(item => item.id === id);
    if (!row) return;
    row.quantity += amount;
    saveCart(cart.filter(item => item.quantity > 0));
  }
  function totals(cart = getCart()) {
    const subtotal = cart.reduce((sum, row) => {
      const item = products.find(product => product.id === row.id);
      return sum + (item ? item.price * row.quantity : 0);
    }, 0);
    const fee = subtotal === 0 ? 0 : (delivery.freeOver && subtotal >= delivery.freeOver ? 0 : (delivery.fee || 0));
    return { subtotal, fee, total: subtotal + fee };
  }
  function shapeIcon(shape) {
    const icons = { burger:"fa-burger", pizza:"fa-pizza-slice", sandwich:"fa-bread-slice", wrap:"fa-burrito", fries:"fa-utensils", nuggets:"fa-drumstick-bite", snack:"fa-cheese", pasta:"fa-bowl-food", bowl:"fa-bowl-rice", dip:"fa-bowl-food", drink:"fa-glass-water", dessert:"fa-ice-cream", combo:"fa-box-open" };
    return `<i class="fa-solid ${icons[shape] || "fa-utensils"}"></i>`;
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char]));
  }

  
  // Puts the customer's saved details (if any) back into the checkout form.
  function fillCustomerFields(form) {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}");
      ["name", "phone", "address", "notes"].forEach(field => { if (saved[field]) form.elements[field].value = saved[field]; });
      if (saved.payment) { const radio = form.querySelector(`[name="payment"][value="${saved.payment}"]`); if (radio) radio.checked = true; }
    } catch (_) {}
  }

  function buildCheckout() {
    const host = $("#cartSummary");
    if (!host) return;
    host.innerHTML = `
      <form id="checkoutForm" novalidate>
        <div class="checkout-totals">
          <div><span>Subtotal</span><strong id="cartSubtotal">Rs. 0</strong></div>
          <div><span>Delivery</span><strong id="cartDelivery">Rs. 0</strong></div>
          <div class="checkout-total"><span>Total</span><strong id="cartTotal">Rs. 0</strong></div>
        </div>
        <p class="checkout-note" id="cartNote"></p>
        <fieldset class="checkout-fields">
          <legend>Delivery details</legend>
          <label>Name<input name="name" autocomplete="name" maxlength="60"></label>
          <label>Phone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XX XXXXXXX" maxlength="20"></label>
          <label>Address<textarea name="address" rows="2" autocomplete="street-address" placeholder="House, street, area" maxlength="200"></textarea></label>
          <label>Notes <small>(optional)</small><input name="notes" placeholder="Less spicy, extra napkins…" maxlength="160"></label>
        </fieldset>
        <fieldset class="checkout-pay">
          <legend>Payment</legend>
          <label class="pay-option"><input type="radio" name="payment" value="cod" checked><span>${escapeHTML(payments.cod || "Cash on delivery")}</span></label>
          <label class="pay-option"><input type="radio" name="payment" value="transfer"><span>${escapeHTML(payments.transfer || "Bank transfer")}<small>We’ll share the account details on WhatsApp.</small></span></label>
        </fieldset>
        <p class="checkout-error" id="checkoutError" role="alert"></p>
        <button class="button button-primary button-wide" id="orderWhatsApp" type="submit">Send order on WhatsApp <i class="fa-brands fa-whatsapp"></i></button>
        <button class="checkout-clear" type="button" id="clearCart">Clear cart</button>
      </form>`;
    const form = $("#checkoutForm");
    fillCustomerFields(form);
    form.addEventListener("input", () => {
      const data = Object.fromEntries(new FormData(form));
      try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data)); } catch (_) {}
      $("#checkoutError").textContent = "";
      form.querySelectorAll("[aria-invalid]").forEach(field => field.removeAttribute("aria-invalid"));
    });
    form.addEventListener("submit", event => { event.preventDefault(); orderOnWhatsApp(); });
    $("#clearCart").addEventListener("click", () => { saveCart([]); showToast("Cart cleared"); });
  }

  function renderCart() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countNode = $("#cartCount");
    if (countNode) { countNode.textContent = count; countNode.classList.toggle("has-items", count > 0); }
    const itemsNode = $("#cartItems");
    if (!itemsNode) return;
    if (!cart.length) {
      itemsNode.innerHTML = `<div class="empty-cart"><span class="empty-cart-icon"><i class="fa-solid fa-bag-shopping"></i></span><h3>Your cart is empty</h3><p>Add something delicious from the menu and it will show up here.</p><a class="text-link" href="menu.html">Explore the menu <i class="fa-solid fa-arrow-right"></i></a></div>`;
    } else {
      itemsNode.innerHTML = cart.map(row => {
        const item = products.find(product => product.id === row.id);
        if (!item) return "";
        const art = item.image ? `<img src="${escapeHTML(item.image)}" alt="" loading="lazy" decoding="async">` : `<span class="shape-emoji">${shapeIcon(item.shape)}</span>`;
        return `<article class="cart-line"><div class="cart-line-art ${item.shape}">${art}</div><div class="cart-line-info"><h3>${escapeHTML(item.name)}</h3><p>${money(item.price)}</p><div class="quantity-control"><button data-qty="-1" data-id="${item.id}" aria-label="Decrease quantity of ${escapeHTML(item.name)}">−</button><span>${row.quantity}</span><button data-qty="1" data-id="${item.id}" aria-label="Increase quantity of ${escapeHTML(item.name)}">+</button></div></div><strong class="cart-line-total">${money(item.price * row.quantity)}</strong></article>`;
      }).join("");
    }
    const form = $("#checkoutForm");
    if (!form) return;
    form.hidden = cart.length === 0;
    const { subtotal, fee, total } = totals(cart);
    $("#cartSubtotal").textContent = money(subtotal);
    $("#cartDelivery").textContent = fee === 0 && subtotal > 0 ? "Free" : money(fee);
    $("#cartTotal").textContent = money(total);
    const minOrder = delivery.minOrder || 0;
    const note = $("#cartNote");
    const belowMin = subtotal > 0 && subtotal < minOrder;
    if (belowMin) note.textContent = `Minimum order is ${money(minOrder)}. Add ${money(minOrder - subtotal)} more to continue.`;
    else if (fee > 0 && delivery.freeOver) note.textContent = `Add ${money(delivery.freeOver - subtotal)} more for free delivery.`;
    else if (subtotal > 0) note.textContent = "Delivery is free on this order.";
    else note.textContent = "";
    $("#orderWhatsApp").disabled = cart.length === 0 || belowMin;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  
  function trapFocus(container, event) {
    if (event.key !== "Tab") return;
    const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])', container).filter(node => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function openCart() {
    if (!cartOverlay) return;
    lastFocus = document.activeElement;
    cartOverlay.hidden = false;
    document.body.classList.add("cart-open");
    renderCart();
    $("#closeCart")?.focus();
  }
  function closeCart() {
    if (!cartOverlay) return;
    cartOverlay.hidden = true;
    document.body.classList.remove("cart-open");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  
  /* ---------- "Thank you" popup shown after the order is sent to WhatsApp ----------
     Built here, once, instead of being copied into every HTML page, so the home page
     and the menu page behave exactly the same. */
  function buildCheckoutNotice() {
    document.getElementById("checkoutNotice")?.remove();
    const notice = document.createElement("section");
    notice.className = "checkout-notice";
    notice.id = "checkoutNotice";
    notice.hidden = true;
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-modal", "true");
    notice.setAttribute("aria-hidden", "true");
    notice.setAttribute("aria-labelledby", "checkoutNoticeTitle");
    notice.setAttribute("aria-describedby", "checkoutNoticeDescription");
    notice.innerHTML = `
      <button class="checkout-notice-backdrop" type="button" tabindex="-1" data-close-checkout-notice aria-label="Close message"></button>
      <article class="checkout-notice-card">
        <div class="checkout-notice-badge" aria-hidden="true">
          <img src="assets/images/foodManiaMascot.webp" alt="" width="92" height="92">
          <span class="checkout-notice-wa"><i class="fa-brands fa-whatsapp"></i></span>
        </div>
        <p class="eyebrow">ONE LAST STEP</p>
        <h2 id="checkoutNoticeTitle">Thank you for your order<span id="checkoutNoticeNameWrap">, <em id="checkoutNoticeName"></em></span>.</h2>
        <p id="checkoutNoticeDescription">WhatsApp should now be open with your order ready. Press <strong>Send</strong> there so our kitchen receives it. Nothing opened? <a id="reopenWhatsApp" href="#" target="_blank" rel="noopener noreferrer">Open WhatsApp again</a>.</p>
        <div class="checkout-notice-actions">
          <button class="button button-primary" id="continueWithCart" type="button"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Continue with this cart</button>
          <button class="button button-secondary" id="backToFoodMania" type="button">Back to FoodMania <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
        </div>
        <p class="checkout-notice-hint">Back to FoodMania clears your cart and saved details.</p>
      </article>`;
    document.body.appendChild(notice);
    return notice;
  }

  const checkoutNotice = buildCheckoutNotice();
  let checkoutNoticeLastFocus = null;
  let checkoutNoticeTimer = null;
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function openCheckoutNotice(customerName, whatsappUrl) {
    clearTimeout(checkoutNoticeTimer);
    let firstName = String(customerName || "").trim().split(/\s+/)[0] || "";
    if (firstName && firstName === firstName.toLowerCase()) firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);   // "zainab" -> "Zainab"
    $("#checkoutNoticeName").textContent = firstName;      // textContent, never innerHTML: names are untrusted text
    $("#checkoutNoticeNameWrap").hidden = !firstName;
    $("#reopenWhatsApp").href = whatsappUrl;
    $("#continueWithCart").disabled = false;
    $("#backToFoodMania").disabled = false;
    checkoutNoticeLastFocus = document.activeElement;
    checkoutNotice.hidden = false;
    checkoutNotice.setAttribute("aria-hidden", "false");
    document.body.classList.add("checkout-notice-open");
    // Two animation frames so the browser paints the hidden state first; otherwise the fade-in is skipped.
    requestAnimationFrame(() => requestAnimationFrame(() => checkoutNotice.classList.add("is-visible")));
    $("#continueWithCart").focus({ preventScroll: true });
  }

  function closeCheckoutNotice({ restoreFocus = true, then } = {}) {
    if (checkoutNotice.hidden) { if (then) then(); return; }
    checkoutNotice.classList.remove("is-visible");           // starts the fade-out
    checkoutNotice.setAttribute("aria-hidden", "true");
    document.body.classList.remove("checkout-notice-open");
    clearTimeout(checkoutNoticeTimer);
    checkoutNoticeTimer = setTimeout(() => {
      checkoutNotice.hidden = true;
      if (restoreFocus && checkoutNoticeLastFocus && typeof checkoutNoticeLastFocus.focus === "function") checkoutNoticeLastFocus.focus({ preventScroll: true });
      if (then) then();
    }, prefersReducedMotion() ? 0 : 260);
  }

  // Wipes the cart, the saved customer details and every field in the cart form.
  function resetEverything() {
    try { localStorage.removeItem(CUSTOMER_KEY); } catch (_) {}
    saveCart([]);
    const form = $("#checkoutForm");
    if (form) {
      form.reset();
      form.querySelectorAll("[aria-invalid]").forEach(field => field.removeAttribute("aria-invalid"));
      const error = $("#checkoutError");
      if (error) error.textContent = "";
    }
  }

  // "Continue with this cart": just close the popup. Cart and fields stay exactly as they were.
  $("#continueWithCart").addEventListener("click", () => closeCheckoutNotice());

  // "Back to FoodMania": reset everything, then go to the main page.
  $("#backToFoodMania").addEventListener("click", () => {
    $("#continueWithCart").disabled = true;
    $("#backToFoodMania").disabled = true;
    resetEverything();
    closeCart();
    closeCheckoutNotice({ restoreFocus: false, then: () => window.location.assign("index.html") });
  });

  // Clicking outside the card closes the popup without changing anything.
  checkoutNotice.addEventListener("click", event => {
    if (event.target === checkoutNotice || event.target.closest("[data-close-checkout-notice]")) closeCheckoutNotice();
  });

  // If the browser restores this page from its back/forward cache, show what is really in storage.
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    const form = $("#checkoutForm");
    if (form) { form.reset(); fillCustomerFields(form); }
    renderCart();
  });

    function orderOnWhatsApp() {
    if (!checkoutNotice.hidden) return;
    const cart = getCart();
    const form = $("#checkoutForm");
    const error = $("#checkoutError");
    if (!cart.length || !form) { showToast("Your cart is empty"); return; }
    const data = Object.fromEntries(new FormData(form));
    const name = (data.name || "").trim();
    const phone = (data.phone || "").trim();
    const address = (data.address || "").trim();
    const digits = phone.replace(/\D/g, "");
    const problems = [];
    if (name.length < 2) problems.push(["name", "Please enter your name."]);
    if (digits.length < 10 || digits.length > 13) problems.push(["phone", "Please enter a phone number we can reach, like 03XX XXXXXXX."]);
    if (address.length < 8) problems.push(["address", "Please add your full delivery address (house, street, area)."]);
    if (problems.length) {
      error.textContent = problems[0][1];
      problems.forEach(([field]) => form.elements[field].setAttribute("aria-invalid", "true"));
      form.elements[problems[0][0]].focus();
      return;
    }
    const { subtotal, fee, total } = totals(cart);
    if (delivery.minOrder && subtotal < delivery.minOrder) { error.textContent = `Minimum order is ${money(delivery.minOrder)}.`; return; }
    const lines = cart.map(row => {
      const item = products.find(product => product.id === row.id);
      return item ? `• ${item.name} x${row.quantity} — ${money(item.price * row.quantity)}` : "";
    }).filter(Boolean);
    const paymentLabel = data.payment === "transfer" ? (payments.transfer || "Bank transfer") : (payments.cod || "Cash on delivery");
    const message = [
      "Hi FoodMania! I'd like to place an order.", "",
      "*Order*", ...lines, "",
      `Subtotal: ${money(subtotal)}`,
      `Delivery: ${fee === 0 ? "Free" : money(fee)}`,
      `*Total: ${money(total)}*`, "",
      "*Delivery details*",
      `Name: ${name}`, `Phone: ${phone}`, `Address: ${address}`,
      ...(data.notes && data.notes.trim() ? [`Notes: ${data.notes.trim()}`] : []),
      `Payment: ${paymentLabel}`, "",
      "Please confirm my order and the delivery time."
    ].join("\n");
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    openCheckoutNotice(name, whatsappUrl);
  }

  
  function productCard(item, variant = "") {
    const menuCard = variant.includes("menu-product-card");
    const save = item.oldPrice && item.oldPrice > item.price ? item.oldPrice - item.price : 0;
    const diet = `${item.veg ? '<span class="diet diet-veg" title="Vegetarian" role="img" aria-label="Vegetarian"></span>' : ""}${item.spicy ? '<span class="diet diet-spicy" title="Spicy" role="img" aria-label="Spicy"><i class="fa-solid fa-pepper-hot"></i></span>' : ""}`;
    const art = item.image
      ? `<img class="product-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" width="800" height="600" loading="lazy" decoding="async">`
      : `<div class="shape-food" aria-hidden="true"><i class="fa-solid ${shapeIcon(item.shape).match(/fa-solid ([^"]+)/)?.[1] || "fa-utensils"}"></i></div>`;
    return `<article class="product-card ${variant}" id="product-${escapeHTML(item.id)}" ${menuCard ? `data-product-details="${escapeHTML(item.id)}"` : ""}><div class="product-art art-${item.shape}">${art}<span class="product-tag">${escapeHTML(item.tag || item.category)}</span></div><div class="product-info"><div class="product-title-row"><div><p class="product-category">${escapeHTML(item.category)}${diet}</p><h3>${escapeHTML(item.name)}</h3></div><button class="add-button" data-add="${escapeHTML(item.id)}" aria-label="Add ${escapeHTML(item.name)} to cart"><i class="fa-solid fa-plus"></i></button></div><p class="product-description">${escapeHTML(item.description)}</p><div class="product-price-row"><strong>${money(item.price)}</strong>${item.oldPrice ? `<del>${money(item.oldPrice)}</del>` : ""}${save ? `<span class="save-pill">Save ${money(save)}</span>` : ""}</div>${menuCard ? `<button class="product-details-trigger" type="button" data-view-details="${escapeHTML(item.id)}" aria-label="View details for ${escapeHTML(item.name)}">View details <i class="fa-solid fa-arrow-up-right-from-square"></i></button>` : ""}</div></article>`;
  }

  
  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add);
    const qty = event.target.closest("[data-qty]");
    if (qty) updateQuantity(qty.dataset.id, Number(qty.dataset.qty));
  });
  document.addEventListener("keydown", event => {
    if (!checkoutNotice.hidden) {
      if (event.key === "Escape") closeCheckoutNotice();
      else trapFocus($(".checkout-notice-card", checkoutNotice), event);
      return;
    }
    if (!cartOverlay || cartOverlay.hidden) return;
    if (event.key === "Escape") closeCart();
    else trapFocus($(".cart-drawer", cartOverlay), event);
  });
  $("#openCart")?.addEventListener("click", openCart);
  $("#closeCart")?.addEventListener("click", closeCart);
  $("#closeCartBackdrop")?.addEventListener("click", closeCart);
  buildCheckout();
  renderCart();

  
  if (window.gsap && window.ScrollTrigger && document.querySelector("#pizzaSpin")) {
    gsap.registerPlugin(ScrollTrigger);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.to("#pizzaSpin", {
        rotation: 347,
        ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 }
      });
    }
  }

  
  const bestTrack = $("#bestsellerTrack");
  const dealsGrid = $("#dealsGrid");
  if (window.FOODMANIA_LOAD_FAILED) {
    const message = `<div class="load-error"><i class="fa-solid fa-triangle-exclamation"></i><div><h3>The menu couldn't load</h3><p>Please refresh the page. If it keeps happening, message us on WhatsApp and we'll take your order directly.</p></div></div>`;
    if (bestTrack) bestTrack.innerHTML = message;
    if (dealsGrid) dealsGrid.innerHTML = message;
  }
  if (bestTrack && !window.FOODMANIA_LOAD_FAILED) {
    const bestsellers = products.filter(item => item.bestSeller);
    bestTrack.innerHTML = bestsellers.map(item => productCard(item, "bestseller-card")).join("");
    const updateRail = () => {
      const maxScroll = bestTrack.scrollWidth - bestTrack.clientWidth;
      const progress = maxScroll > 0 ? bestTrack.scrollLeft / maxScroll : 0;
      const rail = $("#sliderProgress");
      if (rail) {
        rail.style.width = `${Math.max(18, (bestTrack.clientWidth / bestTrack.scrollWidth) * 100)}%`;
        rail.style.marginLeft = `${progress * (100 - Math.max(18, (bestTrack.clientWidth / bestTrack.scrollWidth) * 100))}%`;
      }
    };
    bestTrack.addEventListener("scroll", updateRail, { passive: true });
    const mobileCarousel = window.matchMedia("(max-width: 700px)");
    let carouselTween;
    const setupCarouselMotion = () => {
      if (carouselTween) {
        carouselTween.scrollTrigger?.kill();
        carouselTween.kill();
        carouselTween = null;
      }
      if (!window.gsap || !window.ScrollTrigger || mobileCarousel.matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        bestTrack.style.transform = "";
        bestTrack.style.width = "";
        updateRail();
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      const maxShift = () => Math.max(0, bestTrack.scrollWidth - bestTrack.parentElement.clientWidth);
      gsap.set(bestTrack, { width: "max-content" });
      carouselTween = gsap.to(bestTrack, {
        x: () => -maxShift(),
        ease: "none",
        scrollTrigger: {
          trigger: "#bestsellers",
          start: "top 78%",
          end: "bottom 22%",
          scrub: 0.85,
          invalidateOnRefresh: true,
          onUpdate: self => {
            const rail = $("#sliderProgress");
            if (rail) {
              rail.style.width = `${Math.max(18, (bestTrack.parentElement.clientWidth / bestTrack.scrollWidth) * 100)}%`;
              rail.style.marginLeft = `${self.progress * (100 - Math.max(18, (bestTrack.parentElement.clientWidth / bestTrack.scrollWidth) * 100))}%`;
            }
          }
        }
      });
    };
    setupCarouselMotion();
    window.addEventListener("resize", () => { setupCarouselMotion(); window.ScrollTrigger?.refresh?.(); });
    updateRail();
  }
  if (dealsGrid && !window.FOODMANIA_LOAD_FAILED) {
    dealsGrid.innerHTML = products.filter(item => item.category === "Deals & Combos").map((item, index) => {
      const save = item.oldPrice && item.oldPrice > item.price ? item.oldPrice - item.price : 0;
      return `
      <article class="deal-card">
        ${save ? `<span class="deal-index save-pill">Save ${money(save)}</span>` : `<span class="deal-index"></span>`}
        <div class="deal-art">${item.image ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" width="900" height="700" loading="lazy" decoding="async">` : `<i class="fa-solid ${item.shape === "combo" ? (index === 1 ? "fa-pizza-slice" : index === 2 ? "fa-box-open" : "fa-burger") : "fa-utensils"}" aria-hidden="true"></i>`}</div>
        <div class="deal-copy"><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description)}</p></div>
        <div class="deal-bottom"><span class="deal-price">${money(item.price)}${item.oldPrice ? `<del>${money(item.oldPrice)}</del>` : ""}</span><button class="deal-add" data-add="${item.id}" aria-label="Add ${escapeHTML(item.name)} to cart"><i class="fa-solid fa-plus"></i></button></div>
      </article>`;
    }).join("");
  }

  window.FoodMania = { products, site, money, productCard, addToCart, getCart, showToast, openCart, trapFocus, shapeIcon };
}
if (window.FOODMANIA_PRODUCTS) initializeApp();
else window.addEventListener("foodmania:products-ready", initializeApp, { once: true });
})();
(() => {
  const overlay = document.getElementById('foodManiaAgent');
  const openButton = document.querySelector('.mascot-widget');
  const closeButton = document.getElementById('closeFoodManiaAgent');
  const form = document.getElementById('agentComposer');
  const input = document.getElementById('agentInput');
  const conversation = document.getElementById('agentConversation');
  if (!overlay || !openButton || !closeButton || !form || !input || !conversation) return;

  const STORAGE_KEY = 'foodmania-agent-conversation-v1';
  let previousFocus = null;
  let questionData = [];
  let transcript = [];
  const productList = () => window.FOODMANIA_PRODUCTS || [];
  try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(saved)) transcript = saved; } catch (_) {}

  const openAgent = () => {
    previousFocus = document.activeElement;
    const rect = openButton.getBoundingClientRect();
    overlay.style.setProperty('--agent-origin-x', `${rect.left + rect.width / 2}px`);
    overlay.style.setProperty('--agent-origin-y', `${rect.top + rect.height / 2}px`);
    overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agent-open'); window.setTimeout(() => input.focus(), 420);
  };
  const closeAgent = () => {
    overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('agent-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  const persistTranscript = () => { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(transcript.slice(-60))); } catch (_) {} };
  const renderMessage = ({text, who, link, label}) => {
    const node = document.createElement('div'); node.className = `agent-message ${who}`;
    const copy = document.createElement('span'); copy.textContent = text; node.appendChild(copy);
    if (link && label) { const anchor = document.createElement('a'); anchor.className = 'agent-action-link'; anchor.href = link; anchor.textContent = `${label} →`; node.appendChild(anchor); }
    conversation.appendChild(node); conversation.scrollTop = conversation.scrollHeight;
  };
  const addMessage = (text, who, link, label) => {
    const message = {text, who, link: link || '', label: label || ''};
    transcript.push(message); persistTranscript(); renderMessage(message);
  };
  const restoreTranscript = () => {
    if (!transcript.length) return;
    transcript.forEach(renderMessage);
  };
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const findAnswer = question => {
    const q = normalize(question); let best = null; let bestScore = 0;
    questionData.forEach(item => {
      let score = 0;
      (item.keywords || []).forEach(keyword => {
        const key = normalize(keyword); if (!key) return;
        if (q === key) score += 6;
        else if (key.includes(' ') && q.includes(key)) score += 5;
        else if (!key.includes(' ') && q.split(' ').includes(key)) score += 2;
      });
      if (score > bestScore) { best = item; bestScore = score; }
    });
    return bestScore > 0 ? best : questionData.find(item => item.id === 'fallback' || item.id === 'not-sure') || questionData[questionData.length - 1];
  };
  const buildResponse = item => {
    if (item.type === 'recommendation') {
      const candidates = productList().filter(product => product.category !== 'Deals & Combos');
      if (!candidates.length) return {text:'I can help you browse the menu while I get my recommendations ready.', link:'menu.html', label:'Browse the menu'};
      const product = candidates[Math.floor(Math.random() * candidates.length)];
      return {text:`Okay, I’ll pick one for you! 😊 How about the ${product.name}? ${product.description} It’s ${window.FoodMania?.money ? window.FoodMania.money(product.price) : `Rs. ${product.price}`}. Tap below and I’ll open its details for you.`, link:`menu.html?product=${encodeURIComponent(product.id)}`, label:`See ${product.name}`};
    }
    let link = item.link || 'menu.html';
    if (link === 'index.html#deals' || link.endsWith('#deals')) link = 'index.html#deals';
    return {text:item.answer || 'Let’s take a look together.', link, label:item.linkLabel || 'Explore FoodMania'};
  };
  const ask = question => {
    const clean = question.trim(); if (!clean) return;
    addMessage(clean, 'user');
    const matched = findAnswer(clean); const answer = buildResponse(matched);
    addMessage(answer.text, 'bot', answer.link, answer.label);
    input.value = ''; input.focus();
  };

  restoreTranscript();
  openButton.addEventListener('click', openAgent); closeButton.addEventListener('click', closeAgent);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeAgent(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeAgent(); });
  form.addEventListener('submit', event => { event.preventDefault(); ask(input.value); });
  conversation.querySelectorAll('[data-agent-question]').forEach(button => button.addEventListener('click', () => ask(button.dataset.agentQuestion)));
  fetch('data/agent-questions.json').then(response => { if (!response.ok) throw new Error(`Agent questions request failed (${response.status})`); return response.json(); })
    .then(data => { questionData = Array.isArray(data.questions) ? data.questions : []; })
    .catch(error => console.error('FoodMania Agent could not load data/agent-questions.json.', error));
})();
