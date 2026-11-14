import { test, expect } from "./fixtures.mjs";

const ready = (page) => page.evaluate(() => window.INTERACTIONS_READY);

for (const width of [390, 1440]) {
  test(`侧边栏目在 ${width}px 点击后高亮对应项，往返切换不落到上一项`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["about", "products", "projects", "solutions", "resources", "contact"]) {
      await page.goto(`/${path}.html`);
      await ready(page);
      const links = page.locator(".page-index a");
      const count = await links.count();
      for (const index of [1, 0, count - 1, 1]) {
        const link = links.nth(index);
        const href = await link.getAttribute("href");
        await link.click();
        await expect(link, `${path}: ${href}`).toHaveAttribute("aria-current", "location");
        await expect(page.locator('.page-index a[aria-current="location"]')).toHaveCount(1);
        expect(new URL(page.url()).hash).toBe(href);
      }
    }
  });
}

async function holdCoverTheme(page, expectedTheme) {
  const button = page.locator("#cover-theme-toggle");
  await button.hover();
  await page.mouse.down();
  try {
    await expect(page.locator("#cover-sky-base")).toHaveAttribute("data-sky", expectedTheme);
  } finally {
    await page.mouse.up();
  }
}

const coverFlightPositions = (page) => page.evaluate(() => {
  const center = (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + rect.height / 2 + window.scrollY };
  };
  return {
    aircraft: center(document.getElementById("flight-aircraft")),
    launch: center(document.getElementById("flight-launch-point")),
  };
});

test("封面飞机从固定起点出发，重置平滑返航并恢复引导，Esc可停止返航", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/index.html");
  const hint = page.locator("#flight-idle-hint");
  const label = page.locator("#flight-idle-label");
  await expect(hint).toBeVisible();
  await expect(label).toHaveText("点击飞机开始跟随");
  const initial = await coverFlightPositions(page);
  expect(Math.hypot(initial.aircraft.x - initial.launch.x, initial.aircraft.y - initial.launch.y)).toBeLessThan(1);
  await page.locator("#flight-toggle").click();
  const viewport = page.viewportSize();
  await page.mouse.move(viewport.width * .3, viewport.height * .45);
  await expect.poll(async () => {
    const position = await coverFlightPositions(page);
    return Math.hypot(position.aircraft.x - position.launch.x, position.aircraft.y - position.launch.y);
  }).toBeGreaterThan(100);
  await expect(hint).toBeHidden();
  await page.keyboard.press("Escape");
  const away = (await coverFlightPositions(page)).aircraft;
  await expect(label).toHaveText("点击飞机继续跟随");
  await page.locator("#flight-reset").click();
  await expect(page.locator("#flight-status")).toHaveText("正在返回出发点");
  await expect(hint).toBeHidden();
  await expect.poll(async () => {
    const position = await coverFlightPositions(page);
    return Math.hypot(position.aircraft.x - away.x, position.aircraft.y - away.y) > 2
      && Math.hypot(position.aircraft.x - position.launch.x, position.aircraft.y - position.launch.y) > 2;
  }).toBe(true);
  await expect(page.locator("#flight-status")).toHaveText("等待起飞");
  const returned = await coverFlightPositions(page);
  expect(returned.launch).toEqual(initial.launch);
  expect(Math.hypot(returned.aircraft.x - returned.launch.x, returned.aircraft.y - returned.launch.y)).toBeLessThan(1);
  await expect(hint).toBeVisible();
  await expect(label).toHaveText("点击飞机开始跟随");
  await page.locator("#flight-toggle").click();
  await page.mouse.move(viewport.width * .3, viewport.height * .45);
  await expect.poll(async () => {
    const position = await coverFlightPositions(page);
    return Math.hypot(position.aircraft.x - position.launch.x, position.aircraft.y - position.launch.y);
  }).toBeGreaterThan(100);
  await page.keyboard.press("Escape");
  await page.locator("#flight-reset").click();
  await expect(page.locator("body")).toHaveClass(/is-returning/);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/is-returning/);
  await expect(page.locator("#flight-aircraft")).toHaveAttribute("aria-pressed", "false");
  await expect(label).toHaveText("点击飞机继续跟随");
  await expect(hint).toBeVisible();
});

