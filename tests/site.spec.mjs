import { test, expect } from "./fixtures.mjs";

const views = [
  ["home.html", /让研究想法，\s*真正起飞。/],
  ["products.html", "为研究而生的平台"],
  ["solutions.html", "连接技术与真实问题"],
  ["resources.html", "从这里，继续探索"],
  ["about.html", "保持好奇，探索无界"],
  ["contact.html", "每一次探索，从交流开始"],
  ["product.html?id=nex-500", "NEX 500"],
  ["product.html?id=nex-250", "NEX 250"],
  ["product.html?id=nex-30", "NEX 30"],
  ["credits.html", "素材与开源说明"],
];

test("网站默认入口是互动封面，进入主站后首页链接不会返回封面", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/", "/index.html"]) {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.locator("body")).toHaveAttribute("data-layout", "standalone");
    await expect(page.locator("#cover-title")).toHaveText("联核智域 iNEX");
    await expect(page.locator("[data-cover-slide-index]")).toHaveCount(3);
    await expect(page.locator("html")).toHaveCSS("scrollbar-gutter", "auto");
    await expect(page.locator(".entry-arrow svg, .instruction-icon svg, .flight-toggle-icon svg")).toHaveCount(3);
    await expect(page.locator(".entry-arrow, .instruction-icon, .flight-toggle-icon")).toHaveText(["", "", ""]);
    await expect(page.locator(".cover-entry")).toHaveAttribute("href", "home.html");
    await page.locator(".cover-entry").click();
    await expect(page).toHaveURL(/\/home\.html$/);
    await expect(page.locator("h1")).toHaveText(views[0][1]);
    await expect(page.locator("html")).toHaveCSS("scrollbar-gutter", "stable");
    await expect(page.locator("html")).toHaveCSS("scrollbar-width", "auto");
    await page.locator('#main-navigation a[href="products.html"]').click();
    await expect(page).toHaveURL(/\/products\.html$/);
    await page.locator('#main-navigation a[href="home.html"]').click();
    await expect(page).toHaveURL(/\/home\.html$/);
    await expect(page.locator("body")).toHaveAttribute("data-page", "home");
  }
  expect(errors).toEqual([]);
});

test("封面在矮窗口中保留正常滚动条，能滚动到操作区", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const height of [480, 900]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/index.html");
    await expect(page.locator("#flight-controls")).toBeVisible();
    await expect(page.locator("html")).toHaveCSS("overflow-y", "auto");
    await expect(page.locator("html")).toHaveCSS("scrollbar-width", "auto");
    const bounds = await page.evaluate(() => {
      const root = document.documentElement;
      const sky = document.querySelector(".cover-skies").getBoundingClientRect();
      return {
        viewport: window.innerWidth,
        content: root.clientWidth,
        scrollWidth: root.scrollWidth,
        skyLeft: sky.left,
        skyRight: sky.right,
        overflow: root.scrollHeight - root.clientHeight,
      };
    });
    expect(bounds.content).toBeLessThanOrEqual(bounds.viewport);
    expect(Math.abs(bounds.skyLeft)).toBeLessThan(1);
    expect(Math.abs(bounds.skyRight - bounds.content), "天空铺到滚动条内侧的内容边缘").toBeLessThan(1);
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.content + 1);
    if (height === 480) {
      expect(bounds.overflow).toBeGreaterThan(0);
      await page.mouse.move(100, 200);
      await page.mouse.wheel(0, 1000);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expect(page.locator("#flight-reset")).toBeInViewport();
    } else {
      expect(bounds.overflow).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds.viewport - bounds.content), "没有溢出时不预留空轨道").toBeLessThan(1);
    }
  }
});

