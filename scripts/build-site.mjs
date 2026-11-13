import { cp, copyFile, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { publicConfig, directoryURL, seoHTML, sitemap, robots } from "./deployment-config.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const provider = process.argv.includes("--edgeone") ? "edgeone" : "github";
const config = await publicConfig();
const repository = process.env.GITHUB_REPOSITORY || "LMH7/UniCore-Official-Website";
if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw new Error("Invalid GITHUB_REPOSITORY");
const [owner, name] = repository.split("/");
const githubBase = name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "/" : `/${name}/`;
const githubURL = `https://${owner.toLowerCase()}.github.io${githubBase}`;
const mode = provider === "edgeone" ? process.env.DEPLOY_MODE || "preview" : "production";
if (!["production", "preview"].includes(mode)) throw new Error("DEPLOY_MODE must be production or preview");
let siteBase = config.siteBase;
if (provider === "edgeone") {
  siteBase = process.env.SITE_URL || null;
  if (siteBase && directoryURL(siteBase, "SITE_URL").pathname !== "/") throw new Error("EdgeOne SITE_URL must use the root path /");
  if (mode === "production" && !siteBase) throw new Error("Production requires SITE_URL (HTTPS, ending in /). Use preview until a domain is ready.");
}
const indexable = provider === "edgeone" ? mode === "production" : config.siteBase === githubURL;
const assetBase = provider === "edgeone" ? siteBase : config.assetBase;
const dataSource = provider === "edgeone" && mode === "preview" ? "local" : config.source;
const base = provider === "edgeone" ? "/" : githubBase;
const source = path.join(root, "site");
const output = path.join(root, provider === "edgeone" ? "artifacts/edgeone-pages" : "artifacts/github-pages");
for (const script of ["sync-content.mjs", "sync-seo.mjs", "sync-cover.mjs", "sync-navigation.mjs", "sync-solutions.mjs"]) {
  execFileSync(process.execPath, [path.join(root, "scripts", script), "--check"], { stdio: "inherit" });
}
execFileSync(process.execPath, [path.join(root, "scripts/check.mjs")], { stdio: "inherit" });
const baseElement = /<base\s+href=["']\/["']\s*\/?>/i;

async function checkEntry(directory) {
  const [cover, home] = await Promise.all([
    readFile(path.join(directory, "index.html"), "utf8"),
    readFile(path.join(directory, "home.html"), "utf8"),
  ]);
  const coverBody = cover.match(/<body\b[^>]*>/i)?.[0] || "";
  const homeBody = home.match(/<body\b[^>]*>/i)?.[0] || "";
  if (
    !/\bdata-layout\s*=\s*["']standalone["']/i.test(coverBody) ||
    !/\bdata-page\s*=\s*["']welcome["']/i.test(coverBody) ||
    !/\bid\s*=\s*["']flight-aircraft["']/i.test(cover) ||
    !/<a\b(?=[^>]*\bhref\s*=\s*["'](?:\.\/)?home\.html["'])(?=[^>]*\bdata-cover-entry(?:\s|>|=))[^>]*>/i.test(cover) ||
    /<meta\b[^>]*\bhttp-equiv\s*=\s*["']refresh["']/i.test(cover) ||
    !/\bdata-page\s*=\s*["']home["']/i.test(homeBody)
  ) {
    throw new Error("发布入口必须是互动封面 index.html，点击进入首页后才打开 home.html；请先运行 npm run sync:cover。");
  }
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filepath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(filepath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(filepath);
  }
  return files;
}

const versions = new Map();
async function versionAssets(html, htmlPath) {
  const attributes = /(\s(?:src|href)\s*=\s*)(["'])([^"']+)\2/gi;
  let next = "";
  let cursor = 0;
  for (const match of html.matchAll(attributes)) {
    const [attribute, prefix, quote, value] = match;
    const parts = value.match(/^([^?#]+)(?:\?([^#]*))?(#.*)?$/);
    if (!parts) continue;
    const [, assetPath, search = "", fragment = ""] = parts;
    if (
      /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(assetPath) ||
      !/(?:^|\/)assets\/.*\.(?:css|js)$/i.test(assetPath)
    ) continue;
    const filepath = path.resolve(path.dirname(htmlPath), decodeURIComponent(assetPath));
    if (!filepath.startsWith(output + path.sep))
      throw new Error(`发布资源越出网站目录：${assetPath}`);
    if (!versions.has(filepath)) {
      const content = await readFile(filepath);
      const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
      const ext = path.extname(filepath);
      const fingerprint = filepath.slice(0, -ext.length) + `.${hash}${ext}`;
      await copyFile(filepath, fingerprint);
      versions.set(filepath, { hash, filename: path.basename(fingerprint) });
    }
    const versioned = `${assetPath.slice(0, assetPath.lastIndexOf("/") + 1)}${versions.get(filepath).filename}${fragment}`;
    next += html.slice(cursor, match.index) + prefix + quote + versioned + quote;
    cursor = match.index + attribute.length;
  }
  return next + html.slice(cursor);
}

// 所有生成修改只发生在发布副本；源文件不会因准备部署而改变。
await checkEntry(source);
const errorPage = await readFile(path.join(source, "404.html"), "utf8");
if (!baseElement.test(errorPage))
  throw new Error("404 页面缺少根路径 base，停止发布以免错误页链接失效。");
await rm(output, { recursive: true, force: true });
// Keep previously public image URLs on the existing GitHub host for cached pages.
const sourceOnlyImages = new Set(["cover-sky-day.png", "cover-sky-night-realistic.png", "cover-sky-night.png", "cdif-lab-logo.png", "project-simulation-reference-1.png", "project-simulation-reference-2.png"]);
await cp(source, output, { recursive: true, filter: file => provider !== "edgeone" || !sourceOnlyImages.has(path.basename(file)) });
await writeFile(path.join(output, "assets/js/data-config.js"), `/* Public deployment configuration. */\nwindow.DATA_CONFIG = Object.freeze(${JSON.stringify({ source: dataSource, apiBase: config.apiBase, timeoutMs: config.timeoutMs })});\n`);
const filename = path.join(output, "404.html");
await writeFile(
  filename,
  errorPage.replace(baseElement, `<base href="${base}" />`),
);
for (const htmlPath of await htmlFiles(output)) {
  const html = await readFile(htmlPath, "utf8");
  const next = seoHTML(html, path.basename(htmlPath), { siteBase, assetBase, indexable });
  await writeFile(htmlPath, await versionAssets(next, htmlPath), "utf8");
}
const products = JSON.parse(await readFile(path.join(root, "content/products.json"), "utf8"));
const snapshot = JSON.parse(await readFile(path.join(root, "backend/data/snapshot.json"), "utf8"));
const pages = (await readdir(output)).filter(p => p.endsWith(".html"));
await writeFile(path.join(output, "sitemap.xml"), sitemap(pages, products, siteBase, indexable));
await writeFile(path.join(output, "robots.txt"), robots(siteBase, indexable));
if (provider === "edgeone") {
  // Direct Upload accepts runtime headers/redirects/rewrites, not build settings.
  const { headers } = JSON.parse(await readFile(path.join(root, "edgeone.json"), "utf8"));
  await writeFile(path.join(output, "edgeone.json"), JSON.stringify({ headers }, null, 2) + "\n");
}
else await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "deploy-info.json"), JSON.stringify({
  provider, mode, indexable, siteBase, assetBase, source: dataSource,
  contentVersion: snapshot.version, commit: process.env.GITHUB_SHA || null,
  assets: Object.fromEntries([...versions].map(([file, entry]) => [path.relative(output, file).replaceAll(path.sep, "/"), entry.filename])),
}, null, 2) + "\n");
await checkEntry(output);
console.log(`${provider} output: ${output}; ${mode}, ${dataSource} content; ${versions.size} fingerprinted scripts/styles; 404 base ${base}`);
if (provider === "edgeone" && mode === "preview") console.log("Preview is excluded from search engines and uses the bundled content. Production requires a domain and API CORS configuration; see deploy/edgeone/README.md.");
