
(async () => {
  const SANITY_PROJECT_ID = "flqjjpla";
  const SANITY_DATASET = "production";
  const SANITY_API_VERSION = "2025-01-01";

  // Fetch products directly from Sanity
  const productQuery = `
    *[_type == "product"] | order(_createdAt asc) {
      "id": id,
      "image": image.asset->url,
      name,
      category,
      price,
      oldPrice,
      description,
      tag,
      shape,
      bestSeller,
      veg,
      spicy
    }
  `;

  const loadSanityProducts = async () => {
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(productQuery)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Sanity request failed (${response.status})`);
    }

    const data = await response.json();
    return data.result;
  };

  // Load business settings from the existing JSON file
  const load = async path => {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`${path} request failed (${response.status})`);
    }

    return response.json();
  };

  const [products, site] = await Promise.allSettled([
    loadSanityProducts(),
    load("data/site.json")
  ]);

  window.FOODMANIA_PRODUCTS =
    products.status === "fulfilled" ? products.value : [];

  window.FOODMANIA_SITE =
    site.status === "fulfilled" ? site.value : {};

  window.FOODMANIA_LOAD_FAILED =
    products.status !== "fulfilled";

  if (products.status !== "fulfilled") {
    console.error("FoodMania could not load products from Sanity:", products.reason);
  }

  if (site.status !== "fulfilled") {
    console.error("FoodMania could not load data/site.json:", site.reason);
  }

  window.dispatchEvent(new CustomEvent("foodmania:products-ready"));
})();
