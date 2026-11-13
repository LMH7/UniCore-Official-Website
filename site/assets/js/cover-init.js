// Run before the stylesheet so the saved theme paints without flashing daylight.
(() => {
  let theme = "day";
  try { if (sessionStorage.getItem("inex-cover-theme:v1") === "night") theme = "night"; } catch {}
  document.documentElement.dataset.coverTheme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "night" ? "#06111f" : "#79b6df";
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "image";
  preload.href = `assets/images/cover-sky-${theme === "night" ? "night-realistic" : "day"}.webp`;
  document.head.append(preload);
})();
