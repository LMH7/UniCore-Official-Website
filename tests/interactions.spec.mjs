import { test, expect } from "@playwright/test";

const ready = (page) => page.evaluate(() => window.INTERACTIONS_READY);

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
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
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
  await page.goto("/");
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
  const toggle = page.getByRole("button", { name: "展开导航菜单" });
  await toggle.click();
  await expect(page.locator("#main-navigation")).toHaveClass(/show/);
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("减少动态效果时内容可直接阅读，hover仍有反馈", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
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
  const apiCalls = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) apiCalls.push(req.url());
  });
  await page.goto("/");
  await ready(page);
  expect(await page.evaluate(async () => (await SiteData.ready).source)).toBe(
    "local",
  );
  expect(apiCalls).toEqual([]);
});

async function apiMode(page, timeout = 500) {
  await page.route("**/data-service.js", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /source:\s*"local",\s*apiBase:\s*"",\s*timeoutMs:\s*5000/,
      `source: "api", apiBase: "/api/v1/", timeoutMs: ${timeout}`,
    );
    await route.fulfill({ response, body });
  });
}

test("预留数据层能读取API返回并同步列表与详情，无需真实后端", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  const { products, content } = await page.evaluate(async () => {
    const d = await SiteData.ready;
    return { products: d.products, content: d.content };
  });
  products[0].name = "接口测试平台";
  await apiMode(page);
  await page.route("**/api/v1/products", (r) =>
    r.fulfill({ json: { data: products } }),
  );
  await page.route("**/api/v1/site-content", (r) =>
    r.fulfill({ json: { data: content } }),
  );
  await page.goto("/");
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
  await page.goto("/");
  await ready(page);
  const content = await page.evaluate(() => SITE_CONTENT);
  content.contacts = [];
  await apiMode(page);
  await page.route("**/api/v1/products", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/v1/site-content", (r) =>
    r.fulfill({ json: { data: content } }),
  );
  await page.goto("/products.html");
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(0);
  await expect(page.locator("#products-empty")).toBeVisible();
  await expect(page.locator(".content-fallback")).toHaveCount(0);
  await expect(page.locator("[data-contact-qr]")).toHaveCount(0);
  await page.goto("/");
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