test("减少动态效果时飞机重置直接回到固定起点", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/index.html");
  const initial = await coverFlightPositions(page);
  await page.locator("#flight-toggle").click();
  await page.mouse.move(180, 220);
  await expect.poll(async () => {
    const position = await coverFlightPositions(page);
    return Math.hypot(position.aircraft.x - position.launch.x, position.aircraft.y - position.launch.y);
  }).toBeGreaterThan(50);
  await page.locator("#flight-reset").click();
  await expect(page.locator("#flight-status")).toHaveText("等待起飞");
  await expect(page.locator("body")).not.toHaveClass(/is-returning/);
  const reset = await coverFlightPositions(page);
  expect(reset.launch).toEqual(initial.launch);
  expect(Math.hypot(reset.aircraft.x - reset.launch.x, reset.aircraft.y - reset.launch.y)).toBeLessThan(1);
  await expect(page.locator("#flight-idle-hint")).toBeVisible();
  await expect(page.locator("#flight-idle-label")).toHaveText("点击飞机开始跟随");
});

test("封面可手动切换三段文案，文案控制与飞机启停独立", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/index.html");
  const selectors = page.locator("[data-cover-slide-index]");
  const aircraft = page.locator("#flight-aircraft");
  await expect(selectors).toHaveCount(3);
  await expect(page.locator("#cover-title")).toHaveText("联核智域 iNEX");
  await expect(page.locator("#cover-carousel-toggle")).toBeDisabled();
  await selectors.nth(1).click();
  await expect(page.locator("#cover-title")).toHaveText("让想法，自由飞行。");
  await expect(aircraft).toHaveAttribute("aria-pressed", "false");
  await aircraft.click();
  await expect(aircraft).toHaveAttribute("aria-pressed", "true");
  await selectors.nth(2).click();
  await expect(page.locator("#cover-title")).toHaveText("从单机，到集群协同。");
  await expect(aircraft).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-cover-slide-index][aria-pressed="true"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(aircraft).toHaveAttribute("aria-pressed", "false");
  await selectors.nth(0).click();
  await expect(page.locator("#cover-title")).toHaveText("联核智域 iNEX");
});

test("封面长按昼夜可往返并在刷新后恢复，切换不改变飞机跟随状态", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/index.html");
  const theme = page.locator("#cover-theme-toggle");
  const sky = page.locator("#cover-sky-base");
  const aircraft = page.locator("#flight-aircraft");
  await expect(theme).toBeVisible();
  await expect(sky).toHaveAttribute("data-sky", "day");
  await page.locator("#flight-toggle").click();
  await expect(aircraft).toHaveAttribute("aria-pressed", "true");
  await holdCoverTheme(page, "night");
  await expect(sky).toHaveAttribute("data-sky", "night");
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await expect(aircraft).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(theme).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-cover-theme", "night");
  await expect(sky).toHaveAttribute("data-sky", "night");
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await page.locator("#flight-toggle").click();
  await theme.focus();
  await page.keyboard.down("Space");
  try {
    await expect(sky).toHaveAttribute("data-sky", "day");
  } finally {
    await page.keyboard.up("Space");
  }
  await expect(sky).toHaveAttribute("data-sky", "day");
  await expect(theme).toHaveAttribute("aria-pressed", "false");
  await expect(aircraft).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(theme).toBeVisible();
  await expect(sky).toHaveAttribute("data-sky", "day");
});