for (const width of [375, 390, 768, 1440]) {
  test(`主要页面在 ${width}px 可读，无溢出、破图和脚本错误`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("response", (r) => {
      if (
        new URL(r.url()).origin === "http://127.0.0.1:4175" &&
        r.status() >= 400
      )
        errors.push(`${r.status()} ${r.url()}`);
    });
    for (const [url, title] of views) {
      await page.goto("/" + url);
      await expect(page.locator("h1")).toHaveText(title);
      await expect(page.locator("#site-header nav")).toBeVisible();
      await expect(page.locator("#site-footer")).toContainText("联核智域");
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(dimensions.scroll, url).toBeLessThanOrEqual(dimensions.viewport);
      for (const img of await page.locator("img").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect
          .poll(
            () => img.evaluate((el) => el.complete && el.naturalWidth > 0),
            { message: `${url} 图片可加载` },
          )
          .toBeTruthy();
      }
      const localLinks = await page
        .locator("a[href]")
        .evaluateAll((anchors) =>
          anchors
            .map((a) => a.getAttribute("href"))
            .filter((href) => !/^(https?:|mailto:|#)/i.test(href)),
        );
      for (const href of new Set(localLinks))
        expect(
          (await page.request.get("/" + href)).status(),
          `${url} → ${href}`,
        ).toBe(200);
    }
    expect(errors).toEqual([]);
  });
}

test("手机菜单和首页到产品、详情、联系的完整路径", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/home.html");
  const toggle = page.getByRole("button", { name: /^(展开|收起)导航菜单$/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#main-navigation")).toBeVisible();
  await expect(page.locator("#main-navigation")).toHaveClass(/\bshow\b/);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#main-navigation")).toBeHidden();
  await page.getByRole("link", { name: "探索产品平台" }).click();
  await expect(page).toHaveURL(/products\.html$/);
  await page.getByRole("link", { name: "查看 NEX 250", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("NEX 250");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("NEX 250");
  await page.getByRole("link", { name: "咨询平台" }).click();
  await expect(page).toHaveURL(/contact\.html\?product=nex-250$/);
  await expect(page.locator(".contact-channels")).toContainText("微信联系");
  await expect(page.locator(".contact-channels")).toContainText("LinkedIn");
  await expect(page.locator(".inquiry-context")).toContainText("NEX 250");
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});

test("首页产品切换同步图片、名称和详情入口", async ({ page }) => {
  await page.goto("/home.html");
  for (const [name, id] of [
    ["NEX 250", "nex-250"],
    ["NEX 30", "nex-30"],
    ["NEX 500", "nex-500"],
  ]) {
    await page.getByRole("button", { name: new RegExp(name + "$") }).click();
    await expect(page.locator("#hero-model")).toHaveText(name);
    await expect(page.locator("#hero-product-link")).toHaveAttribute(
      "href",
      `product.html?id=${id}`,
    );
    expect(
      await page
        .locator("#hero-product-image")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    ).toBeTruthy();
    await expect(
      page.locator('[data-hero-product][aria-pressed="true"]'),
    ).toHaveCount(1);
  }
});

test("错误产品与深层错误地址可以回到正确页面", async ({ page }) => {
  for (const url of [
    "/product.html",
    "/product.html?id=missing",
    "/product.html?id=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "未找到该产品",
    );
    await page.getByRole("link", { name: "返回产品中心" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "为研究而生的平台",
    );
  }
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  const response = await page.goto("/missing/deep/page");
  expect(response.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "偏离了航线",
  );
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await page.getByRole("link", { name: "返回首页", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4175/home.html");
  expect(errors).toEqual([]);
});

test("联系方式填写后可显示、点击和复制，并可安全处理文本", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/site-content.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        '"email": ""',
        '"email": "research@example.com"',
      ),
    });
  });
  await page.goto("/contact.html");
  await expect(
    page.getByRole("link", { name: "research@example.com" }),
  ).toHaveAttribute("href", "mailto:research%40example.com");
  await page.getByRole("button", { name: "复制邮箱" }).click();
  await expect(page.locator(".copy-status")).toHaveText("邮箱已复制。");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "research@example.com",
  );
});

