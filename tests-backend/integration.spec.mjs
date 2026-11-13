import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../config/public.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../backend/data/snapshot.json", import.meta.url), "utf8"));
const headers = await readFile(new URL("../site/_headers", import.meta.url), "utf8");
const policy = headers.match(/Content-Security-Policy: (.+)/)[1];
const ready = page => page.evaluate(() => window.INTERACTIONS_READY);
async function imagesLoaded(page) {
  expect(await page.locator("img").evaluateAll(async imgs => {
    imgs.forEach(img => { img.loading = "eager"; });
    await Promise.all(imgs.map(img => img.decode().catch(() => {})));
    return imgs.every(img => img.naturalWidth > 0);
  })).toBe(true);
}

test("真实后端贯通产品列表、详情、实验室介绍和联系图片", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/products.html");
  await ready(page);
  const state = await page.evaluate(() => SiteData.ready);
  expect(state.source).toBe("api");
  expect(state.version).toBe(snapshot.version);
  expect(state.fallback).toBe(false);
  await expect(page.locator(".product-card")).toHaveCount(snapshot.products.length);
  await imagesLoaded(page);
  await page.getByRole("link", {name: "查看 NEX 500", exact: true}).click();
  await expect(page.locator("h1")).toHaveText("NEX 500");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("NEX 500");
  await page.goto("/about.html");
  await ready(page);
  await expect(page.locator(".about-labs")).toContainText("跨域智能飞行");
  await imagesLoaded(page);
  await page.goto("/contact.html?product=nex-500");
  await ready(page);
  await expect(page.locator(".contact-channel")).toHaveCount(2);
  await imagesLoaded(page);
  expect(errors).toEqual([]);
});

async function crossOrigin(page, csp = policy) {
  // Edge requires a separate permission for requests to another loopback port.
  await page.context().grantPermissions(["local-network-access"], { origin: "http://127.0.0.1:4181" });
  // Use actual generated hosting policy, substituting the test server origins.
  let localPolicy = csp.replaceAll(new URL(config.assetBase).origin, "http://127.0.0.1:4180");
  if (config.apiBase) localPolicy = localPolicy.replaceAll(new URL(config.apiBase).origin, "http://127.0.0.1:4180");
  // A local-only release deliberately has no API origin in its hosting policy.
  // Add the test API origin only when this test asks for the permissive policy.
  if (csp === policy && !config.apiBase)
    localPolicy = localPolicy.replace(/connect-src [^;]+/, "connect-src 'self' http://127.0.0.1:4180");
  await page.route("http://127.0.0.1:4181/**/*.html", async route => {
    const r = await route.fetch();
    await route.fulfill({response: r, headers: {...r.headers(), "content-security-policy": localPolicy}});
  });
  await page.route("http://127.0.0.1:4181/assets/js/data-config.js", route => route.fulfill({
    contentType: "text/javascript", body: 'window.DATA_CONFIG = Object.freeze({source:"api",apiBase:"http://127.0.0.1:4180/api/v1/",timeoutMs:1000});',
  }));
}

test("分开部署时真实跨域请求与生成的图片许可均生效", async ({ page }) => {
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await crossOrigin(page);
  await page.goto("http://127.0.0.1:4181/products.html");
  await ready(page);
  expect((await page.evaluate(() => SiteData.ready)).source).toBe("api");
  await imagesLoaded(page);
  expect(errors).toEqual([]);
});

test("浏览器阻止连接时整体回退本地内容", async ({ page }) => {
  await crossOrigin(page, policy.replace(/connect-src [^;]+/, "connect-src 'self'"));
  await page.goto("http://127.0.0.1:4181/products.html");
  await ready(page);
  expect((await page.evaluate(() => SiteData.ready)).fallback).toBe(true);
  await expect(page.locator(".product-card")).toHaveCount(snapshot.products.length);
  await expect(page.locator(".content-fallback")).toBeVisible();
});

test("两个接口发布版本不一致时不会混合显示", async ({ page }) => {
  await page.route("**/api/v1/site-content", async route => {
    const r = await route.fetch();
    const data = await r.json();
    data.meta.version = "0000000000000000";
    data.data.brand = "should never appear";
    await route.fulfill({response: r, json: data});
  });
  await page.goto("/products.html");
  await ready(page);
  const state = await page.evaluate(() => SiteData.ready);
  expect(state.fallback).toBe(true);
  expect(state.content.brand).toBe(snapshot.content.brand);
  expect(state.reason).toContain("versions differ");
  await expect(page.locator(".content-fallback")).toBeVisible();
});
