import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// 在独立的无头浏览器中保存本地页面截图；先运行 npm run dev。
const browser = await chromium.launch({ channel: "msedge" });
await mkdir("artifacts/screenshots", { recursive: true });
try {
  for (const [name, width, height, url] of [
    ["home-desktop", 1440, 1000, "/"],
    ["home-mobile", 390, 844, "/"],
    ["product-mobile", 390, 844, "/product.html?id=nex-500"],
    ["solutions-desktop", 1440, 1000, "/solutions.html"],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await page.goto("http://127.0.0.1:4173" + url);
    await page.evaluate(async () => {
      for (const img of document.images) {
        img.loading = "eager";
        await img.decode().catch(() => {});
      }
      await document.fonts.ready;
    });
    await page.screenshot({
      path: `artifacts/screenshots/${name}.png`,
      fullPage: true,
    });
    if (name === "home-desktop")
      await page.screenshot({
        path: "artifacts/screenshots/home-first-screen.png",
      });
    await page.close();
    console.log(`已保存 ${name}`);
  }
} finally {
  await browser.close();
}
