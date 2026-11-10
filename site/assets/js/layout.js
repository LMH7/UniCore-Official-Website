/* 公共布局与内容渲染工具。数据中的文本一律转义。 */
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
    if (/^(https?:\/\/|mailto:)/i.test(text)) return UI.escape(text);
    if (
      /^(?![\/\\])(?:[a-zA-Z0-9_.\/-]+)(?:[?#][a-zA-Z0-9_.%=&-]*)?$/.test(
        text,
      ) &&
      !text.includes("..")
    )
      return UI.escape(text);
    return "";
  },
  icon(name, size = 24) {
    const paths = {
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      chevron: '<path d="m6 9 6 6 6-6"/>',
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
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      zoom: '<circle cx="10" cy="10" r="6"/><path d="M10 7v6m-3-3h6m2 2 6 6"/>',
      share: '<path d="M12 16V3m-5 5 5-5 5 5M4 13v7h16v-7"/>',
      top: '<path d="m5 12 7-7 7 7M12 5v15"/>',
      linkedin:
        '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7m0-10v.1M11 17v-7m0 3c0-4 6-4 6 0v4"/>',
      wechat:
        '<path d="M13 15c-1 .5-2.4.8-3.8.8L5 18l1-3C1 12 2 5 9 4c4-.6 8 1.3 9 5M21 19l1 3-3-1c-6 1-10-3-8-7 2-5 10-4 12 0 1 2 0 4-2 5Z"/><path d="M7 9h.1m5 0h.1m3 7h.1m4 0h.1"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  },
};
window.LAYOUT_READY = (async () => {
  await SiteData.ready;
  const { escape: e, icon } = UI;
  const data = SITE_CONTENT;
  const page = document.body.dataset.page;
  const products = window.PRODUCTS || [];
  const menuLink = (href, title, text, iconName = "arrow", external = false) =>
    `<a class="nav-menu-item" href="${UI.url(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}><span class="nav-menu-icon">${icon(iconName, 18)}</span><span class="nav-menu-copy"><strong>${e(title)}</strong><small>${e(text)}</small></span></a>`;
  const productMenuItem = (p) =>
    menuLink(
      `product.html?id=${encodeURIComponent(p.id)}`,
      p.name,
      `${p.sensor} · ${p.summary}`,
      "layers",
    );
  const nav = [
    {
      id: "home",
      href: "index.html",
      label: "首页",
      menu: {
        eyebrow: "I/NEX",
        title: data.tagline,
        text: "面向科研与教育的自主空中机器人平台，从想法走向真实飞行实验。",
        moreHref: "index.html",
        moreLabel: "返回首页",
        items: [
          menuLink("products.html", "产品中心", "NEX 500 / 250 / 30 三款平台", "layers"),
          menuLink("solutions.html", "解决方案", "教育科研、自主探索与巡检、集群协同", "nodes"),
          menuLink("resources.html", "资源与支持", "公开学习资源与常见问题", "book"),
          menuLink("about.html", "关于我们", "团队、研究方向与联系", "mail"),
        ],
      },
    },
    {
      id: "products",
      href: "products.html",
      label: "产品中心",
      menu: {
        eyebrow: "NEX SERIES",
        title: "为研究而生的平台",
        text: "从激光雷达到深度视觉，选择适合研究方向的起点。",
        moreHref: "products.html",
        moreLabel: "查看全部产品",
        items: products.length
          ? products.slice(0, 3).map(productMenuItem)
          : [menuLink("products.html", "查看产品中心", "平台信息正在更新", "layers")],
      },
    },
    {
      id: "solutions",
      href: "solutions.html",
      label: "解决方案",
      menu: {
        eyebrow: "SOLUTIONS",
        title: "连接技术与真实问题",
        text: "从课程实践到科研探索，围绕具体研究需求讨论平台、算法与实验。",
        moreHref: "solutions.html",
        moreLabel: "查看全部方案",
        items: data.solutions.map((s) =>
          menuLink(`solutions.html#${s.id}`, s.title, s.summary, s.icon),
        ),
      },
    },
    {
      id: "resources",
      href: "resources.html",
      label: "资源与支持",
      menu: {
        eyebrow: "RESOURCES",
        title: "从这里，继续探索",
        text: "公开研究与通用学习入口，以及开始实验前的常见问题。",
        moreHref: "resources.html",
        moreLabel: "查看资源与支持",
        items: [
          ...(data.resources || []).map((r) =>
            menuLink(
              r.url,
              r.title,
              `${r.type} · ${r.description}`,
              r.icon || "book",
              /^https?:/i.test(r.url),
            ),
          ),
          menuLink("resources.html#faq-title", "常见问题", "选型、资料与联系方式", "check"),
        ],
      },
    },
    {
      id: "about",
      href: "about.html",
      label: "关于我们",
      menu: {
        eyebrow: "ABOUT I/NEX",
        title: "保持好奇，探索无界",
        text: data.mission,
        moreHref: "about.html",
        moreLabel: "了解团队",
        items: [
          menuLink("about.html", "团队介绍", data.tagline, "nodes"),
          menuLink("contact.html", "联系我们", "微信、LinkedIn 与合作交流", "mail"),
          menuLink("credits.html", "素材与开源说明", "第三方素材与许可记录", "book"),
        ],
      },
    },
  ];
  const menuHtml = (item) =>
    `<div class="nav-menu" id="nav-menu-${item.id}" role="group" aria-label="${e(item.label)}菜单"><div class="nav-menu-grid"><div class="nav-menu-aside"><span class="eyebrow">${e(item.menu.eyebrow)}</span><h3>${e(item.menu.title)}</h3><p>${e(item.menu.text)}</p><a class="nav-menu-more" href="${UI.url(item.menu.moreHref)}">${e(item.menu.moreLabel)} ${icon("arrow", 16)}</a></div><div class="nav-menu-list">${item.menu.items.join("")}</div></div></div>`;
  const brand = `<img class="brand-logo" src="${UI.url(data.logo)}" alt="${e(data.brand)} 联核智域" width="260" height="70"><span class="brand-caption">联核智域<span>INTELLIGENCE IN FLIGHT</span></span>`;
  const navHtml = nav
    .map((item, index) => {
      const active =
        page === item.id || (page === "product" && item.id === "products");
      const align = index >= nav.length - 2 ? " nav-menu-right" : "";
      return `<li class="nav-item nav-has-menu${align}"><a class="nav-link${active ? " active" : ""}" href="${item.href}"${active ? ' aria-current="page"' : ""} aria-expanded="false" aria-controls="nav-menu-${item.id}">${e(item.label)}<span class="nav-caret" aria-hidden="true">${icon("chevron", 13)}</span></a>${menuHtml(item)}</li>`;
    })
    .join("");
  document.getElementById("site-header").innerHTML =
    `<nav class="navbar navbar-expand-lg" aria-label="主导航"><div class="container"><a class="navbar-brand brand" href="index.html" aria-label="${e(data.name)}首页">${brand}</a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-navigation" aria-controls="main-navigation" aria-expanded="false" aria-label="展开导航菜单"><span class="menu-bars"></span></button><div class="collapse navbar-collapse" id="main-navigation"><ul class="navbar-nav ms-auto">${navHtml}</ul><button class="icon-button nav-search" type="button" data-open-search aria-label="搜索全站">${icon("search", 19)}</button><a class="btn btn-nav ${page === "contact" ? "active" : ""}" href="contact.html" ${page === "contact" ? 'aria-current="page"' : ""}>联系我们 ${icon("diagonal", 15)}</a></div></div></nav><div class="reading-progress" aria-hidden="true"></div>`;
  document.querySelectorAll(".nav-has-menu").forEach((item) => {
    const trigger = item.querySelector(".nav-link");
    let suppressFocus = false;
    const setOpen = (open) => {
      if (trigger) trigger.setAttribute("aria-expanded", String(open));
      item.classList.toggle("is-open", open);
    };
    item.addEventListener("mouseenter", () => setOpen(true));
    item.addEventListener("mouseleave", () => {
      if (!item.contains(document.activeElement)) setOpen(false);
    });
    item.addEventListener("focusin", () => {
      if (suppressFocus) {
        suppressFocus = false;
        return;
      }
      setOpen(true);
    });
    item.addEventListener("focusout", (event) => {
      if (!item.contains(event.relatedTarget)) setOpen(false);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        if (trigger && document.activeElement !== trigger) {
          suppressFocus = true;
          trigger.focus();
        }
      }
    });
  });
  document.getElementById("site-footer").innerHTML =
    `<div class="container"><div class="footer-top"><div><a class="brand footer-brand" href="index.html">${brand}</a><p>${e(data.tagline)}<br>让每一个研究想法，都有起飞的可能。</p><div class="footer-socials">${data.contacts.some((c) => c.id === "wechat") ? `<button class="icon-button" type="button" data-contact-qr="wechat" aria-label="查看微信二维码">${icon("wechat", 20)}</button>` : ""}${data.contacts
      .filter((c) => c.url && UI.url(c.url))
      .map(
        (c) =>
          `<a class="icon-button" href="${UI.url(c.url)}" target="_blank" rel="noopener noreferrer" aria-label="访问 ${e(c.label)}（新窗口）">${icon(c.icon, 19)}</a>`,
      )
      .join(
        "",
      )}</div></div><div class="footer-links"><div><span>探索 ${e(data.brand)}</span><a href="products.html">产品中心</a><a href="solutions.html">解决方案</a></div><div><span>与我们连接</span><a href="about.html">关于团队</a><a href="resources.html">资源与支持</a><a href="contact.html">联系我们</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${e(data.name)}</span><span>探索无界 · 智启未来</span><a href="credits.html">素材与开源说明</a></div></div>`;
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
