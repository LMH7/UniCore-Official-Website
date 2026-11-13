import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.policyViolations = [];
    document.addEventListener("securitypolicyviolation", e => window.policyViolations.push(`${e.violatedDirective}: ${e.blockedURI}`));
  });
});

test("安全策略生效时封面可切换、主题可恢复，夜空按需下载", async ({ page }) => {
  const requests = [];
  page.on("request", req => requests.push(req.url()));
  const response = await page.goto("/");
  expect(response.headers()["content-security-policy"]).toContain("script-src 'self';");
  await expect(page.locator("#cover-theme-toggle")).toBeVisible();
  expect(requests.filter(url => url.includes("cover-sky-night"))).toEqual([]);
  await page.locator("#cover-theme-toggle").focus();
  await page.keyboard.down("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-cover-theme", "night");
  await page.keyboard.up("Enter");
  expect(requests.some(url => url.includes("cover-sky-night-realistic.webp"))).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-cover-theme", "night");
  await page.getByRole("link", { name: "进入首页", exact: true }).click();
  await expect(page).toHaveURL(/\/home.html$/);
  expect(await page.evaluate(() => window.policyViolations)).toEqual([]);
});

for (const width of [390, 1440]) test(`${width}px 发布副本：页面、图片、安全策略和深层404`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  for (const path of ["index.html", "home.html", "products.html", "product.html?id=nex-500", "solutions.html", "resources.html", "about.html", "projects.html", "publications.html", "contact.html", "credits.html", "welcome.html"]) {
    const response = await page.goto("/" + path);
    expect(response.status(), path).toBe(200);
    if (!["index.html", "welcome.html"].includes(path)) {
      expect((await page.evaluate(() => SiteData.ready)).source).toBe("local");
      await page.evaluate(() => INTERACTIONS_READY);
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
    const broken = await page.locator("img[src]").evaluateAll(async images => {
      images.forEach(image => { image.loading = "eager"; });
      await Promise.all(images.map(image => image.decode().catch(() => {})));
      return images.filter(image => !image.naturalWidth).map(image => image.src);
    });
    expect(broken, path).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    expect(await page.evaluate(() => policyViolations), path).toEqual([]);
    expect(errors, path).toEqual([]);
    if (["index.html", "publications.html"].includes(path)) await page.screenshot({ path: `artifacts/edgeone-preview/${path}-${width}.png`, fullPage: true });
  }
  const response = await page.goto("/missing/deep/path");
  expect(response.status()).toBe(404);
  expect(await page.locator("base").getAttribute("href")).toBe("/");
  await page.getByRole("link", { name: "返回首页", exact: true }).click();
  await expect(page).toHaveURL(/\/home.html$/);
});
