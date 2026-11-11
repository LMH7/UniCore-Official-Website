/* 在首次绘制前选择转场方式；保留普通链接、锚点和浏览器历史行为。 */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = matchMedia("(max-width: 991.98px)");
  const navigationKey = `inex-navigation-open:${new URL(".", location.href).pathname}`;
  function rememberNavigation(open) {
    if (open && narrow.matches) root.dataset.navigationOpen = "";
    else delete root.dataset.navigationOpen;
    try {
      if (open && narrow.matches) sessionStorage.setItem(navigationKey, "1");
      else sessionStorage.removeItem(navigationKey);
    } catch {
      // 存储受限时仍允许当前页面正常展开和关闭。
    }
  }
  function readNavigation() {
    let open = false;
    try {
      open = sessionStorage.getItem(navigationKey) === "1";
    } catch {
      open = "navigationOpen" in root.dataset;
    }
    rememberNavigation(open);
  }
  // 在 header 被解析前恢复占位，避免先收起再展开导致整页高度变化。
  readNavigation();
  window.restoreNavigationState = () => {
    const nav = document.getElementById("main-navigation");
    const button = document.querySelector(".navbar-toggler");
    if (!nav || !button) return;
    const open = narrow.matches && "navigationOpen" in root.dataset;
    nav.classList.toggle("show", open);
    button.classList.toggle("collapsed", !open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "收起导航菜单" : "展开导航菜单");
  };
  for (const name of [
    "show.bs.collapse",
    "shown.bs.collapse",
    "hide.bs.collapse",
    "hidden.bs.collapse",
  ]) {
    document.addEventListener(name, (event) => {
      if (event.target.id !== "main-navigation") return;
      const open = name === "show.bs.collapse" || name === "shown.bs.collapse";
      rememberNavigation(open);
      const button = document.querySelector(".navbar-toggler");
      button?.setAttribute("aria-label", open ? "收起导航菜单" : "展开导航菜单");
      if (name === "shown.bs.collapse" || name === "hidden.bs.collapse")
        window.restoreNavigationState();
    });
  }
  narrow.addEventListener("change", () => {
    if (!narrow.matches) rememberNavigation(false);
    window.restoreNavigationState();
  });
  addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    readNavigation();
    window.restoreNavigationState();
  });
  const storageKey = "inex-page-entry";
  const native =
    window.top === window &&
    "CSSViewTransitionRule" in window &&
    "onpagereveal" in window;

  if (native) {
    root.dataset.pageTransition = "native";
    const style = document.createElement("style");
    style.textContent =
      "@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } }";
    document.head.append(style);
    return;
  }

  root.dataset.pageTransition = "fade";
  let entry;
  try {
    entry = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    sessionStorage.removeItem(storageKey);
  } catch {
    // 隐私模式可能禁用存储；普通导航仍可正常使用。
  }
  let leaveTimer;
  let recoveryTimer;
  let arrivalTimer;
  let leaving = false;
  function reset() {
    clearTimeout(leaveTimer);
    clearTimeout(recoveryTimer);
    clearTimeout(arrivalTimer);
    leaving = false;
    delete root.dataset.pageEntering;
    delete root.dataset.pageLeaving;
    delete root.dataset.pageArriving;
  }
  function arrive() {
    if (!("pageEntering" in root.dataset)) return;
    delete root.dataset.pageEntering;
    if (!reduced.matches) root.dataset.pageArriving = "";
    arrivalTimer = setTimeout(() => {
      delete root.dataset.pageArriving;
    }, 320);
  }
  if (
    !reduced.matches &&
    entry?.href === location.href &&
    Date.now() - entry.time >= 0 &&
    Date.now() - entry.time < 15000
  ) {
    root.dataset.pageEntering = "";
    // 内容渲染完成后淡入；脚本意外失败也不会持续隐藏正文。
    recoveryTimer = setTimeout(arrive, 1000);
    document.addEventListener("DOMContentLoaded", () => {
      Promise.allSettled([
        window.LAYOUT_READY,
        window.APP_READY,
        window.PRODUCT_READY,
      ]).then(arrive);
    }, { once: true });
  }

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      reduced.matches
    ) return;
    const link = event.target.closest?.("a[href]");
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    ) return;
    const destination = new URL(link.href, location.href);
    const directory = new URL(".", location.href).pathname;
    if (
      !/^https?:$/.test(destination.protocol) ||
      destination.origin !== location.origin ||
      !destination.pathname.startsWith(directory) ||
      !/(?:\.html|\/)$/i.test(destination.pathname) ||
      (destination.pathname === location.pathname &&
        destination.search === location.search)
    ) return;
    if (leaving) {
      event.preventDefault();
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        href: destination.href,
        time: Date.now(),
      }));
    } catch {
      return;
    }
    event.preventDefault();
    reset();
    leaving = true;
    root.dataset.pageLeaving = "";
    leaveTimer = setTimeout(() => {
      location.assign(destination.href);
      // 导航被浏览器或扩展取消时，恢复当前页面。
      recoveryTimer = setTimeout(reset, 1500);
    }, 180);
  });
  // 从后退缓存恢复时，清掉离开前的淡出状态。
  addEventListener("pageshow", (event) => {
    if (event.persisted) reset();
  });
  addEventListener("pagehide", reset);
  reduced.addEventListener("change", () => {
    if (reduced.matches) arrive();
  });
})();