test("键盘跳转、低动态偏好与320px小屏", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/home.html");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到主要内容" })).toBeFocused();
  await expect(
    page.getByRole("link", { name: "跳到主要内容" }),
  ).toBeInViewport();
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("图片与脚本使用本地资源，站点能在子目录下浏览", async ({ page }) => {
  await page.route("http://127.0.0.1:4175/preview/**", async (route) => {
    const url = route.request().url().replace("/preview/", "/");
    await route.fulfill({ response: await page.request.get(url) });
  });
  await page.goto("/preview/home.html");
  await page.getByRole("link", { name: "探索产品平台" }).click();
  await expect(page).toHaveURL(/\/preview\/products.html$/);
  await page.getByRole("link", { name: "查看 NEX 500", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("NEX 500");
  for (const url of views.map((v) => v[0])) {
    await page.goto("/" + url);
    const remote = await page
      .locator('img, script[src], link[rel="stylesheet"]')
      .evaluateAll((els) =>
        els
          .map((el) => el.src || el.href)
          .filter((url) => !url.startsWith(location.origin)),
      );
    expect(remote).toEqual([]);
  }
});

async function measureContentLayout(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const measureContainer = (selector) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const leftInset = parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
      const rightInset = parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth);
      return {
        left: rect.left,
        width: rect.width,
        contentLeft: rect.left + leftInset,
        contentWidth: rect.width - leftInset - rightInset,
      };
    };
    return {
      hero: measureContainer("#main > .page-hero > .container"),
      content: measureContainer("#main > .page-content > .container"),
      main: measureContainer(".page-layout-main"),
      titleLeft: document.querySelector(".page-hero h1").getBoundingClientRect().left,
      viewportWidth: document.documentElement.clientWidth,
      sidebar: {
        position: getComputedStyle(document.querySelector(".page-index")).position,
        right: document.querySelector(".page-index").getBoundingClientRect().right,
      },
    };
  });
}

function expectCenteredContentLayout(actual, label) {
  for (const metric of ["left", "width", "contentLeft", "contentWidth"])
    expect(Math.abs(actual.hero[metric] - actual.content[metric]), `${label} 标题与正文容器 ${metric} 一致`).toBeLessThan(1);
  expect(Math.abs(actual.titleLeft - actual.main.contentLeft), `${label} 标题与正文左边线对齐`).toBeLessThan(1);
  expect(Math.abs(actual.main.left + actual.main.width / 2 - actual.viewportWidth / 2), `${label} 正文整体居中`).toBeLessThan(1);
  if (actual.sidebar.position === "fixed")
    expect(actual.sidebar.right, `${label} 侧栏位于正文之外`).toBeLessThan(actual.main.left);
}

test("团队介绍居中且与标题对齐，正文随容器自然换行", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const readings = [];
  for (const width of [390, 768, 1200, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/about.html");
    await page.locator(".about-page-intro").waitFor({ state: "visible" });
    expectCenteredContentLayout(await measureContentLayout(page), `${width}px 关于我们`);
    const reading = await page.evaluate(async () => {
      await document.fonts.ready;
      const intro = document.querySelector(".about-page-intro");
      const container = intro.parentElement;
      const containerBox = container.getBoundingClientRect();
      const containerStyle = getComputedStyle(container);
      const insetLeft = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.borderLeftWidth);
      const insetRight = parseFloat(containerStyle.paddingRight) + parseFloat(containerStyle.borderRightWidth);
      const introBox = intro.getBoundingClientRect();
      const paragraphs = [...intro.querySelectorAll(":scope > p")];
      const range = document.createRange();
      range.selectNodeContents(paragraphs[0]);
      const lineTops = [...range.getClientRects()]
        .filter((rect) => rect.width > .5 && rect.height > 0)
        .map((rect) => Math.round(rect.top));
      return {
        containerWidth: containerBox.width - insetLeft - insetRight,
        containerLeft: containerBox.left + insetLeft,
        width: introBox.width,
        left: introBox.left,
        lineCount: new Set(lineTops).size,
        paragraphWidths: paragraphs.map((p) => p.getBoundingClientRect().width),
        paragraphsFit: paragraphs.every((p) => p.scrollWidth <= p.clientWidth + 1),
        pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        styleVersions: [...document.querySelectorAll('link[rel="stylesheet"]')]
          .map((link) => new URL(link.href))
          .filter((url) => /\/(custom|enhancements)\.css$/.test(url.pathname))
          .map((url) => url.searchParams.get("v")),
      };
    });
    expect(Math.abs(reading.width - reading.containerWidth), `${width}px 介绍宽度`).toBeLessThan(1);
    expect(Math.abs(reading.left - reading.containerLeft), `${width}px 介绍左对齐`).toBeLessThan(1);
    for (const paragraphWidth of reading.paragraphWidths)
      expect(Math.abs(paragraphWidth - reading.width), `${width}px 正文宽度`).toBeLessThan(1);
    expect(reading.paragraphsFit, `${width}px 正文换行`).toBe(true);
    expect(reading.pageFits, `${width}px 页面不溢出`).toBe(true);
    expect(reading.styleVersions).toHaveLength(2);
    expect(reading.styleVersions.every(Boolean), "关键样式有版本标记以避开旧缓存").toBe(true);
    readings.push(reading);
  }
  expect(readings[1].width).toBeGreaterThan(readings[0].width);
  expect(readings[2].width).toBeGreaterThan(readings[1].width);
  // 只比较相对行数，不把测试绑定到某台设备的中文字体度量。
  expect(readings[0].lineCount).toBeGreaterThan(readings[2].lineCount);
});

