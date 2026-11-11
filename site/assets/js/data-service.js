/* Read both public endpoints as one release; keep the complete local copy on failure. */
window.SiteData = (() => {
  const local = { content: window.SITE_CONTENT, products: window.PRODUCTS, version: window.CONTENT_VERSION };
  const config = window.DATA_CONFIG;
  const contract = window.ContentContract;
  async function request(path, signal) {
    const base = new URL(config.apiBase, location.href);
    if (base.username || base.password ||
        (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))))
      throw new Error("HTTPS API required");
    const response = await fetch(new URL(path, base.href.endsWith("/") ? base : base.href + "/"),
      { signal, credentials: "omit", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const json = await response.json();
    if (!json || !("data" in json)) throw new Error("Invalid API envelope");
    return json;
  }
  let state = { ...local, source: "local", fallback: false };
  const ready = (async () => {
    if (config.source !== "api") return state;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      if (!config.apiBase) throw new Error("Missing API base");
      const [products, content] = await Promise.all([
        request("products", controller.signal), request("site-content", controller.signal),
      ]);
      const pVersion = products.meta?.version;
      const cVersion = content.meta?.version;
      // Both absent supports the old cloud service during migration.
      if (pVersion !== cVersion || (pVersion !== undefined && (typeof pVersion !== "string" || !/^[a-f0-9]{16}$/.test(pVersion))))
        throw new Error("API content versions differ");
      state = {
        products: contract.validateProducts(products.data),
        content: contract.validateContent(content.data),
        version: pVersion || "legacy", source: "api", fallback: false,
      };
    } catch (error) {
      controller.abort();
      state = { ...local, source: "local", fallback: true, reason: error.name === "AbortError" ? "timeout" : error.message };
    } finally { clearTimeout(timeout); }
    window.PRODUCTS = state.products;
    window.SITE_CONTENT = state.content;
    return state;
  })();
  return Object.freeze({
    ready,
    async getProducts() { return (await ready).products; },
    async getContent() { return (await ready).content; },
  });
})();
