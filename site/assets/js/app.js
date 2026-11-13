/* 页面内容呈现；数据来自统一数据服务，保持静态与 API 模式的页面行为一致。 */
window.APP_READY = (async () => {
  await SiteData.ready;
  const { escape: e, icon } = UI;
  const isCollection = document.body.dataset.page === "products";
  const card = (p) =>
    `<article class="product-card" data-product-card="${e(p.id)}"><a class="product-image" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="查看 ${e(p.name)}"><span class="image-caption">NEX SERIES</span><img src="${UI.url(p.image)}" alt="${e(p.imageAlt)}" width="560" height="420" loading="lazy"><span class="image-arrow">${icon("diagonal", 20)}</span></a><div class="product-card-body"><div class="product-card-heading"><h3><a href="product.html?id=${encodeURIComponent(p.id)}">${e(p.name)}</a></h3><span class="sensor-tag">${e(p.sensor)}</span></div><p>${e(p.summary)}</p><div class="product-card-actions"><a class="text-link" href="product.html?id=${encodeURIComponent(p.id)}">探索产品 ${icon("arrow", 18)}</a>${isCollection ? `<label class="compare-check"><input type="checkbox" value="${e(p.id)}" data-compare-product aria-label="将 ${e(p.name)} 加入对比"><span>加入对比</span></label>` : ""}</div></div></article>`;
  const resourceLink = (href, label, external) =>
    `<a class="text-link" href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${e(label)} ${icon(external ? "diagonal" : "arrow", 18)}${external ? '<span class="visually-hidden">（新窗口打开）</span>' : ""}</a>`;
  const resourceCard = (r) => {
    const href = UI.url(r.url);
    return `<article class="resource-card"><span class="resource-icon">${icon(r.icon || "book", 28)}</span><span class="micro-label">${e(r.type)}</span><h2>${e(r.title)}</h2><p>${e(r.description)}</p>${resourceLink(href, r.label, /^https?:/i.test(href))}</article>`;
  };
  const solutionCase = (s) => {
    const c = s.case || {};
    if (c.status === "ready" && c.title) {
      const image = UI.url(c.image);
      const link = UI.url(c.link);
      return `<article class="solution-case is-ready">${image ? `<div class="solution-case-media"><img src="${image}" alt="${e(c.imageAlt || c.title)}" width="640" height="360" loading="lazy"></div>` : '<div class="solution-case-media" role="img" aria-label="案例图片待补充"><span>案例图片待补充</span></div>'}<div class="solution-case-copy"><span class="micro-label">CASE / ${e(s.title)}</span><h3>${e(c.title)}</h3><p>${e(c.summary || "")}</p>${link ? resourceLink(link, "查看案例", /^https?:/i.test(link)) : ""}</div></article>`;
    }
    return `<div class="solution-case is-pending"><div class="solution-case-media" role="img" aria-label="案例图片待补充，建议比例十六比九"><span>案例图片待补充 · 16:9</span></div><div class="solution-case-copy"><span class="micro-label">CASE / 待补充</span><h3>案例位置</h3><p>${e(c.note || "用于放置经团队确认可公开的应用案例，建议 16:9 图片与 100–150 字说明。")}</p><span class="pending-badge">资料待补充</span></div></div>`;
  };
  const solutionLinks = (s) => {
    const platforms = (s.platforms || [])
      .map((id) => (PRODUCTS || []).find((p) => p.id === id))
      .filter(Boolean)
      .map(
        (p) =>
          `<a class="platform-chip" href="product.html?id=${encodeURIComponent(p.id)}"><strong>${e(p.name)}</strong><span>${e(p.sensor)}</span></a>`,
      )
      .join("");
    return `<div class="solution-links"><div class="solution-link-group"><span class="micro-label">可了解的平台</span><div class="platform-chips">${platforms || '<span class="pending-badge">平台待确认</span>'}</div></div><div class="solution-link-group"><span class="micro-label">相关入口</span><div class="solution-link-row"><a class="text-link" href="resources.html">公开学习资源 ${icon("arrow", 16)}</a><a class="text-link" href="resources.html#faq-title">常见问题 ${icon("arrow", 16)}</a></div></div></div>`;
  };
  document.querySelectorAll("[data-products]").forEach((el) => {
    el.innerHTML =
      PRODUCTS.length || isCollection
        ? PRODUCTS.map(card).join("")
        : '<div class="empty-collection"><h3>平台信息正在更新</h3><p>欢迎与我们交流你的研究需求。</p><a class="text-link" href="contact.html">联系我们</a></div>';
  });
  document.querySelectorAll("[data-solutions]").forEach((el) => {
    el.innerHTML = SITE_CONTENT.solutions.length
      ? SITE_CONTENT.solutions
          .map(
            (s) =>
              `<article class="solution-card"><div class="solution-icon">${icon(s.icon, 30)}<span>${e(s.number)}</span></div><span class="micro-label">${e(s.english)}</span><h3>${e(s.title)}</h3><p>${e(s.summary)}</p><a class="text-link" href="solutions.html#${e(s.id)}">了解方案 ${icon("arrow", 18)}</a></article>`,
          )
          .join("")
      : '<div class="empty-collection"><h3>方案内容正在整理</h3><p>欢迎先浏览产品中心，或与我们交流研究需求。</p><a class="text-link" href="contact.html">联系我们</a></div>';
  });
  const fullSolutions = document.querySelector("[data-full-solutions]");
  if (fullSolutions) {
    const hasSolutions = SITE_CONTENT.solutions.length > 0;
    const solutionsMarkup = hasSolutions
      ? SITE_CONTENT.solutions
          .map(
            (s) =>
              `<section class="solution-detail" id="${e(s.id)}"><div class="solution-detail-visual solution-${e(s.id)}"><span class="large-number">${e(s.number)}</span><div class="solution-orbit">${icon(s.icon, 90)}</div><span class="micro-label">${e(s.english)}</span></div><div class="solution-detail-copy"><span class="eyebrow">应用方向 / ${e(s.number)}</span><h2>${e(s.title)}</h2><p class="lead-text">${e(s.summary)}</p><p>${e(s.description)}</p><div class="tags">${s.topics.map((t) => `<span>${e(t)}</span>`).join("")}</div><div class="audience"><span>面向人群</span><p>${e(s.audience)}</p></div>${solutionLinks(s)}<a class="text-link" href="contact.html">讨论你的研究需求 ${icon("arrow", 18)}</a></div>${solutionCase(s)}</section>`,
          )
          .join("")
      : '<div class="empty-collection"><h3>方案内容正在整理</h3><p>欢迎先浏览产品中心，或与我们交流研究需求。</p><a class="text-link" href="products.html">查看产品平台</a></div>';
    // 静态内容与数据一致时保留 DOM，避免再次插入导航和正文造成位移。
    let solutionsHash = 0x811c9dc5;
    for (let i = 0; i < solutionsMarkup.length; i++) {
      solutionsHash = Math.imul(
        solutionsHash ^ solutionsMarkup.charCodeAt(i),
        0x01000193,
      );
    }
    const solutionsKey = `v1-${(solutionsHash >>> 0).toString(16).padStart(8, "0")}`;
    if (
      fullSolutions.dataset.solutionsKey !== solutionsKey ||
      (hasSolutions && !fullSolutions.querySelector(".solution-detail"))
    ) {
      fullSolutions.innerHTML = solutionsMarkup;
      fullSolutions.dataset.solutionsKey = solutionsKey;
    }
  }
  const resources = document.querySelector("[data-resources]");
  if (resources)
    resources.innerHTML = SITE_CONTENT.resources.length
      ? SITE_CONTENT.resources.map(resourceCard).join("")
      : '<div class="empty-collection"><h3>学习资源正在整理</h3><p>欢迎先浏览产品中心，或与我们交流学习需求。</p><a class="text-link" href="products.html">查看产品平台</a></div>';
  const platformResources = document.querySelector(
    "[data-platform-resources]",
  );
  if (platformResources)
    platformResources.innerHTML = PRODUCTS.length
      ? PRODUCTS.map(
          (p) =>
            `<a class="platform-resource" href="product.html?id=${encodeURIComponent(p.id)}"><span class="micro-label">${e(p.sensor)}</span><strong>${e(p.name)}</strong><span class="platform-resource-more">查看平台信息 ${icon("arrow", 16)}</span><span class="pending-badge">专属资料待补充</span></a>`,
        ).join("")
      : '<div class="empty-collection"><h3>平台信息正在更新</h3><p>欢迎先与我们交流研究需求。</p><a class="text-link" href="contact.html">联系我们</a></div>';
  const resourceUpdates = document.querySelector("[data-resource-updates]");
  if (resourceUpdates)
    resourceUpdates.innerHTML = (SITE_CONTENT.resourceUpdates || [])
      .map((u) => {
        const href = u.status === "ready" ? UI.url(u.url) : "";
        return `<div class="resource-update-row"><div><strong>${e(u.title)}</strong><p>${e(u.note)}</p></div>${href ? resourceLink(href, "查看资料", /^https?:/i.test(href)) : '<span class="pending-badge">待补充</span>'}</div>`;
      })
      .join("");
  if (!PRODUCTS.length && document.querySelector(".hero-visual"))
    document.querySelector(".hero-visual").innerHTML =
      '<div class="hero-empty"><span class="eyebrow">EXPLORE WITH iNEX</span><h2>下一次探索，从一个想法开始。</h2><p>平台信息正在更新，欢迎先与团队交流。</p><a class="btn btn-outline-primary" href="contact.html">联系我们</a></div>';
  const tabs = document.querySelector(".hero-tabs");
  if (tabs && PRODUCTS.length) {
    tabs.innerHTML = PRODUCTS.slice(0, 3)
      .map(
        (p, i) =>
          `<button type="button" class="${i === 0 ? "selected" : ""}" data-hero-product="${e(p.id)}" aria-pressed="${i === 0}">${String(i + 1).padStart(2, "0")} / ${e(p.name)}</button>`,
      )
      .join("");
    const first = PRODUCTS[0];
    document.getElementById("hero-product-image").src = first.image;
    document.getElementById("hero-product-image").alt = first.imageAlt;
    document.getElementById("hero-model").textContent = first.name;
    document.getElementById("hero-sensor").textContent = first.subtitle;
    document.getElementById("hero-product-link").href =
      `product.html?id=${encodeURIComponent(first.id)}`;
  }
  const heroButtons = document.querySelectorAll("[data-hero-product]");
  heroButtons.forEach((button) =>
    button.addEventListener("click", () => {
      const p = PRODUCTS.find((item) => item.id === button.dataset.heroProduct);
      if (!p) return;
      heroButtons.forEach((b) => {
        b.classList.toggle("selected", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      const image = document.getElementById("hero-product-image");
      image.src = p.image;
      image.alt = p.imageAlt;
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        image.animate(
          [
            { opacity: 0.3, transform: "translateY(12px) scale(.97)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 320, easing: "ease-out" },
        );
      document.getElementById("hero-model").textContent = p.name;
      document.getElementById("hero-sensor").textContent = p.subtitle;
      document.getElementById("hero-product-link").href =
        `product.html?id=${encodeURIComponent(p.id)}`;
    }),
  );
  const contact = document.querySelector("[data-contact]");
  if (contact) {
    const email = SITE_CONTENT.email.trim();
    const product = PRODUCTS.find(
      (p) => p.id === new URLSearchParams(location.search).get("product"),
    );
    contact.innerHTML = `<span class="eyebrow">CONNECT WITH ${e(SITE_CONTENT.brand)}</span><h2>联系方式</h2><p>一起，让想法起飞。从一个问题开始，找到适合你的平台与合作方向。</p>${product ? `<div class="inquiry-context">你正在了解 <strong>${e(product.name)}</strong><button type="button" class="text-link" data-copy="我想了解 ${e(product.name)}，希望进一步交流平台配置与研究需求。">复制咨询内容 ${icon("copy", 15)}</button></div>` : ""}<div class="contact-channels">${SITE_CONTENT.contacts.map((c) => `<article class="contact-channel"><div class="channel-heading"><span class="channel-icon">${icon(c.icon, 25)}</span><div><span class="micro-label">${e(c.label)}</span><h3>${e(c.name)}</h3></div></div><p>${e(c.description)}</p><button class="qr-preview" type="button" data-contact-qr="${e(c.id)}" aria-label="放大${e(c.label)}二维码"><img src="${UI.url(c.qrImage)}" alt="${e(c.label)}联系二维码" width="240" height="240" loading="lazy"><span>${icon("zoom", 15)} 点击放大 · 长按识别</span></button><div class="channel-actions">${c.url && UI.url(c.url) ? `<a class="text-link" href="${UI.url(c.url)}" target="_blank" rel="noopener noreferrer">${e(c.action)} ${icon("diagonal", 16)}<span class="visually-hidden">（新窗口打开）</span></a>` : `<button class="text-link" type="button" data-contact-qr="${e(c.id)}">${e(c.action)} ${icon("zoom", 16)}</button>`}<a class="download-qr" href="${UI.url(c.qrImage)}" download="${e(c.downloadName)}" aria-label="保存${e(c.label)}二维码">${icon("download", 17)} 保存</a></div></article>`).join("")}</div>${email ? `<div class="email-block"><span class="eyebrow">联系邮箱</span><a class="contact-email" href="mailto:${encodeURIComponent(email)}">${e(email)}</a><button class="btn btn-outline-primary" id="copy-email" type="button">${icon("copy", 18)} 复制邮箱</button><p class="copy-status" role="status" aria-live="polite"></p></div>` : ""}`;
    if (email)
      document
        .getElementById("copy-email")
        .addEventListener("click", async () => {
          const status = contact.querySelector(".copy-status");
          try {
            await navigator.clipboard.writeText(email);
            status.textContent = "邮箱已复制。";
          } catch {
            status.textContent = `暂时无法自动复制，请选中上方邮箱手动复制：${email}`;
          }
        });
    if (!SITE_CONTENT.contacts.length && !email)
      contact.insertAdjacentHTML(
        "beforeend",
        '<p class="info-note">联系方式正在更新，欢迎稍后再来。</p>',
      );
    const extra = document.querySelector("[data-contact-extra]");
    if (extra && SITE_CONTENT.location) {
      const p = document.createElement("p");
      p.textContent = SITE_CONTENT.location;
      extra.append(p);
    }
    if (extra && UI.url(SITE_CONTENT.qrImage)) {
      const img = document.createElement("img");
      img.src = SITE_CONTENT.qrImage;
      img.alt = "团队公开联系二维码";
      img.width = 160;
      img.height = 160;
      extra.append(img);
    }
  }
  document.querySelectorAll("[data-faqs]").forEach((el) => {
    el.innerHTML = SITE_CONTENT.faqs
      .map(
        (f) =>
          `<details class="faq-item"><summary>${e(f.question)}<span aria-hidden="true">+</span></summary><p>${e(f.answer)}</p></details>`,
      )
      .join("");
  });
  // 产品中心的筛选、计数与地址同步由 products-page.js 单独初始化。
})();