test("封面长按预览从角落展开，提前松手恢复原主题，轮播文字逐行出现", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/index.html");
  const theme = page.locator("#cover-theme-toggle");
  const reveal = page.locator("#cover-sky-reveal");
  const sky = page.locator("#cover-sky-base");
  await expect(theme).toBeVisible();
  await page.locator("#cover-carousel-toggle").click();
  await expect(page.locator("#cover-carousel-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(reveal).toBeHidden();
  await theme.hover();
  await page.mouse.down();
  await expect(reveal).toBeVisible();
  await expect.poll(() => theme.evaluate((button) =>
    Number(button.style.getPropertyValue("--hold-progress")),
  )).toBeGreaterThan(0.2);
  await expect(sky).toHaveAttribute("data-sky", "day");
  await page.mouse.up();
  await expect(reveal).toBeHidden();
  await expect(sky).toHaveAttribute("data-sky", "day");
  expect(await page.evaluate(() => sessionStorage.getItem("inex-cover-theme:v1"))).toBeNull();
  await theme.focus();
  await page.keyboard.down("Space");
  await expect.poll(() => theme.evaluate((button) =>
    Number(button.style.getPropertyValue("--hold-progress")),
  )).toBeGreaterThan(0.2);
  await page.keyboard.press("Escape");
  await page.keyboard.up("Space");
  await expect(reveal).toBeHidden();
  await expect(sky).toHaveAttribute("data-sky", "day");
  expect(await page.evaluate(() => sessionStorage.getItem("inex-cover-theme:v1"))).toBeNull();
  await holdCoverTheme(page, "night");
  await expect(theme).toBeEnabled();
  await expect(reveal).toBeHidden();
  await expect(sky).toHaveAttribute("data-sky", "night");
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-cover-slide-index="1"]').click();
  await expect(page.locator("#cover-title")).toHaveText("让想法，自由飞行。");
  const lines = page.locator("#cover-message .line-inner");
  await expect(lines).toHaveText([
    "让想法，",
    "自由飞行。",
    "面向科研与教育，",
    "让每一次好奇都有起飞的可能。",
  ]);
  const delays = await lines.evaluateAll((elements) => elements.map((element) =>
    Math.round(parseFloat(getComputedStyle(element).animationDelay) * 1000),
  ));
  expect(delays).toEqual([0, 220, 440, 660]);
});

