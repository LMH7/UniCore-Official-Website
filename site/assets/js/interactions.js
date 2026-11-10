/* 轻量交互：不依赖后端，不加载第三方追踪或 UI 服务。 */
window.INTERACTIONS_READY = (async () => {
  const state = await SiteData.ready;
  await Promise.all([
    window.LAYOUT_READY,
    window.APP_READY,
    window.PRODUCT_READY,
  ]);
  const { escape: e, icon, url } = UI;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const toast = document.createElement("div");
  toast.className = "site-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.append(toast);
  let toastTimer;
  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify("已复制，可以分享或粘贴。 ");
    } catch {
      notify("暂时无法自动复制，请选中内容或地址栏手动复制。");
    }
  }
  const dialog = document.createElement("dialog");
  dialog.className = "site-dialog";
  dialog.setAttribute("aria-labelledby", "dialog-title");
  document.body.append(dialog);
  function openDialog(title, content, type = "") {
    if (dialog.open) dialog.close();
    dialog.className = `site-dialog ${type}`;
    dialog.innerHTML = `<div class="dialog-header"><h2 id="dialog-title">${e(title)}</h2><button class="icon-button" type="button" data-close-dialog aria-label="关闭弹窗" autofocus>${icon("close", 22)}</button></div><div class="dialog-body">${content}</div>`;
    dialog.showModal();
    document.documentElement.classList.add("dialog-open");
    dialog
      .querySelector("[data-close-dialog]")
      .addEventListener("click", () => dialog.close());
  }
  dialog.addEventListener("close", () =>
    document.documentElement.classList.remove("dialog-open"),
  );
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
  function showContact(id) {
    const c = SITE_CONTENT.contacts.find((c) => c.id === id);
    if (!c) return;
    openDialog(
      c.name,
      `<div class="qr-dialog-content"><p>${e(c.description)}</p><img class="dialog-qr" src="${url(c.qrImage)}" alt="${e(c.label)}联系二维码" width="400" height="400"><p class="qr-tip">可使用另一台设备扫描，或保存原图后识别。</p><div class="dialog-actions"><a class="btn btn-primary" href="${url(c.qrImage)}" download="${e(c.downloadName)}">${icon("download", 18)} 保存二维码</a>${c.url && url(c.url) ? `<a class="btn btn-outline-primary" href="${url(c.url)}" target="_blank" rel="noopener noreferrer">访问 ${e(c.label)} ${icon("diagonal", 18)}</a>` : ""}</div></div>`,
      "qr-dialog",
    );
  }
  function openSearch() {
    openDialog(
      "搜索 iNEX",
      `<label class="search-field dialog-search-field">${icon("search", 21)}<input type="search" id="site-search" aria-label="输入全站搜索关键词" maxlength="200" placeholder="搜索产品、方案、资料…" autocomplete="off"></label><p class="search-hint">试试 NEX 500、深度相机、集群或科研。</p><p class="search-count" id="site-search-count" role="status" aria-live="polite"></p><div class="search-results" id="site-search-results"></div>`,
      "search-dialog",
    );
    const items = [
      ...PRODUCTS.map((p) => ({
        title: p.name,
        description: p.summary,
        category: "产品平台",
        href: `product.html?id=${encodeURIComponent(p.id)}`,
        terms: p.sensor + p.applications.join(" "),
      })),
      ...SITE_CONTENT.solutions.map((s) => ({
        title: s.title,
        description: s.summary,
        category: "解决方案",
        href: `solutions.html#${s.id}`,
        terms: s.topics.join(" "),
      })),
      ...SITE_CONTENT.resources.map((r) => ({
        title: r.title,
        description: r.description,
        category: "公开资源",
        href: "resources.html",
        terms: r.type,
      })),
      {
        title: "联系我们",
        description: "微信二维码、LinkedIn 与合作交流",
        category: "团队",
        href: "contact.html",
        terms: "微信 wechat linkedin 联系",
      },
      {
        title: "关于联核智域",
        description: SITE_CONTENT.intro,
        category: "团队",
        href: "about.html",
        terms: "iNEX 团队",
      },
    ];
    const input = document.getElementById("site-search");
    function render() {
      const query = input.value.trim().toLowerCase();
      const results = query
        ? items.filter((item) =>
            `${item.title} ${item.description} ${item.terms}`
              .toLowerCase()
              .includes(query),
          )
        : items.slice(0, 5);
      document.getElementById("site-search-count").textContent = query
        ? `找到 ${results.length} 项结果`
        : "热门入口";
      document.getElementById("site-search-results").innerHTML = results.length
        ? results
            .map(
              (item) =>
                `<a class="search-result" href="${url(item.href)}"><div><span class="micro-label">${e(item.category)}</span><h3>${e(item.title)}</h3><p>${e(item.description)}</p></div>${icon("arrow", 20)}</a>`,
            )
            .join("")
        : `<div class="search-no-results"><p>没有找到相关内容。试试其他关键词，或直接与我们交流。</p><a class="text-link" href="contact.html">联系我们 ${icon("arrow", 18)}</a></div>`;
    }
    input.addEventListener("input", render);
    render();
    input.focus();
  }
  document.addEventListener("click", (event) => {
    const qr = event.target.closest("[data-contact-qr]");
    if (qr) showContact(qr.dataset.contactQr);
    if (event.target.closest("[data-open-search]")) openSearch();
    const zoom = event.target.closest("[data-image-zoom]");
    if (zoom)
      openDialog(
        zoom.dataset.imageTitle,
        `<div class="image-dialog-stage"><img src="${url(zoom.dataset.imageZoom)}" alt="${e(zoom.dataset.imageTitle)}产品大图" width="760" height="570"></div><p class="zoom-note">按 Escape 或点击关闭返回。产品配置以实际沟通确认为准。</p>`,
        "image-dialog",
      );
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) copy(copyButton.dataset.copy);
    if (event.target.closest("[data-share-product]")) copy(location.href);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !dialog.open &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.target.closest("input,textarea,select,[contenteditable]")
    ) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === "Escape" && !dialog.open) {
      const nav = document.getElementById("main-navigation");
      if (nav.classList.contains("show")) {
        bootstrap.Collapse.getOrCreateInstance(nav).hide();
        document.querySelector(".navbar-toggler").focus();
      }
    }
  });
  if (document.body.dataset.page === "products") {
    const selected = new Set();
    const bar = document.getElementById("compare-bar");
    const open = document.getElementById("open-compare");
    const boxes = document.querySelectorAll("[data-compare-product]");
    function update() {
      bar.hidden = selected.size === 0;
      open.disabled = selected.size < 2;
      document.getElementById("compare-count").textContent =
        `已选 ${selected.size} 款${selected.size === 1 ? "，再选一款开始对比" : ""}`;
      boxes.forEach((box) => {
        box.checked = selected.has(box.value);
        box
          .closest(".product-card")
          .classList.toggle("is-compared", box.checked);
      });
    }
    boxes.forEach((box) =>
      box.addEventListener("change", () => {
        if (box.checked) {
          if (selected.size >= 3) {
            box.checked = false;
            notify("每次最多对比三款平台。");
            return;
          }
          selected.add(box.value);
        } else selected.delete(box.value);
        update();
      }),
    );
    document.getElementById("clear-compare").addEventListener("click", () => {
      selected.clear();
      update();
    });
    open.addEventListener("click", () => {
      const products = PRODUCTS.filter((p) => selected.has(p.id));
      if (products.length < 2) return;
      const row = (title, render) =>
        `<tr><th scope="row">${title}</th>${products.map((p) => `<td>${render(p)}</td>`).join("")}</tr>`;
      openDialog(
        "平台对比",
        `<p class="compare-intro">按已公开的平台信息对比。手机上可左右滑动表格。</p><div class="comparison-scroll" tabindex="0" role="region" aria-label="平台对比表，可左右滚动"><table class="comparison-table"><caption class="visually-hidden">NEX 平台型号、传感器及研究方向对比</caption><thead><tr><th scope="col">平台信息</th>${products.map((p) => `<th scope="col"><img src="${url(p.image)}" alt="${e(p.imageAlt)}" width="170" height="125"><a href="product.html?id=${encodeURIComponent(p.id)}">${e(p.name)}</a></th>`).join("")}</tr></thead><tbody>${row("传感器", (p) => e(p.sensor))}${row("平台介绍", (p) => e(p.summary))}${row("研究方向", (p) => p.applications.map(e).join("<br>"))}${row("进一步了解", (p) => `<a class="text-link" href="product.html?id=${encodeURIComponent(p.id)}">产品详情 ${icon("arrow", 16)}</a>`)}</tbody></table></div><p class="zoom-note">研究方向不代表性能承诺，具体配置与适用环境请向团队确认。</p>`,
        "compare-dialog",
      );
    });
  }
  const dock = document.createElement("div");
  dock.className = "floating-tools";
  dock.innerHTML = `${SITE_CONTENT.contacts.some((c) => c.id === "wechat") ? `<button class="tool-button" type="button" data-contact-qr="wechat" aria-label="微信联系">${icon("wechat", 22)}<span>微信联系</span></button>` : ""}<button class="tool-button back-to-top" type="button" aria-label="回到顶部" hidden>${icon("top", 21)}<span>回到顶部</span></button>`;
  document.body.append(dock);
  const top = dock.querySelector(".back-to-top");
  top.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reduced.matches ? "instant" : "smooth",
    });
    document.querySelector(".navbar-brand").focus({ preventScroll: true });
  });
  const progress = document.querySelector(".reading-progress");
  let ticking = false;
  function scroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    document
      .querySelector(".site-header")
      .classList.toggle("is-scrolled", scrollY > 16);
    top.hidden = scrollY < 450;
    ticking = false;
  }
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(scroll);
      }
    },
    { passive: true },
  );
  addEventListener("resize", scroll);
  scroll();
  const revealTargets = document.querySelectorAll(
    ".section-heading,.product-card,.solution-card,.resource-card,.about-grid,.cta-panel,.solution-detail,.contact-channel,.value-grid>article,.faq-section,.related-card",
  );
  if (!reduced.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06 },
    );
    revealTargets.forEach((el) => {
      el.classList.add("reveal-ready");
      observer.observe(el);
    });
    reduced.addEventListener("change", () => {
      if (reduced.matches) {
        revealTargets.forEach((el) => el.classList.add("is-visible"));
        observer.disconnect();
      }
    });
  }
  const hero = document.querySelector(".hero-visual");
  if (hero && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    hero.addEventListener("pointermove", (event) => {
      if (reduced.matches) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty(
        "--pointer-x",
        `${(event.clientX - r.left - r.width / 2) / 40}px`,
      );
      hero.style.setProperty(
        "--pointer-y",
        `${(event.clientY - r.top - r.height / 2) / 40}px`,
      );
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--pointer-x", "0px");
      hero.style.setProperty("--pointer-y", "0px");
    });
  }
  const solutionSections = document.querySelectorAll(".solution-detail[id]");
  if (solutionSections.length) {
    const subnav = document.createElement("nav");
    subnav.className = "solution-subnav";
    subnav.setAttribute("aria-label", "方案快捷导航");
    subnav.innerHTML = SITE_CONTENT.solutions
      .map((s) => `<a href="#${e(s.id)}">${e(s.title)}</a>`)
      .join("");
    document.querySelector("[data-full-solutions]").before(subnav);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            subnav.querySelectorAll("a").forEach((a) => {
              if (a.hash === "#" + entry.target.id)
                a.setAttribute("aria-current", "location");
              else a.removeAttribute("aria-current");
            });
        }),
      { rootMargin: "-100px 0px -45% 0px", threshold: 0 },
    );
    solutionSections.forEach((s) => observer.observe(s));
    const initial = SITE_CONTENT.solutions.find(
      (s) => location.hash === "#" + s.id,
    );
    if (initial)
      requestAnimationFrame(() =>
        document
          .getElementById(initial.id)
          .scrollIntoView({ behavior: "instant" }),
      );
  }
  // 关于页左侧索引：滚动到对应板块时高亮当前条目（仅关于页存在 .about-index 时启用）
  const aboutIndex = document.querySelector(".about-index");
  if (aboutIndex) {
    const aboutLinks = aboutIndex.querySelectorAll('a[href^="#"]');
    const aboutTargets = document.querySelectorAll(
      "#who, #direction, #supporting-labs, #publications, #contact",
    );
    if (aboutLinks.length && aboutTargets.length) {
      const aboutObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting)
              aboutLinks.forEach((a) => {
                if (a.hash === "#" + entry.target.id)
                  a.setAttribute("aria-current", "location");
                else a.removeAttribute("aria-current");
              });
          }),
        { rootMargin: "-110px 0px -55% 0px", threshold: 0 },
      );
      aboutTargets.forEach((s) => aboutObserver.observe(s));
    }
  }
  if (state.fallback) {
    const banner = document.createElement("p");
    banner.className = "content-fallback";
    banner.setAttribute("role", "status");
    banner.textContent = "最新内容暂时无法获取，当前展示已保存的版本。";
    document.getElementById("main").prepend(banner);
  }
})();
