/* 产品中心列表交互：筛选、搜索、结果计数、地址同步、零结果恢复。
   卡片由 app.js 统一渲染（首页与列表共用），本文件只负责工具条行为与图片回退，
   不重复生成卡片、不另建产品数据、不把筛选状态写进 localStorage。
   筛选控制器只在这里初始化，app.js 负责共用卡片渲染。 */
window.PRODUCTS_PAGE_READY = (async () => {
  if (document.body.dataset.page !== "products") return;
  if (window.APP_READY) await window.APP_READY;

  const grid = document.querySelector("[data-products]");
  const countEl = document.getElementById("product-count");
  const emptyEl = document.getElementById("products-empty");
  if (!grid || !countEl || !emptyEl) return;

  const search = document.getElementById("product-search");
  const resetButton = document.getElementById("reset-products");
  const filterButtons = [...document.querySelectorAll("[data-product-filter]")];
  if (!search || !filterButtons.length) return;

  const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  const filters = filterButtons.map((button) => button.dataset.productFilter);
  // 每次从地址栏重新读取，避免页面从缓存恢复后被旧的查询串覆盖。
  const readSensor = () => {
    const value = new URLSearchParams(location.search).get("sensor");
    return filters.includes(value) ? value : "all";
  };
  const readQuery = () =>
    (new URLSearchParams(location.search).get("q") || "").slice(0, 200);

  let sensor = readSensor();
  search.value = readQuery();

  const cards = () => [...grid.querySelectorAll("[data-product-card]")];
  const searchable = (product) =>
    [
      product.name,
      product.subtitle,
      product.sensor,
      product.summary,
      product.description,
      ...(Array.isArray(product.applications) ? product.applications : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const writeUrl = (query) => {
    const next = new URL(location.href);
    if (query) next.searchParams.set("q", search.value.trim());
    else next.searchParams.delete("q");
    if (sensor !== "all") next.searchParams.set("sensor", sensor);
    else next.searchParams.delete("sensor");
    history.replaceState(null, "", next);
  };

  const setEmptyCopy = (total) => {
    const title = emptyEl.querySelector("h2");
    const text = emptyEl.querySelector("p");
    if (total === 0) {
      if (title) title.textContent = "平台信息正在更新";
      if (text) text.textContent = "平台记录暂时无法显示，欢迎直接联系我们交流需求。";
      if (resetButton) resetButton.hidden = true;
    } else {
      if (title) title.textContent = "暂时没有匹配的平台";
      if (text) text.textContent = "换一个关键词，或查看全部平台。";
      if (resetButton) resetButton.hidden = false;
    }
  };

  const apply = (updateUrl = true) => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    const list = cards();
    for (const card of list) {
      const product = products.find(
        (item) => item.id === card.dataset.productCard,
      );
      const match =
        (sensor === "all" || product?.sensor === sensor) &&
        (!query || searchable(product || {}).includes(query));
      card.hidden = !match;
      if (match) visible += 1;
      else {
        const box = card.querySelector("[data-compare-product]");
        if (box?.checked) {
          box.checked = false;
          box.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
    for (const button of filterButtons)
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.productFilter === sensor),
      );
    countEl.textContent = `显示 ${visible} / ${list.length} 款平台`;
    emptyEl.hidden = visible > 0;
    setEmptyCopy(list.length);
    if (updateUrl) writeUrl(query);
  };

  search.addEventListener("input", () => apply(true));
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (search.value) {
      search.value = "";
      apply(true);
    } else if (sensor !== "all") {
      sensor = "all";
      apply(true);
    } else {
      search.blur();
    }
  });
  for (const button of filterButtons)
    button.addEventListener("click", () => {
      sensor = button.dataset.productFilter;
      apply(true);
    });
  resetButton?.addEventListener("click", () => {
    search.value = "";
    sensor = "all";
    apply(true);
    search.focus();
  });
  // 后退/前进从缓存恢复时，按地址栏重新对齐卡片与计数。
  addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    sensor = readSensor();
    search.value = readQuery();
    apply(false);
  });

  // 列表卡片图片失败时换本地占位图，避免出现破图。
  const PLACEHOLDER_IMAGE = "assets/images/product-placeholder.svg";
  for (const image of grid.querySelectorAll(".product-image img")) {
    const fallback = () => {
      if (image.dataset.fallback === "done") return;
      image.dataset.fallback = "done";
      image.src = PLACEHOLDER_IMAGE;
      image.classList.add("is-placeholder");
      image.closest(".product-card")?.classList.add("has-image-fallback");
    };
    image.addEventListener("error", fallback);
    if (image.complete && image.naturalWidth === 0) fallback();
  }

  apply(false);
})();