test("昼夜分界线内的文字和飞机同步换色，运动与轮播保持一致且副本不参与交互", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/index.html");
  const theme = page.locator("#cover-theme-toggle");
  const reveal = page.locator("#cover-sky-reveal");
  await expect(theme).toBeVisible();
  await page.locator("#flight-toggle").click();
  await theme.hover();
  await page.mouse.down();
  let snapshot;
  try {
    // Keep all transient-state reads in one browser turn so the 1.5s hold cannot
    // finish between separate assertions on a slower test connection.
    snapshot = await page.evaluate(async () => {
      const original = document.getElementById("cover-scene");
      const button = document.getElementById("cover-theme-toggle");
      const reveal = document.getElementById("cover-sky-reveal");
      const untilProgress = (minimum) => new Promise((resolve) => {
        const inspect = () => {
          if (Number(button.style.getPropertyValue("--hold-progress")) >= minimum) resolve();
          else requestAnimationFrame(inspect);
        };
        inspect();
      });
      await untilProgress(.12);
      original.querySelector('[data-cover-slide-index="1"]').click();
      document.dispatchEvent(new PointerEvent("pointermove", {
        clientX: 180, clientY: 240, isPrimary: true,
      }));
      await untilProgress(.48);
      const preview = reveal.querySelector(".cover-scene-preview");
      if (!preview) return null;
      const sourceModel = original.querySelector(".aircraft-model");
      const previewModel = preview.querySelector(".aircraft-model");
      const sourceDescription = original.querySelector(".cover-description");
      const previewDescription = preview.querySelector(".cover-description");
      const sourceAircraft = original.querySelector(".aircraft");
      const previewAircraft = preview.querySelector(".aircraft");
      const sourceLines = [...original.querySelectorAll(".line-inner")];
      const previewLines = [...preview.querySelectorAll(".line-inner")];
      const sourceRect = sourceAircraft.getBoundingClientRect();
      const previewRect = previewAircraft.getBoundingClientRect();
      const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
      return {
        theme: document.documentElement.dataset.coverTheme,
        palette: preview.dataset.coverPalette,
        previewIsInsideReveal: preview.parentElement === reveal,
        clipPath: reveal.style.clipPath,
        targetBackground: getComputedStyle(reveal).backgroundImage,
        sourcePlaneColor: getComputedStyle(sourceModel).color,
        previewPlaneColor: getComputedStyle(previewModel).color,
        sourceDescriptionColor: getComputedStyle(sourceDescription).color,
        previewDescriptionColor: getComputedStyle(previewDescription).color,
        aircraftTransformMatches: previewAircraft.style.transform === sourceAircraft.style.transform,
        modelTransformMatches: previewModel.style.transform === sourceModel.style.transform,
        aircraftOffset: Math.hypot(sourceRect.left - previewRect.left, sourceRect.top - previewRect.top),
        titles: [original.querySelector("h1").textContent, preview.querySelector("h1").textContent],
        lineTimesMatch: sourceLines.length === previewLines.length && sourceLines.every((line, index) => {
          const sourceAnimation = line.getAnimations()[0];
          const previewAnimation = previewLines[index].getAnimations()[0];
          return sourceAnimation && previewAnimation
            && Math.abs(Number(sourceAnimation.currentTime) - Number(previewAnimation.currentTime)) < 40;
        }),
        inert: preview.inert,
        ariaHidden: preview.getAttribute("aria-hidden"),
        noCopiedIds: preview.querySelectorAll("[id]").length === 0 && !preview.id,
        noDuplicateIds: new Set(ids).size === ids.length,
        ignoresPointer: [preview, ...preview.querySelectorAll("*")].every((element) =>
          getComputedStyle(element).pointerEvents === "none"),
        remainsFollowing: sourceAircraft.getAttribute("aria-pressed"),
      };
    });
  } finally {
    await page.mouse.up();
  }
  expect(snapshot).not.toBeNull();
  expect(snapshot.theme).toBe("day");
  expect(snapshot.palette).toBe("night");
  expect(snapshot.previewIsInsideReveal).toBe(true);
  expect(snapshot.clipPath).toMatch(/^circle\([1-9]/);
  expect(snapshot.targetBackground).toContain("cover-sky-night-realistic.webp");
  expect(snapshot.sourcePlaneColor).toBe("rgb(8, 43, 70)");
  expect(snapshot.previewPlaneColor).toBe("rgb(219, 242, 255)");
  expect(snapshot.previewDescriptionColor).not.toBe(snapshot.sourceDescriptionColor);
  expect(snapshot.aircraftTransformMatches).toBe(true);
  expect(snapshot.modelTransformMatches).toBe(true);
  expect(snapshot.aircraftOffset).toBeLessThan(1);
  expect(snapshot.titles).toEqual(["让想法，自由飞行。", "让想法，自由飞行。"]);
  expect(snapshot.lineTimesMatch).toBe(true);
  expect(snapshot.inert).toBe(true);
  expect(snapshot.ariaHidden).toBe("true");
  expect(snapshot.noCopiedIds).toBe(true);
  expect(snapshot.noDuplicateIds).toBe(true);
  expect(snapshot.ignoresPointer).toBe(true);
  expect(snapshot.remainsFollowing).toBe("true");
  await expect(reveal).toBeHidden();
  await expect(reveal.locator(".cover-scene-preview")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-cover-theme", "day");
  await expect(page.locator("#flight-aircraft")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => sessionStorage.getItem("inex-cover-theme:v1"))).toBeNull();
});

