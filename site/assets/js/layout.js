/* A 维护：公共布局与内容渲染工具。数据中的文本一律转义。 */
window.UI = {
  escape(value = "") {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  },
  url(value = "") {
    const text = String(value).trim();
    if (/^(https?:\/\/|mailto:)/i.test(text)) return this.escape(text);
    if (
      /^(?![\/\\])(?:[a-zA-Z0-9_.\/-]+)(?:[?#][a-zA-Z0-9_.%=&-]*)?$/.test(
        text,
      ) &&
      !text.includes("..")
    )
      return this.escape(text);
    return "";
  },
  icon(name, size = 24) {
    const paths = {
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
      book: '<path d="M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
      scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 12l5-5 5 5-5 5-5-5Z"/>',
      nodes:
        '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10.5 7.5-4 8m7-8 4 8M8 18h8"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
      layers:
        '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  },
};
(() => {
  const { escape: e, icon } = UI;
  const data = SITE_CONTENT;
  const page = document.body.dataset.page;
  const nav = [
    ["home", "index.html", "首页"],
    ["products", "products.html", "产品中心"],
    ["solutions", "solutions.html", "解决方案"],
    ["resources", "resources.html", "资源与支持"],
    ["about", "about.html", "关于我们"],
  ];
  const brand = `<span class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand-words"><strong>${e(data.brand)}</strong><span>${e(data.shortName)} · 智能探索无界</span></span>`;
  document.getElementById("site-header").innerHTML =
    `<nav class="navbar navbar-expand-lg" aria-label="主导航"><div class="container"><a class="navbar-brand brand" href="index.html" aria-label="${e(data.name)}首页">${brand}</a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-navigation" aria-controls="main-navigation" aria-expanded="false" aria-label="展开导航菜单"><span class="menu-bars"></span></button><div class="collapse navbar-collapse" id="main-navigation"><ul class="navbar-nav ms-auto">${nav.map(([id, href, label]) => `<li class="nav-item"><a class="nav-link ${page === id || (page === "product" && id === "products") ? "active" : ""}" href="${href}" ${page === id || (page === "product" && id === "products") ? 'aria-current="page"' : ""}>${label}</a></li>`).join("")}</ul><a class="btn btn-nav ${page === "contact" ? "active" : ""}" href="contact.html" ${page === "contact" ? 'aria-current="page"' : ""}>联系我们 ${icon("diagonal", 15)}</a></div></div></nav>`;
  document.getElementById("site-footer").innerHTML =
    `<div class="container"><div class="footer-top"><div><a class="brand footer-brand" href="index.html">${brand}</a><p>${e(data.tagline)}<br>让每一个研究想法，都有起飞的可能。</p></div><div class="footer-links"><div><span>探索 NEXCORE</span><a href="products.html">产品中心</a><a href="solutions.html">解决方案</a></div><div><span>与我们连接</span><a href="about.html">关于团队</a><a href="resources.html">资源与支持</a><a href="contact.html">联系我们</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${e(data.name)}</span><span>探索无界 · 智启未来</span><a href="credits.html">素材与开源说明</a></div></div>`;
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 22);
  });
  document.querySelectorAll("[data-team-intro]").forEach((el) => {
    el.textContent = data.intro;
  });
  document.querySelectorAll("[data-team-name]").forEach((el) => {
    el.textContent = data.name;
  });
})();
