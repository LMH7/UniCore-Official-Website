/* 前端数据接入点。当前 local 模式不发起接口请求；未来由后端按 BACKEND_PLAN.md 实现。 */
window.DATA_CONFIG = Object.freeze({
  source: "local",
  apiBase: "",
  timeoutMs: 5000,
});
window.SiteData = (() => {
  const local = { content: window.SITE_CONTENT, products: window.PRODUCTS };
  const segment = (value) => typeof value === "string" && value.length < 5000;
  function validateProducts(items) {
    const ids = new Set();
    if (!Array.isArray(items) || items.length > 500)
      throw new Error("Invalid products");
    for (const p of items) {
      if (!p || !/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id))
        throw new Error("Invalid product id");
      ids.add(p.id);
      for (const field of [
        "name",
        "subtitle",
        "sensor",
        "image",
        "imageAlt",
        "summary",
        "description",
      ])
        if (!segment(p[field])) throw new Error("Invalid product text");
      if (
        !Array.isArray(p.specs) ||
        !p.specs.every((s) => s && segment(s.label) && segment(s.value))
      )
        throw new Error("Invalid specs");
      if (!Array.isArray(p.applications) || !p.applications.every(segment))
        throw new Error("Invalid applications");
      if (
        !Array.isArray(p.resources) ||
        !p.resources.every((r) => r && segment(r.title) && segment(r.url))
      )
        throw new Error("Invalid resources");
    }
    return items;
  }
  function validateContent(data) {
    if (
      !data ||
      !segment(data.name) ||
      !segment(data.brand) ||
      !segment(data.intro)
    )
      throw new Error("Invalid content");
    if (
      !["solutions", "resources", "contacts", "faqs"].every((k) =>
        Array.isArray(data[k]),
      )
    )
      throw new Error("Invalid content arrays");
    for (const s of data.solutions)
      if (
        !s ||
        !/^[a-z0-9-]+$/.test(s.id) ||
        ![
          "number",
          "title",
          "english",
          "icon",
          "summary",
          "audience",
          "description",
        ].every((k) => segment(s[k])) ||
        !Array.isArray(s.topics) ||
        !s.topics.every(segment)
      )
        throw new Error("Invalid solution");
    for (const r of data.resources)
      if (
        !r ||
        !["title", "type", "description", "url", "label"].every((k) =>
          segment(r[k]),
        )
      )
        throw new Error("Invalid resource");
    for (const c of data.contacts)
      if (
        !c ||
        !/^[a-z0-9-]+$/.test(c.id) ||
        ![
          "label",
          "name",
          "icon",
          "description",
          "qrImage",
          "url",
          "action",
          "downloadName",
        ].every((k) => segment(c[k]))
      )
        throw new Error("Invalid contact");
    for (const f of data.faqs)
      if (!f || !segment(f.question) || !segment(f.answer))
        throw new Error("Invalid FAQ");
    return { ...local.content, ...data };
  }
  async function request(path, signal) {
    const config = window.DATA_CONFIG;
    const base = new URL(config.apiBase, location.href);
    if (
      base.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(base.hostname)
    )
      throw new Error("HTTPS API required");
    const response = await fetch(
      new URL(path, base.href.endsWith("/") ? base : base.href + "/"),
      { signal, credentials: "omit", headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`API ${response.status}`);
    const json = await response.json();
    if (!json || !("data" in json)) throw new Error("Invalid API envelope");
    return json.data;
  }
  let state = { ...local, source: "local", fallback: false };
  const ready = (async () => {
    if (window.DATA_CONFIG.source !== "api") return state;
    if (!window.DATA_CONFIG.apiBase)
      return (state = { ...state, fallback: true });
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      window.DATA_CONFIG.timeoutMs,
    );
    try {
      const [products, content] = await Promise.all([
        request("products", controller.signal),
        request("site-content", controller.signal),
      ]);
      state = {
        products: validateProducts(products),
        content: validateContent(content),
        source: "api",
        fallback: false,
      };
    } catch {
      controller.abort();
      state = { ...local, source: "local", fallback: true };
    } finally {
      clearTimeout(timeout);
    }
    window.PRODUCTS = state.products;
    window.SITE_CONTENT = state.content;
    return state;
  })();
  return Object.freeze({
    ready,
    async getProducts() {
      return (await ready).products;
    },
    async getContent() {
      return (await ready).content;
    },
  });
})();