test("窄屏滚动后的夜转昼前景与原场景对齐，取消和完成切换均清除显示副本", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => sessionStorage.setItem("inex-cover-theme:v1", "night"));
  await page.goto("/index.html");
  const theme = page.locator("#cover-theme-toggle");
  const reveal = page.locator("#cover-sky-reveal");
  await expect(theme).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-cover-theme", "night");
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    document.getElementById("cover-theme-toggle").focus({ preventScroll: true });
  });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.keyboard.down("Space");
  let snapshot;
  try {
    await expect.poll(() => theme.evaluate((button) =>
      Number(button.style.getPropertyValue("--hold-progress")),
    )).toBeGreaterThan(.15);
    snapshot = await page.evaluate(() => {
      const original = document.getElementById("cover-scene");
      const reveal = document.getElementById("cover-sky-reveal");
      const preview = reveal.querySelector(".cover-scene-preview");
      if (!preview) return null;
      const sourceRect = original.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      return {
        palette: preview.dataset.coverPalette,
        sourceTop: sourceRect.top,
        offset: Math.hypot(sourceRect.left - previewRect.left, sourceRect.top - previewRect.top),
        widthDifference: Math.abs(sourceRect.width - previewRect.width),
        heightDifference: Math.abs(sourceRect.height - previewRect.height),
        targetBackground: getComputedStyle(reveal).backgroundImage,
        sourceColor: getComputedStyle(original.querySelector(".aircraft-model")).color,
        previewColor: getComputedStyle(preview.querySelector(".aircraft-model")).color,
      };
    });
  } finally {
    await page.keyboard.up("Space");
  }
  expect(snapshot).not.toBeNull();
  expect(snapshot.palette).toBe("day");
  expect(snapshot.sourceTop).toBeLessThan(0);
  expect(snapshot.offset).toBeLessThan(1);
  expect(snapshot.widthDifference).toBeLessThan(1);
  expect(snapshot.heightDifference).toBeLessThan(1);
  expect(snapshot.targetBackground).toContain("cover-sky-day.webp");
  expect(snapshot.sourceColor).toBe("rgb(219, 242, 255)");
  expect(snapshot.previewColor).toBe("rgb(8, 43, 70)");
  await expect(reveal).toBeHidden();
  await expect(reveal.locator(".cover-scene-preview")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-cover-theme", "night");
  await holdCoverTheme(page, "day");
  await expect(reveal).toBeHidden();
  await expect(reveal.locator(".cover-scene-preview")).toHaveCount(0);
  await expect(page.locator("#aircraft-model")).toHaveCSS("color", snapshot.previewColor);
});

test("进入首页先完整切到夜空，再交给页面导航", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/index.html");
  await expect(page.locator("#cover-theme-toggle")).toBeVisible();
  await page.locator("#flight-toggle").click();
  await expect(page.locator("#flight-aircraft")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || !event.target.closest("a[data-cover-entry]")) return;
      sessionStorage.setItem("test-cover-entry", JSON.stringify({
        theme: document.documentElement.dataset.coverTheme,
        background: document.getElementById("cover-sky-base").dataset.sky,
        following: document.getElementById("flight-aircraft").getAttribute("aria-pressed"),
      }));
    }, { capture: true });
  });
  await page.locator(".cover-entry").click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator("#cover-sky-reveal")).toBeVisible();
  await expect(page.locator("#flight-aircraft")).toHaveAttribute("aria-pressed", "false");
  await page.waitForURL(/\/home\.html$/);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("test-cover-entry")))).toEqual({
    theme: "night",
    background: "night",
    following: "false",
  });
});

test("iNEX Logo 与两个可识别二维码在全站生效", async ({ page }) => {
  await page.goto("/contact.html");
  await ready(page);
  await expect(page.locator(".navbar-brand img")).toHaveAttribute(
    "src",
    "assets/images/inex-logo.webp",
  );
  await expect(page).toHaveTitle(/iNEX/);
  await expect(page.locator(".contact-channel")).toHaveCount(2);
  const linkedIn = page
    .locator(".contact-channel")
    .getByRole("link", { name: /访问 LinkedIn/ });
  expect(decodeURIComponent(await linkedIn.getAttribute("href"))).toBe(
    "https://www.linkedin.com/in/宇昊-魏-a7a450448?fromQR=1",
  );
  await expect(linkedIn).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    page.locator('a[download="inex-wechat-qr.png"]'),
  ).toHaveAttribute("href", "assets/images/wechat-qr.png");
});

test("产品筛选、搜索、零结果恢复与分享地址保留筛选", async ({ page }) => {
  await page.goto("/products.html");
  await ready(page);
  await page.getByRole("button", { name: "深度相机", exact: true }).click();
  await expect(page.locator(".product-card:visible")).toHaveCount(2);
  await expect(page.locator("#product-count")).toHaveText("显示 2 / 3 款平台");
  await expect(page).toHaveURL(/sensor=/);
  await page.getByRole("searchbox", { name: "搜索产品" }).fill("250");
  await expect(page.locator(".product-card:visible")).toHaveCount(1);
  await page.reload();
  await ready(page);
  await expect(page.getByRole("searchbox", { name: "搜索产品" })).toHaveValue(
    "250",
  );
  await expect(page.locator(".product-card:visible")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "搜索产品" })
    .fill("<script>not-a-product</script>");
  await expect(page.locator("#products-empty")).toBeVisible();
  await page.getByRole("button", { name: "重置筛选" }).click();
  await expect(page.locator(".product-card:visible")).toHaveCount(3);
  await expect(page).toHaveURL(/products\.html$/);
});

