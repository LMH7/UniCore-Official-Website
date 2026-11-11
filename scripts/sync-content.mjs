import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJSON = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const products = await readJSON("content/products.json");
const content = await readJSON("content/site-content.json");
const config = await readJSON("config/public.json");
const context = vm.createContext({ URL });
vm.runInContext(await readFile(resolve(root, "site/assets/js/content-contract.js"), "utf8"), context);
context.ContentContract.validateProducts(products);
context.ContentContract.validateContent(content);

function base(value, name) {
  const u = new URL(value);
  if (!value.endsWith("/") || /[\s\\]/.test(value) || u.username || u.password || u.search || u.hash ||
      (u.protocol !== "https:" && !(u.protocol === "http:" && ["127.0.0.1", "localhost"].includes(u.hostname))))
    throw new Error(`${name} must be an HTTPS directory URL ending in / (loopback HTTP is allowed)`);
  return u;
}
if (!["local", "api"].includes(config.source)) throw new Error("source must be local or api");
if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 250 || config.timeoutMs > 10000) throw new Error("timeoutMs must be 250..10000");
const api = base(config.apiBase, "apiBase");
const assets = base(config.assetBase, "assetBase");
const images = [content.logo, content.qrImage, ...products.map(p => p.image), ...content.contacts.map(c => c.qrImage)].filter(Boolean);
for (const path of images) {
  if (path.startsWith("assets/images/")) await access(resolve(root, "site", path));
  else if (new URL(path).protocol !== "https:") throw new Error("Public image URLs must use HTTPS");
}
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, sort(value[k])])) : value;
const version = createHash("sha256").update(JSON.stringify(sort({products, content}))).digest("hex").slice(0, 16);
const pretty = value => JSON.stringify(value, null, 2);
const js = value => pretty(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const meta = { version, apiVersion: "v1" };
const imageOrigins = [...new Set([assets.origin, ...images.filter(p => !p.startsWith("assets/")).map(p => new URL(p).origin)])].sort();
const outputs = {
  "site/assets/js/products.js": `/* Generated from content/products.json. Run npm run sync. */\nwindow.PRODUCTS = ${js(products)};\n`,
  "site/assets/js/site-content.js": `/* Generated from content/site-content.json. Run npm run sync. */\nwindow.CONTENT_VERSION = "${version}";\nwindow.SITE_CONTENT = ${js(content)};\n`,
  "site/assets/js/data-config.js": `/* Generated from config/public.json. Run npm run sync. */\nwindow.DATA_CONFIG = Object.freeze(${js({source: config.source, apiBase: config.apiBase, timeoutMs: config.timeoutMs})});\n`,
  "backend/data/snapshot.json": pretty({version, assetBase: config.assetBase, products, content}) + "\n",
  "docs/api-examples/products.json": pretty({data: products, meta}) + "\n",
  "docs/api-examples/site-content.json": pretty({data: content, meta}) + "\n",
  "site/_headers": `# Generated from config/public.json and content/*.json. Run npm run sync.\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${imageOrigins.join(" ")}; font-src 'self'; connect-src 'self' ${api.origin}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n`,
};
const changed = [];
for (const [path, next] of Object.entries(outputs)) {
  const target = resolve(root, path);
  const current = await readFile(target, "utf8").catch(e => { if (e.code !== "ENOENT") throw e; return null; });
  if (current?.replace(/\r\n/g, "\n") === next) continue;
  changed.push(path);
  if (!process.argv.includes("--check")) {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, next, "utf8");
  }
}
if (process.argv.includes("--check") && changed.length) throw new Error(`Generated content is stale; run npm run sync:\n${changed.join("\n")}`);
console.log(`Content ${version}: ${changed.length ? changed.length + " generated files " + (process.argv.includes("--check") ? "stale" : "updated") : "in sync"}`);