for (const width of [390, 768, 1200, 1440, 1920, 2560]) {
  test(`重点项目在 ${width}px 保持横向关键词与对齐图片`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/projects.html");
    await page.locator(".project-entry").first().waitFor({ state: "visible" });
    expectCenteredContentLayout(await measureContentLayout(page), `${width}px 重点项目`);
    const layout = await page.evaluate(async () => {
      await document.fonts.ready;
      const box = (element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      };
      const container = document.querySelector(".page-layout-main") || document.querySelector(".page-content > .container");
      const containerStyle = getComputedStyle(container);
      const contentWidth = container.getBoundingClientRect().width
        - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);
      return {
        pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        contentWidth,
        copyWidths: [...document.querySelectorAll(".project-copy, .project-copy > p")].map((element) => element.getBoundingClientRect().width),
        styleVersions: [...document.querySelectorAll('link[rel="stylesheet"]')]
          .map((link) => new URL(link.href))
          .filter((url) => /\/(custom|enhancements)\.css$/.test(url.pathname))
          .map((url) => url.searchParams.get("v")),
        topics: [...document.querySelectorAll(".project-topics")].map((list) => ({
          marker: getComputedStyle(list).listStyleType,
          bounds: box(list),
          tags: [...list.children].map(box),
        })),
        galleries: [...document.querySelectorAll(".project-gallery:not(.project-gallery-single)")].map((gallery) => ({
          bounds: box(gallery),
          frames: [...gallery.querySelectorAll(".project-image")].map(box),
          images: [...gallery.querySelectorAll(".project-image img")].map(box),
        })),
      };
    });
    expect(layout.pageFits).toBe(true);
    for (const copyWidth of layout.copyWidths) {
      expect(Math.abs(copyWidth - layout.contentWidth), `${width}px 项目正文跟随主内容列`).toBeLessThan(1);
    }
    expect(layout.styleVersions).toHaveLength(2);
    expect(layout.styleVersions.every(Boolean), "关键样式有版本标记以避开旧缓存").toBe(true);
    expect(layout.topics).toHaveLength(4);
    for (const topic of layout.topics) {
      expect(topic.marker).toBe("none");
      expect(topic.tags).toHaveLength(3);
      expect(Math.abs(topic.tags[0].top - topic.tags[1].top)).toBeLessThan(1);
      expect(topic.tags[1].left).toBeGreaterThanOrEqual(topic.tags[0].right);
      for (const tag of topic.tags) {
        expect(tag.left).toBeGreaterThanOrEqual(topic.bounds.left - 1);
        expect(tag.right).toBeLessThanOrEqual(topic.bounds.right + 1);
      }
    }
    expect(layout.galleries).toHaveLength(2);
    for (const gallery of layout.galleries) {
      expect(gallery.frames).toHaveLength(2);
      const [first, second] = gallery.frames;
      expect(Math.abs(first.width - second.width)).toBeLessThan(1);
      expect(Math.abs(first.height - second.height)).toBeLessThan(1);
      if (width >= 768) {
        expect(Math.abs(first.top - second.top)).toBeLessThan(1);
        expect(second.left).toBeGreaterThanOrEqual(first.right);
      } else {
        expect(Math.abs(first.left - second.left)).toBeLessThan(1);
        expect(second.top).toBeGreaterThan(first.bottom);
      }
      for (const [index, image] of gallery.images.entries()) {
        const frame = gallery.frames[index];
        expect(Math.abs(image.width - frame.width)).toBeLessThan(1);
        expect(Math.abs(image.height - frame.height)).toBeLessThan(1);
        expect(frame.right).toBeLessThanOrEqual(gallery.bounds.right + 1);
      }
    }
  });
}