test("手机对比表、键盘关闭、清空与重新选择", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products.html");
  await ready(page);
  await page.getByRole("checkbox", { name: "将 NEX 500 加入对比" }).check();
  await expect(page.getByRole("button", { name: "开始对比" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "将 NEX 250 加入对比" }).check();
  await page.getByRole("button", { name: "开始对比" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("table")).toContainText("NEX 500");
  await expect(page.getByRole("table")).toContainText("深度相机");
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "开始对比" })).toBeFocused();
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await expect(page.locator("#compare-bar")).toBeHidden();
  await expect(page.locator("[data-compare-product]:checked")).toHaveCount(0);
});

test("二维码弹窗放大、下载原图与焦点恢复", async ({ page }) => {
  await page.goto("/contact.html");
  await ready(page);
  const button = page.getByRole("button", {
    name: "放大微信二维码",
    exact: true,
  });
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("dialog img")).toHaveAttribute(
    "src",
    "assets/images/wechat-qr.png",
  );
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "保存二维码" }),
  ).toHaveAttribute("download", "inex-wechat-qr.png");
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await expect(button).toBeFocused();
  await page
    .getByRole("button", { name: "放大LinkedIn二维码", exact: true })
    .click();
  await expect(page.locator("dialog img")).toHaveAttribute(
    "src",
    "assets/images/linkedin-qr.png",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "微信联系", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("微信联系");
});

