// Inspect the published website and real API without changing either service.
import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const config = JSON.parse(await readFile(new URL("../config/public.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../backend/data/snapshot.json", import.meta.url), "utf8"));
const option = key => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : undefined;
const base = option("--base") || config.siteBase;
const expectedSource = option("--source") || config.source;
const checkHeaders = process.argv.includes("--edgeone");
const reportDir = option("--output") || "artifacts/live-final";
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
});
const results = [];
await mkdir(reportDir, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 960 }, reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.policyViolations = [];
    document.addEventListener("securitypolicyviolation", e => policyViolations.push(`${e.violatedDirective}: ${e.blockedURI}`));
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of ["index.html", "home.html", "products.html", "product.html?id=nex-500",
      "solutions.html", "resources.html", "projects.html", "publications.html", "about.html", "contact.html"]) {
      const url = new URL(path, base);
      url.searchParams.set("check", snapshot.version);
      const response = await page.goto(url.href, { timeout: 60000 });
      assert.equal(response.status(), 200, path);
      if (checkHeaders) {
        assert.match(response.headers()["content-security-policy"] || "", /script-src 'self';/, path + ": missing CSP");
        assert.equal(response.headers()["x-content-type-options"], "nosniff", path + ": missing security header");
      }
      let state;
      if (path !== "index.html") {
        state = await page.evaluate(() => window.SiteData.ready);
        assert.equal(state.source, expectedSource, `${path}: ${state.reason || state.source}`);
        assert.equal(state.version, snapshot.version, `${path}: wrong content release`);
        await page.evaluate(() => window.INTERACTIONS_READY);
      }
      const broken = await page.locator("img[src]").evaluateAll(async images => {
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
      assert.deepEqual(await page.evaluate(() => policyViolations), [], path + ": CSP violations");
      if (["index.html", "home.html", "about.html", "contact.html"].includes(path))
        await page.screenshot({ path: `${reportDir}/${path.replace(".html", "")}-${width}.png`, fullPage: true });
      results.push({ path, width, status: response.status(), source: state?.source, version: state?.version, images: "passed" });
      console.log(`PASS ${width}px ${path}${state ? " source=" + state.source : ""}`);
    }
  }
  const missing = await page.goto(new URL("missing/deep/path", base).href);
  assert.equal(missing.status(), 404, "deep URL must return a real 404");
  await page.getByRole("link", { name: "返回首页", exact: true }).click();
  assert.equal(new URL(page.url()).pathname, new URL("home.html", base).pathname, "404 return path");
  console.log("PASS deep 404 and return to homepage");
} finally {
  await browser.close();
}
await writeFile(`${reportDir}/results.json`, JSON.stringify({
  checkedAt: new Date().toISOString(), base, version: snapshot.version, results,
}, null, 2) + "\n");
console.log(`PASS ${results.length} views and deep 404; report in ${reportDir}/results.json`);
