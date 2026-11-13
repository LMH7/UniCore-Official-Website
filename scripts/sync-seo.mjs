import { readFile, writeFile, readdir } from "node:fs/promises";
import { publicConfig, seoHTML, sitemap, robots } from "./deployment-config.mjs";

const root = new URL("../", import.meta.url);
const site = new URL("site/", root);
const config = await publicConfig(root);
const products = JSON.parse(await readFile(new URL("content/products.json", root), "utf8"));
const pages = (await readdir(site)).filter(p => p.endsWith(".html"));
const outputs = {
  "sitemap.xml": sitemap(pages, products, config.siteBase),
  "robots.txt": robots(config.siteBase),
};
for (const page of pages) outputs[page] = seoHTML(await readFile(new URL(page, site), "utf8"), page, config);
const changed = [];
for (const [name, next] of Object.entries(outputs)) {
  const current = await readFile(new URL(name, site), "utf8").catch(e => { if (e.code !== "ENOENT") throw e; return ""; });
  if (current.replace(/\r\n/g, "\n") === next.replace(/\r\n/g, "\n")) continue;
  changed.push(name);
  if (!process.argv.includes("--check")) await writeFile(new URL(name, site), next);
}
if (changed.length && process.argv.includes("--check")) throw new Error(`SEO is stale; run npm run sync:\n${changed.join("\n")}`);
console.log(`SEO: ${changed.length} ${process.argv.includes("--check") ? "stale" : "updated"}; canonical base ${config.siteBase}`);
