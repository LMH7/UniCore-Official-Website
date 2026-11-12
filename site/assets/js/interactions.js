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
    ".section-heading,.product-card,.solution-card,.resource-card,.about-grid,.cta-panel,.contact-channel,.value-grid>article,.faq-section,.related-card",
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
      const bounds = el.getBoundingClientRect();
      // 当前已可见的内容保持可见，避免先显示再被脚本隐藏造成闪烁。
      if (bounds.top < innerHeight && bounds.bottom > 0) return;
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
  // 各栏目页左侧索引：滚动到对应板块时高亮当前条目（存在 .page-index 时启用）
  document.querySelectorAll(".page-index").forEach((indexEl) => {
    const links = indexEl.querySelectorAll('a[href^="#"]');
    const targets = Array.from(links)
      .map((a) => document.getElementById(a.hash.slice(1)))
      .filter(Boolean);
    if (!links.length || !targets.length) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            links.forEach((a) => {
              if (a.hash === "#" + entry.target.id)
                a.setAttribute("aria-current", "location");
              else a.removeAttribute("aria-current");
            });
        }),
      { rootMargin: "-110px 0px -55% 0px", threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
    // 接近页底时点亮最后一个条目：末尾板块可能进不到监听判定区域
    const lastLink = links[links.length - 1];
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (nearBottom)
        links.forEach((a) => {
          if (a === lastLink) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    // 避让页脚：滚到底部时侧边栏自动上移，避免遮挡页脚内容（仅 fixed 桌面端需要）
    if (getComputedStyle(indexEl).position === "fixed") {
      const footer = document.querySelector(".site-footer");
      if (footer) {
        const avoidFooter = () => {
          const fr = footer.getBoundingClientRect();
          const r = indexEl.getBoundingClientRect();
          const gap = 16;
          const shift =
            fr.top < r.bottom + gap && fr.top > r.top
              ? r.bottom + gap - fr.top
              : 0;
          indexEl.style.marginTop = shift ? `${-shift}px` : "";
        };
        window.addEventListener("scroll", avoidFooter, { passive: true });
        window.addEventListener("resize", avoidFooter);
        avoidFooter();
      }
    }
  });
  function initHeroWave() {
    const canvas = document.getElementById("hero-wave");
    const heroEl = canvas?.closest(".hero");
    if (!canvas || !heroEl) return;
    if (reduced.matches || !matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    let phase = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const trail = [];
    const colors = [
      [20, 101, 232],
      [0, 195, 237],
      [123, 108, 255],
    ];
    const layers = [
      { color: colors[0], alpha: 0.13, base: 0.56, amp: 30, freq: 0.0055, speed: 0.18, offset: 0 },
      { color: colors[1], alpha: 0.11, base: 0.68, amp: 38, freq: 0.0042, speed: 0.24, offset: 1.8 },
      { color: colors[2], alpha: 0.1, base: 0.8, amp: 26, freq: 0.0062, speed: 0.14, offset: 3.6 },
    ];

    function resize() {
      const rect = heroEl.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pointer.active) {
        pointer.x = pointer.tx = width * 0.72;
        pointer.y = pointer.ty = height * 0.56;
      }
    }

    function onPointer(event) {
      const rect = heroEl.getBoundingClientRect();
      pointer.tx = event.clientX - rect.left;
      pointer.ty = event.clientY - rect.top;
      pointer.active = true;
      const head = trail[0];
      if (!head || Math.hypot(pointer.tx - head.x, pointer.ty - head.y) > 18) {
        trail.unshift({ x: pointer.tx, y: pointer.ty, life: 1 });
        if (trail.length > 12) trail.pop();
      }
    }

    function glow(x, y, radius, color, alpha) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(
        0,
        `rgba(${color[0]},${color[1]},${color[2]},${alpha})`,
      );
      gradient.addColorStop(
        0.5,
        `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.45})`,
      );
      gradient.addColorStop(
        1,
        `rgba(${color[0]},${color[1]},${color[2]},0)`,
      );
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function ribbon(layer, time) {
      const { color, alpha, base, amp, freq, speed, offset } = layer;
      const points = [];
      for (let x = -60; x <= width + 60; x += 14) {
        const wave =
          Math.sin(x * freq + time * speed + offset) * amp +
          Math.sin(x * freq * 0.55 + time * speed * 1.6 + offset * 1.4) *
            amp *
            0.42;
        const distance = (x - pointer.x) / (width * 0.28);
        const lift = pointer.active
          ? (pointer.y - height * base) *
            0.14 *
            Math.exp(-(distance * distance))
          : 0;
        points.push([x, height * base + wave + lift]);
      }
      const top = height * base - amp * 3;
      const bottom = height * base + amp * 4;
      const gradient = ctx.createLinearGradient(0, top, 0, bottom);
      gradient.addColorStop(
        0,
        `rgba(${color[0]},${color[1]},${color[2]},0)`,
      );
      gradient.addColorStop(
        0.38,
        `rgba(${color[0]},${color[1]},${color[2]},${alpha})`,
      );
      gradient.addColorStop(
        1,
        `rgba(${color[0]},${color[1]},${color[2]},0)`,
      );
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0][0], height + 80);
      for (const [x, y] of points) ctx.lineTo(x, y);
      ctx.lineTo(points[points.length - 1][0], height + 80);
      ctx.closePath();
      ctx.fill();
    }

    function frame(now) {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      if (!pointer.active) {
        pointer.tx = width * 0.72 + Math.sin(now * 0.00022) * width * 0.06;
        pointer.ty = height * 0.56 + Math.cos(now * 0.00017) * height * 0.05;
      }
      pointer.x += (pointer.tx - pointer.x) * Math.min(0.18, 0.055 * dt);
      pointer.y += (pointer.ty - pointer.y) * Math.min(0.18, 0.055 * dt);
      phase += dt * 0.016;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (let i = trail.length - 1; i >= 0; i--) {
        const point = trail[i];
        point.life *= 0.955;
        if (point.life < 0.04) trail.splice(i, 1);
        else glow(point.x, point.y, 120 + i * 14, colors[1], 0.045 * point.life);
      }
      const unit = Math.min(width, height);
      glow(pointer.x, pointer.y, unit * 0.46, colors[0], 0.13);
      glow(
        pointer.x + Math.sin(phase * 1.4) * 44,
        pointer.y + Math.cos(phase * 0.9) * 30,
        unit * 0.36,
        colors[2],
        0.09,
      );
      glow(pointer.x - 70, pointer.y + 55, unit * 0.3, colors[1], 0.07);
      for (const layer of layers) ribbon(layer, now * 0.001);
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    heroEl.addEventListener("pointermove", onPointer, { passive: true });
    heroEl.addEventListener("pointerleave", () => {
      pointer.active = false;
    });
    if ("ResizeObserver" in window)
      new ResizeObserver(resize).observe(heroEl);
    else addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        },
        { threshold: 0 },
      ).observe(heroEl);
    } else start();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (visible) start();
    });
    reduced.addEventListener("change", () => {
      if (reduced.matches) {
        stop();
        ctx.clearRect(0, 0, width, height);
      } else if (visible) start();
    });
    start();
  }
  initHeroWave();
  if (state.fallback) {
    const banner = document.createElement("p");
    banner.className = "content-fallback";
    banner.setAttribute("role", "status");
    banner.textContent = "最新内容暂时无法获取，当前展示已保存的版本。";
    document.getElementById("main").prepend(banner);
  }
})();
