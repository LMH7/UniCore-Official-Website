/* A 提供基础呈现；B 维护产品模块，C 维护其他栏目。 */
(() => {
  const { escape: e, icon } = UI;
  const card = (p) =>
    `<article class="product-card"><a class="product-image" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="查看 ${e(p.name)}"><span class="image-caption">NEX SERIES</span><img src="${UI.url(p.image)}" alt="${e(p.imageAlt)}" width="560" height="420" loading="lazy"></a><div class="product-card-body"><div class="product-card-heading"><h3><a href="product.html?id=${encodeURIComponent(p.id)}">${e(p.name)}</a></h3><span class="sensor-tag">${e(p.sensor)}</span></div><p>${e(p.summary)}</p><a class="text-link" href="product.html?id=${encodeURIComponent(p.id)}">探索产品 ${icon("arrow", 18)}</a></div></article>`;
  document.querySelectorAll("[data-products]").forEach((el) => {
    el.innerHTML = PRODUCTS.map(card).join("");
  });
  document.querySelectorAll("[data-solutions]").forEach((el) => {
    el.innerHTML = SITE_CONTENT.solutions
      .map(
        (s) =>
          `<article class="solution-card"><div class="solution-icon">${icon(s.icon, 30)}<span>${e(s.number)}</span></div><span class="micro-label">${e(s.english)}</span><h3>${e(s.title)}</h3><p>${e(s.summary)}</p><a class="text-link" href="solutions.html#${e(s.id)}">了解方案 ${icon("arrow", 18)}</a></article>`,
      )
      .join("");
  });
  const fullSolutions = document.querySelector("[data-full-solutions]");
  if (fullSolutions)
    fullSolutions.innerHTML = SITE_CONTENT.solutions
      .map(
        (s) =>
          `<section class="solution-detail" id="${e(s.id)}"><div class="solution-detail-visual solution-${e(s.id)}"><span class="large-number">${e(s.number)}</span><div class="solution-orbit">${icon(s.icon, 90)}</div><span class="micro-label">${e(s.english)}</span></div><div class="solution-detail-copy"><span class="eyebrow">应用方向 / ${e(s.number)}</span><h2>${e(s.title)}</h2><p class="lead-text">${e(s.summary)}</p><p>${e(s.description)}</p><div class="tags">${s.topics.map((t) => `<span>${e(t)}</span>`).join("")}</div><div class="audience"><span>面向人群</span><p>${e(s.audience)}</p></div><a class="text-link" href="contact.html">讨论你的研究需求 ${icon("arrow", 18)}</a></div></section>`,
      )
      .join("");
  const resources = document.querySelector("[data-resources]");
  if (resources)
    resources.innerHTML = SITE_CONTENT.resources
      .map(
        (r) =>
          `<article class="resource-card"><span class="resource-icon">${icon("book", 28)}</span><span class="micro-label">${e(r.type)}</span><h2>${e(r.title)}</h2><p>${e(r.description)}</p><a class="text-link" href="${UI.url(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.label)} ${icon("diagonal", 18)}<span class="visually-hidden">（新窗口打开）</span></a></article>`,
      )
      .join("");
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
      document.getElementById("hero-model").textContent = p.name;
      document.getElementById("hero-sensor").textContent = p.subtitle;
      document.getElementById("hero-product-link").href =
        `product.html?id=${encodeURIComponent(p.id)}`;
    }),
  );
  const contact = document.querySelector("[data-contact]");
  if (contact) {
    const email = SITE_CONTENT.email.trim();
    contact.innerHTML = email
      ? `<div class="contact-icon">${icon("mail", 32)}</div><span class="eyebrow">联系邮箱</span><h2>一起，让想法起飞。</h2><p>欢迎交流产品选型、科研实验与合作需求。</p><a class="contact-email" href="mailto:${encodeURIComponent(email)}">${e(email)}</a><button class="btn btn-primary" id="copy-email" type="button">${icon("copy", 18)} 复制邮箱</button><p class="copy-status" role="status" aria-live="polite"></p>`
      : `<div class="contact-icon">${icon("mail", 32)}</div><span class="eyebrow">与 NEXCORE 连接</span><h2>一起，让想法起飞。</h2><p>欢迎围绕产品选型、科研实验和技术合作与我们交流。</p><div class="contact-pending"><span class="status-dot"></span>官方联系方式即将公布</div><p class="contact-note">感谢你的关注，欢迎先了解我们的平台与研究方向。</p><a class="text-link" href="products.html">先探索产品 ${icon("arrow", 18)}</a>`;
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
})();
