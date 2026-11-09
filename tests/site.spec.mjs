import { test, expect } from "@playwright/test";

const views = [
  ["index.html", /让研究想法，\s*真正起飞。/],
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
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "展开导航菜单" });
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
  await page.goto("/");
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
  await expect(page).toHaveURL("http://127.0.0.1:4175/index.html");
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
        'email: ""',
        'email: "research@example.com"',
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
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到主要内容" })).toBeFocused();
  await expect(
    page.getByRole("link", { name: "跳到主要内容" }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
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
  await page.goto("/preview/index.html");
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
