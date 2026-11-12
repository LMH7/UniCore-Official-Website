// Inspect the published website and real API without changing either service.
import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const config = JSON.parse(await readFile(new URL("../config/public.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../backend/data/snapshot.json", import.meta.url), "utf8"));
const base = config.assetBase;
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
});
const results = [];
await mkdir("artifacts/live-final", { recursive: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const path of ["index.html", "home.html", "products.html", "product.html?id=nex-500",
      "solutions.html", "resources.html", "projects.html", "publications.html", "about.html", "contact.html"]) {
      const url = new URL(path, base);
      url.searchParams.set("check", snapshot.version);
      const response = await page.goto(url.href, { timeout: 60000 });
      assert.equal(response.status(), 200, path);
      let state;
      if (path !== "index.html") {
        state = await page.evaluate(() => window.SiteData.ready);
        assert.equal(state.source, config.source, `${path}: ${state.reason || state.source}`);
        assert.equal(state.version, snapshot.version, `${path}: wrong content release`);
        await page.evaluate(() => window.INTERACTIONS_READY);
      }
      const broken = await page.locator("img").evaluateAll(async images => {
        images.forEach(img => { img.loading = "eager"; });
        await Promise.all(images.map(img => img.decode().catch(() => {})));
        return images.filter(img => img.naturalWidth === 0).map(img => img.getAttribute("src"));
      });
      assert.deepEqual(broken, [], path + ": broken image");
      const sizes = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth, viewport: innerWidth,
      }));
      assert.ok(sizes.content <= sizes.viewport + 1, path + ": horizontal overflow");
      assert.deepEqual(errors, [], path + ": script errors");
      if (["index.html", "home.html", "about.html", "contact.html"].includes(path))
        await page.screenshot({ path: `artifacts/live-final/${path.replace(".html", "")}-${width}.png`, fullPage: true });
      results.push({ path, width, status: response.status(), source: state?.source, version: state?.version, images: "passed" });
      console.log(`PASS ${width}px ${path}${state ? " source=" + state.source : ""}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile("artifacts/live-final/results.json", JSON.stringify({
  checkedAt: new Date().toISOString(), base, version: snapshot.version, results,
}, null, 2) + "\n");
console.log(`PASS ${results.length} public views; report in artifacts/live-final/results.json`);
