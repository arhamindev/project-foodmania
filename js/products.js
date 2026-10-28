(async () => {
  const load = async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} request failed (${response.status})`);
    return response.json();
  };
  const [products, site] = await Promise.allSettled([load("data/products.json"), load("data/site.json")]);
  window.FOODMANIA_PRODUCTS = products.status === "fulfilled" ? products.value : [];
  window.FOODMANIA_SITE = site.status === "fulfilled" ? site.value : {};
  window.FOODMANIA_LOAD_FAILED = products.status !== "fulfilled";
  if (products.status !== "fulfilled") console.error("FoodMania could not load data/products.json. Run the project through a web server (Live Server), not file://.", products.reason);
  if (site.status !== "fulfilled") console.error("FoodMania could not load data/site.json.", site.reason);
  window.dispatchEvent(new CustomEvent("foodmania:products-ready"));
})();
