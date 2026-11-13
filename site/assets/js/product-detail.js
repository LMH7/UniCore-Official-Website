/* 共用产品详情模板。
   所有产品共用 site/product.html，通过 ?id= 选择记录；本文件不写死任何产品内容，
   数据只来自 site/assets/js/products.js（window.PRODUCTS）。
   区块顺序按规划 §3.2：名称与返回 → 主图与简介 → 特点 → 参数 → 应用 → 演示 →
   文档资料 → 联系入口。
   缺失字段、图片失败、错误 id 都有兜底，不编造参数、不生成假下载。 */
window.PRODUCT_READY = (async () => {
  const target = document.getElementById("product-detail");
  if (!target) return;
  await SiteData.ready;

  const { escape: e, icon, url } = UI;
  const PLACEHOLDER_IMAGE =
    "assets/images/product-placeholder.svg";
  const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  const rawId = new URLSearchParams(location.search).get("id");
  const product = rawId
    ? products.find((item) => item.id === rawId) || null
    : null;

  /* 元信息：只改本页的 title/description/og，不动公共模板。 */
  const setMeta = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute("content", value);
  };
  const absolute = (value) => {
    try {
      return new URL(value, location.href).href;
    } catch {
      return "";
    }
  };
  const setCanonical = (value) => {
    const link = document.querySelector('link[rel="canonical"]');
    if (link) link.href = value;
  };
  const markNoindex = () => {
    if (document.querySelector('meta[name="robots"]')) return;
    const robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    robots.setAttribute("content", "noindex, nofollow");
    document.head.append(robots);
  };
  const setDescription = (text) => {
    setMeta('meta[name="description"]', text);
    setMeta('meta[property="og:description"]', text);
  };

  /* 资料位固定四项。没有真实文件时仍可点击，但跳转到资源与支持页，
     由该页说明资料获取方式；不生成空地址或假的下载链接。 */
  const RESOURCE_SLOTS = [
    { title: "快速入门指南", icon: "book", tone: "doc" },
    { title: "用户手册", icon: "book", tone: "doc" },
    { title: "SDK 与代码仓库", icon: "layers", tone: "code" },
    { title: "软件安装包", icon: "download", tone: "pkg" },
  ];

  const renderResourceSlot = (slot) =>
    `<a class="resource-item resource-item--${slot.tone || "doc"} is-pending" href="resources.html" data-placeholder="${e(slot.title)}" aria-label="${e(slot.title)}：资料待补充，前往资源与支持"><span class="resource-item-icon">${icon(slot.icon, 20)}</span><span class="resource-item-text"><strong>${e(slot.title)}</strong><span>资料待补充</span><span class="resource-meta">前往资源与支持</span></span>${icon("arrow", 16)}</a>`;

  const resourceTone = (item) => {
    const href = String(item.url || "");
    if (/github\.com|gitlab\.com/i.test(href)) return "code";
    if (/\.(zip|exe|msi|dmg|7z|tar\.gz)$/i.test(href)) return "pkg";
    return "doc";
  };

  const renderResourceLink = (item) => {
    const href = url(item.url);
    if (!href)
      return renderResourceSlot({
        title: item.title || "资料待补充",
        icon: "book",
        tone: "doc",
      });
    return `<a class="resource-item resource-item--${resourceTone(item)}" href="${href}" target="_blank" rel="noopener noreferrer"><span class="resource-item-icon">${icon("download", 20)}</span><span class="resource-item-text"><strong>${e(item.title)}</strong><span>在新窗口打开<span class="visually-hidden">（新窗口）</span></span><span class="resource-meta">${item.updated ? `更新 ${e(item.updated)}` : "版本 / 更新日期待登记"}</span></span></a>`;
  };

  const renderNotFound = () => {
    const reason = rawId
      ? `产品地址中的编号“${e(rawId.slice(0, 60))}”没有对应记录，可能已更新或填写有误。`
      : "产品地址缺少产品编号（?id=），请从产品中心重新选择平台。";
    document.title = "未找到产品 · 产品中心 · iNEX 联核智域";
    setMeta('meta[property="og:title"]', "未找到产品 · iNEX 联核智域");
    setDescription("产品地址无效或对应记录已更新，请返回产品中心重新选择平台。");
    setCanonical(absolute("products.html"));
    markNoindex();
    target.innerHTML = `<div class="container"><div class="empty-state"><span class="eyebrow">PRODUCT NOT FOUND</span><h1>未找到该产品</h1><p>${reason}</p><a class="btn btn-primary" href="products.html">返回产品中心 ${icon("arrow", 18)}</a>${
      products.length
        ? `<div class="detail-suggest"><span class="micro-label">推荐先看看</span><div class="suggest-links">${products
            .slice(0, 2)
            .map(
              (item) =>
                `<a class="suggest-link" href="product.html?id=${encodeURIComponent(item.id)}">${e(item.name)}<span>${e(item.sensor)}</span></a>`,
            )
            .join("")}</div></div>`
        : ""
    }</div></div>`;
  };

  const renderProduct = (p) => {
    const features =
      Array.isArray(p.features) && p.features.length
        ? p.features.slice(0, 6)
        : [{ title: "平台特点待补充", text: "建议补充 3 条，每条 20—40 字，说明平台定位与实验价值。" }];
    const specs = Array.isArray(p.specs) ? p.specs : [];
    const applications = Array.isArray(p.applications) ? p.applications : [];
    const applicationSolutions = Array.isArray(p.applicationSolutions)
      ? p.applicationSolutions
      : [];
    const solutionIds = new Set(
      (window.SITE_CONTENT?.solutions || []).map((item) => item.id),
    );
    const applicationHref = (index) => {
      const solutionId = applicationSolutions[index];
      return typeof solutionId === "string" && solutionIds.has(solutionId)
        ? `solutions.html#${encodeURIComponent(solutionId)}`
        : "solutions.html";
    };
    const resources = Array.isArray(p.resources) ? p.resources : [];
    const image = url(p.image) || PLACEHOLDER_IMAGE;
    // 参数按“平台 / 感知 / 飞行”分组；没有 group 字段时统一落在“平台”组
    const specRows = specs.length
      ? specs
      : [
          { group: "平台", label: "平台型号", value: p.name },
          { group: "感知", label: "传感器类型", value: p.sensor },
        ];
    const specPending = specRows.filter((s) =>
      /待确认|待补充/.test(s.value),
    ).length;
    const specGroupOrder = ["平台", "感知", "飞行"];
    const specGroups = [...new Set(specRows.map((s) => s.group || "平台"))]
      .sort(
        (a, b) =>
          (specGroupOrder.indexOf(a) + 1 || 99) -
          (specGroupOrder.indexOf(b) + 1 || 99),
      )
      .map((name) => ({
        name,
        rows: specRows.filter((s) => (s.group || "平台") === name),
      }));
    const related = products
      .filter((item) => item.id !== p.id)
      .slice(0, 2)
      .map(
        (item) =>
          `<a class="related-card" href="product.html?id=${encodeURIComponent(item.id)}"><img src="${url(item.image) || PLACEHOLDER_IMAGE}" alt="${e(item.imageAlt || item.name)}" width="160" height="120"><div><span class="micro-label">${e(item.sensor)}</span><h3>${e(item.name)}</h3></div>${icon("arrow", 20)}</a>`,
      )
      .join("");

    document.title = `${p.name} · 产品中心 · iNEX 联核智域`;
    setMeta('meta[property="og:title"]', document.title);
    setDescription(p.summary);
    setMeta('meta[property="og:image"]', absolute(image));
    setMeta('meta[property="og:image:alt"]', `${p.name} 产品图`);
    const canonical = absolute(`product.html?id=${encodeURIComponent(p.id)}`);
    setCanonical(canonical);
    setMeta('meta[property="og:url"]', canonical);


    target.innerHTML = `<div class="container">
      <div class="detail-toolbar">
        <nav class="breadcrumbs" aria-label="当前位置"><a href="home.html">首页</a><span>/</span><a href="products.html">产品中心</a><span>/</span><span>${e(p.series || "NEX 系列")}</span><span>/</span><span aria-current="page">${e(p.name)}</span></nav>
        <a class="detail-back" href="products.html">${icon("arrow", 16)}<span>返回产品中心</span></a>
      </div>
      <div class="product-detail-grid">
        <div class="product-detail-image">
          <span class="image-caption">NEX SERIES · ${e(p.subtitle)}</span>
          <button class="product-zoom" type="button" data-image-zoom="${image}" data-image-title="${e(p.name)}" aria-label="放大 ${e(p.name)} 产品图"><img src="${image}" alt="${e(p.imageAlt || p.name)}" width="560" height="420"><span class="zoom-hint">${icon("zoom", 17)} 查看大图</span></button>
          <span class="product-image-note">产品配置与外观以实际沟通确认为准</span>
          <span class="image-fallback-note" hidden>产品图待补充，当前显示统一占位图。</span>
        </div>
        <div class="product-detail-copy">
          <span class="eyebrow">自主空中机器人平台</span>
          <h1>${e(p.name)}</h1>
          <span class="sensor-tag">${e(p.sensor)}</span>
          <ul class="detail-facts" aria-label="平台速览">
            <li><span>平台方向</span><strong>${e(p.subtitle)}</strong></li>
            <li><span>研究方向</span><strong>${applications.length ? `${applications.length} 个` : "待补充"}</strong></li>
            <li><span>资料状态</span><strong>${resources.length ? `${resources.length} 份` : "待补充"}</strong></li>
          </ul>
          <p class="lead-text">${e(p.summary)}</p>
          <p>${e(p.description)}</p>
          <div class="detail-actions">
            <a class="btn btn-primary" href="contact.html?product=${encodeURIComponent(p.id)}">咨询平台 ${icon("diagonal", 18)}</a>
            <a class="btn btn-outline-primary" href="products.html">查看其他平台</a>
            <button class="icon-button share-product" type="button" data-share-product aria-label="分享 ${e(p.name)}">${icon("share", 20)}</button>
          </div>
        </div>
      </div>

      <section class="detail-section" id="product-features">
        <div class="detail-section-head"><span class="section-index" aria-hidden="true">01</span><span class="eyebrow">PLATFORM FEATURES</span><h2>平台特点</h2><p>以下特点按平台定位整理，具体配置以沟通确认为准。</p></div>
        <div class="feature-grid">${features
          .map(
            (feature, index) =>
              `<article class="feature-card" data-placeholder="平台特点">${`<span class="feature-index">${String(index + 1).padStart(2, "0")}</span>`}<h3>${e(feature.title)}</h3><p>${e(feature.text)}</p></article>`,
          )
          .join("")}</div>
      </section>

      <section class="detail-section" id="product-specs">
        <div class="detail-section-head"><span class="section-index" aria-hidden="true">02</span><span class="eyebrow">SPECIFICATIONS</span><h2>平台参数</h2><p class="section-meta">共 ${specRows.length} 项参数${specPending ? ` · ${specPending} 项待确认` : ""}</p></div>
        <div class="spec-groups">${specGroups
          .map(
            (group, index) =>
              `<details class="spec-group" data-group="${e(group.name)}" open><summary><span class="spec-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h3>${e(group.name)}</h3></summary><dl class="spec-list">${group.rows
                .map(
                  (spec) =>
                    `<div><dt>${e(spec.label)}</dt><dd class="${/待确认|待补充/.test(spec.value) ? "is-pending" : ""}"${/待确认|待补充/.test(spec.value) ? ' data-placeholder="参数待确认"' : ""}>${e(spec.value)}</dd></div>`,
                )
                .join("")}</dl></details>`,
          )
          .join("")}</div>
      </section>

      <section class="detail-section" id="product-applications">
        <div><span class="section-index" aria-hidden="true">03</span><span class="eyebrow">RESEARCH DIRECTIONS</span><h2>探索研究方向</h2><p>以下为研究方向建议，具体能力需按实验需求确认。</p></div>
        <div class="direction-list">${applications
          .map(
            (item, index) =>
              `<a class="direction-item" href="${applicationHref(index)}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${e(item)}</h3>${icon("diagonal", 22)}</a>`,
          )
          .join("")}</div>
      </section>

      <section class="detail-section" id="product-demo">
        <div><span class="section-index" aria-hidden="true">04</span><span class="eyebrow">PLATFORM IN FLIGHT</span><h2>演示视频</h2><p>视频完成后在此播放；当前区域为固定比例预留位。</p></div>
        ${
          p.video && url(p.video)
            ? `<div class="video-frame"><video controls preload="none" playsinline src="${url(p.video)}"></video></div>`
            : `<div class="video-slot" role="group" aria-label="演示视频待补充" data-placeholder="演示视频"><span class="video-slot-corner">16:9 · 待接入</span><span class="video-slot-mark">${icon("scan", 30)}</span><strong>演示视频待补充</strong><span>建议 16:9，航拍与实验场景各 30—60 秒。未接入视频时不提供播放按钮。</span></div>`
        }
      </section>

      <section class="detail-section" id="product-resources">
        <div><span class="section-index" aria-hidden="true">05</span><span class="eyebrow">DOCUMENTS</span><h2>文档与资料</h2><p>资料待补充时先前往资源与支持；取得文件后在此直接下载。</p></div>
        <div>
          <div class="resource-placeholder-list">${(resources.length
            ? resources.map(renderResourceLink)
            : RESOURCE_SLOTS.map(renderResourceSlot)
          ).join("")}</div>
          <p class="resource-more"><span>相关论文与数据集</span><a href="publications.html">前往学术成果 ${icon("arrow", 16)}</a></p>
        </div>
      </section>

      <div class="detail-contact">
        <div><span class="eyebrow">NEXT STEP</span><h2>让这款平台进入你的实验</h2><p>说明研究目标与实验条件，我们会给出平台与配置建议。</p></div>
        <div class="detail-contact-actions"><a class="btn btn-primary" href="contact.html?product=${encodeURIComponent(p.id)}">聊聊这款平台 ${icon("diagonal", 18)}</a></div>
      </div>

      ${
        related
          ? `<section class="related-products" id="product-related"><span class="eyebrow">MORE PLATFORMS</span><h2>其他平台</h2><div class="related-grid">${related}</div></section>`
          : ""
      }

    </div>`;

    /* 图片失败时换本地占位图；每次只回退一次，避免循环。 */
    const imageEl = target.querySelector(".product-zoom img");
    if (imageEl) {
      imageEl.addEventListener("error", () => {
        if (imageEl.dataset.fallback === "done") return;
        imageEl.dataset.fallback = "done";
        imageEl.src = PLACEHOLDER_IMAGE;
        imageEl.closest(".product-zoom")?.setAttribute("data-image-zoom", PLACEHOLDER_IMAGE);
        imageEl.classList.add("is-placeholder");
        imageEl.alt = `${p.name} 产品图待补充`;
        target.querySelector(".product-image-note")?.setAttribute("hidden", "");
        const note = target.querySelector(".image-fallback-note");
        if (note) note.hidden = false;
      });
      if (imageEl.complete && imageEl.naturalWidth === 0)
        imageEl.dispatchEvent(new Event("error"));
    }
    target.querySelectorAll(".related-card img").forEach((image) => {
      const fallback = () => {
        if (image.dataset.fallback === "done") return;
        image.dataset.fallback = "done";
        image.src = PLACEHOLDER_IMAGE;
        image.classList.add("is-placeholder");
      };
      image.addEventListener("error", fallback);
      if (image.complete && image.naturalWidth === 0) fallback();
    });

    /* 手机端默认收起“飞行”参数组，避免首屏之后就一大段表格 */
    const flightGroup = target.querySelector('.spec-group[data-group="飞行"]');
    if (flightGroup && matchMedia("(max-width: 767px)").matches)
      flightGroup.open = false;
  };

  if (product) renderProduct(product);
  else renderNotFound();
})();
