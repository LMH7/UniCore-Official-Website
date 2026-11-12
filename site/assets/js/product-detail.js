window.PRODUCT_READY = (async () => {
  await SiteData.ready;
  const target = document.getElementById("product-detail");
  if (!target) return;
  const { escape: e, icon } = UI;
  const id = new URLSearchParams(window.location.search).get("id");
  const p = PRODUCTS.find((item) => item.id === id);
  if (!p) {
    document.title = "未找到产品 · iNEX 联核智域";
    target.innerHTML = `<div class="empty-state"><span class="eyebrow">PRODUCT NOT FOUND</span><h1>未找到该产品</h1><p>产品地址可能有误，请返回产品中心重新选择。</p><a class="btn btn-primary" href="products.html">返回产品中心 ${icon("arrow", 18)}</a></div>`;
    return;
  }
  document.title = `${p.name} · 产品中心 · iNEX 联核智域`;
  document.querySelector('meta[name="description"]').content = p.summary;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = p.summary;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical)
    canonical.href = new URL(
      `product.html?id=${encodeURIComponent(p.id)}`,
      canonical.href,
    ).href;
  target.innerHTML = `<div class="container"><nav class="breadcrumbs" aria-label="当前位置"><a href="home.html">首页</a><span>/</span><a href="products.html">产品中心</a><span>/</span><span aria-current="page">${e(p.name)}</span></nav><div class="product-detail-grid"><div class="product-detail-image"><span class="image-caption">NEX SERIES · ${e(p.subtitle)}</span><button class="product-zoom" type="button" data-image-zoom="${UI.url(p.image)}" data-image-title="${e(p.name)}" aria-label="放大 ${e(p.name)} 产品图"><img src="${UI.url(p.image)}" alt="${e(p.imageAlt)}" width="560" height="420"><span class="zoom-hint">${icon("zoom", 17)} 查看大图</span></button><span class="product-image-note">产品配置与外观以实际沟通确认为准</span></div><div class="product-detail-copy"><span class="eyebrow">自主空中机器人平台</span><h1>${e(p.name)}</h1><span class="sensor-tag">${e(p.sensor)}</span><p class="lead-text">${e(p.summary)}</p><p>${e(p.description)}</p><div class="detail-actions"><a class="btn btn-primary" href="contact.html?product=${encodeURIComponent(p.id)}">咨询平台 ${icon("diagonal", 18)}</a><a class="btn btn-outline-primary" href="products.html">查看其他平台</a><button class="icon-button share-product" type="button" data-share-product aria-label="分享 ${e(p.name)}">${icon("share", 20)}</button></div></div></div><section class="detail-section"><div><span class="eyebrow">PLATFORM OVERVIEW</span><h2>平台信息</h2><p>进一步配置与技术资料，欢迎联系团队交流。</p></div><dl class="spec-list">${p.specs.map((s) => `<div><dt>${e(s.label)}</dt><dd>${e(s.value)}</dd></div>`).join("")}</dl></section><section class="detail-section"><div><span class="eyebrow">RESEARCH DIRECTIONS</span><h2>探索研究方向</h2><p>以下为研究方向建议，具体能力需按实验需求确认。</p></div><div class="direction-list">${p.applications.map((s, i) => `<div><span>0${i + 1}</span><h3>${e(s)}</h3>${icon("diagonal", 22)}</div>`).join("")}</div></section>${p.resources.length ? `<section class="detail-section"><h2>相关资料</h2><div>${p.resources.map((r) => `<a class="text-link" href="${UI.url(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.title)} ${icon("diagonal", 18)}</a>`).join("")}</div></section>` : ""}<section class="related-products"><div class="section-heading"><div><span class="eyebrow">KEEP EXPLORING</span><h2>继续探索其他平台</h2></div><a class="text-link" href="products.html">查看全部 ${icon("arrow", 18)}</a></div><div class="related-grid">${PRODUCTS.filter(
    (item) => item.id !== p.id,
  )
    .map(
      (item) =>
        `<a class="related-card" href="product.html?id=${encodeURIComponent(item.id)}"><img src="${UI.url(item.image)}" alt="${e(item.imageAlt)}" width="160" height="120" loading="lazy"><div><span class="micro-label">${e(item.sensor)}</span><h3>${e(item.name)}</h3></div>${icon("arrow", 20)}</a>`,
    )
    .join("")}</div></section></div>`;
})();