test("全站搜索能按产品、方案搜索并安全处理特殊字符", async ({ page }) => {
  await page.goto("/home.html");
  await ready(page);
  await page.getByRole("button", { name: "搜索全站" }).click();
  const input = page.getByRole("searchbox", { name: "输入全站搜索关键词" });
  await expect(input).toBeFocused();
  await input.fill("集群");
  await expect(page.locator("#site-search-results")).toContainText("集群协同");
  await input.fill("<img src=x onerror=alert(1)>");
  await expect(page.locator("#site-search-count")).toHaveText("找到 0 项结果");
  await expect(page.locator("#site-search-results img")).toHaveCount(0);
  await input.fill("NEX 30");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /NEX 30/ })
    .click();
  await expect(page.locator("h1")).toHaveText("NEX 30");
  await ready(page);
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("产品图放大、详情分享与咨询上下文", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/product.html?id=nex-500");
  await ready(page);
  await page.getByRole("button", { name: "放大 NEX 500 产品图" }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("NEX 500");
  await expect(page.getByRole("dialog").locator("img")).toHaveAttribute(
    "src",
    "assets/images/nex-500.webp",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "分享 NEX 500" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("product.html?id=nex-500");
  await page.getByRole("link", { name: "咨询平台" }).click();
  await ready(page);
  await expect(page.locator(".inquiry-context")).toContainText("NEX 500");
  await page.getByRole("button", { name: /复制咨询内容/ }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("我想了解 NEX 500");
});

test("常见问题、手机Escape收起菜单与回到顶部", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/resources.html");
  await ready(page);
  const question = page.locator(".faq-item").first();
  await question.locator("summary").click();
  await expect(question).toHaveAttribute("open", "");
  await expect(question.locator("p")).toBeVisible();
  await page.getByRole("button", { name: "回到顶部", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const toggle = page.getByRole("button", { name: /^(展开|收起)导航菜单$/ });
  await toggle.click();
  await expect(page.locator("#main-navigation")).toHaveClass(/show/);
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("减少动态效果时内容可直接阅读，hover仍有反馈", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/home.html");
  await ready(page);
  await expect(page.locator(".reveal-ready:not(.is-visible)")).toHaveCount(0);
  await page.locator(".product-card").first().scrollIntoViewIfNeeded();
  await page.locator(".product-card").first().hover();
  await expect
    .poll(() =>
      page
        .locator(".product-card")
        .first()
        .evaluate((el) => getComputedStyle(el).borderColor),
    )
    .toBe("rgb(190, 209, 238)");
});

test("静态模式不发起后端请求", async ({ page }) => {
  await page.route("**/data-config.js*", route => route.fulfill({
    contentType: "text/javascript", body: 'window.DATA_CONFIG = Object.freeze({source:"local",apiBase:"",timeoutMs:5000});',
  }));
  const apiCalls = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) apiCalls.push(req.url());
  });
  await page.goto("/home.html");
  await ready(page);
  expect(await page.evaluate(async () => (await SiteData.ready).source)).toBe(
    "local",
  );
  expect(apiCalls).toEqual([]);
});

async function apiMode(page, timeout = 500) {
  await page.route("**/data-config.js", async (route) => {
    const response = await route.fetch();
    const body = `window.DATA_CONFIG = Object.freeze({source: "api", apiBase: "/api/v1/", timeoutMs: ${timeout}});`;
    await route.fulfill({ response, body });
  });
}

test("预留数据层能读取API返回并同步列表与详情，无需真实后端", async ({
  page,
}) => {
  await page.goto("/home.html");
  await ready(page);
  const { products, content, version } = await page.evaluate(async () => {
    const d = await SiteData.ready;
    return { products: d.products, content: d.content, version: d.version };
  });
  products[0].name = "接口测试平台";
  await apiMode(page);
  await page.route("**/api/v1/products", (r) =>
    r.fulfill({ json: { data: products, meta: {version} } }),
  );
  await page.route("**/api/v1/site-content", (r) =>
    r.fulfill({ json: { data: content, meta: {version} } }),
  );
  await page.goto("/home.html");
  await ready(page);
  await expect(page.locator("#hero-model")).toHaveText("接口测试平台");
  await page.goto("/products.html");
  await ready(page);
  await expect(page.locator(".product-card").first()).toContainText(
    "接口测试平台",
  );
  expect(await page.evaluate(async () => (await SiteData.ready).source)).toBe(
    "api",
  );
  await page
    .getByRole("link", { name: "查看 接口测试平台", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("接口测试平台");
});

test("有效的空产品列表显示空状态，不显示被接口撤下的本地产品", async ({
  page,
}) => {
  await page.goto("/home.html");
  await ready(page);
  const content = await page.evaluate(() => SITE_CONTENT);
  const version = await page.evaluate(() => CONTENT_VERSION);
  content.contacts = [];
  await apiMode(page);
  await page.route("**/api/v1/products", (r) =>
    r.fulfill({ json: { data: [], meta: {version} } }),
  );
  await page.route("**/api/v1/site-content", (r) =>
    r.fulfill({ json: { data: content, meta: {version} } }),
  );
  await page.goto("/products.html");
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(0);
  await expect(page.locator("#products-empty")).toBeVisible();
  await expect(page.locator(".content-fallback")).toHaveCount(0);
  await expect(page.locator("[data-contact-qr]")).toHaveCount(0);
  await page.goto("/home.html");
  await ready(page);
  await expect(page.locator(".hero-empty")).toBeVisible();
  await expect(page.locator("#hero-product-image")).toHaveCount(0);
});

for (const failure of ["http-error", "invalid-data", "timeout"]) {
  test(`API ${failure} 时回退到可浏览的已保存内容`, async ({ page }) => {
    await apiMode(page, 250);
    await page.route("**/api/v1/**", async (route) => {
      if (failure === "timeout") {
        await new Promise((r) => setTimeout(r, 500));
        try {
          await route.abort();
        } catch {}
        return;
      }
      if (failure === "http-error")
        await route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE" } },
        });
      else await route.fulfill({ json: { data: [{ id: "broken" }] } });
    });
    await page.goto("/products.html");
    await ready(page);
    await expect(page.locator(".product-card")).toHaveCount(3);
    await expect(page.locator(".content-fallback")).toHaveText(
      "最新内容暂时无法获取，当前展示已保存的版本。",
    );
    expect(
      await page.evaluate(async () => (await SiteData.ready).fallback),
    ).toBe(true);
  });
}
