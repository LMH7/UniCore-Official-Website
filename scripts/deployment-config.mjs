import { readFile } from "node:fs/promises";

export function directoryURL(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute directory URL`); }
  if (typeof value !== "string" || !value.endsWith("/") || /[\s\\<>"']/.test(value) ||
      url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))))
    throw new Error(`${name} must be an HTTPS directory URL ending in / (loopback HTTP is allowed)`);
  return url;
}

export async function publicConfig(root = new URL("../", import.meta.url)) {
  const config = JSON.parse(await readFile(new URL("config/public.json", root), "utf8"));
  // Older content-generation fixtures can omit siteBase; new repositories declare it explicitly.
  config.siteBase ||= config.assetBase;
  for (const name of ["siteBase", "assetBase"]) directoryURL(config[name], name);
  if (!["local", "api"].includes(config.source)) throw new Error("source must be local or api");
  if (typeof config.apiBase !== "string") throw new Error("apiBase must be a string");
  if (config.apiBase || config.source === "api") directoryURL(config.apiBase, "apiBase");
  return config;
}

const escape = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const block = /\n?[ \t]*<!-- Deployment metadata: generated -->[\s\S]*?<!-- End deployment metadata -->\r?\n?/;

export function seoHTML(html, filename, { siteBase, assetBase, indexable = true }) {
  const privatePage = ["welcome.html", "404.html", "publications.html"].includes(filename);
  const canonical = siteBase && !["welcome.html", "404.html"].includes(filename) ? new URL(filename, siteBase).href : null;
  const tags = [];
  if (!indexable || privatePage) tags.push('<meta name="robots" content="noindex,follow" />');
  if (canonical) tags.push(`<link rel="canonical" href="${escape(canonical)}" />`, `<meta property="og:url" content="${escape(canonical)}" />`);
  if (assetBase) tags.push(`<meta property="og:image" content="${escape(new URL("assets/images/inex-social.jpg", assetBase).href)}" />`);
  // Keep titles, descriptions and other social metadata authored in each page.
  html = html.replace(block, "\n").replace(/\s*<(?:link\b(?=[^>]*\brel=["']canonical["'])|meta\b(?=[^>]*\b(?:property=["']og:(?:url|image)["']|name=["']robots["'])))[^>]*>/gi, "");
  const metadata = `\n    <!-- Deployment metadata: generated -->\n${tags.map(tag => "    " + tag).join("\n")}\n    <!-- End deployment metadata -->\n`;
  return html.replace(/(<meta\s+charset=["']utf-8["']\s*\/?>)\s*/i, "$1" + metadata + "    ");
}

export function sitemap(pages, products, siteBase, indexable = true) {
  const paths = indexable && siteBase ? [
    ...pages.filter(p => !["welcome.html", "404.html", "publications.html", "product.html"].includes(p)).sort(),
    ...products.map(p => `product.html?id=${encodeURIComponent(p.id)}`),
  ] : [];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${escape(new URL(p, siteBase).href)}</loc></url>`).join("\n")}\n</urlset>\n`;
}

export function robots(siteBase, indexable = true) {
  return indexable && siteBase
    ? `User-agent: *\nDisallow:\nSitemap: ${new URL("sitemap.xml", siteBase).href}\n`
    : "User-agent: *\nDisallow: /\n";
}

export function securityHeaders(config, imageOrigins = [], mediaOrigins = []) {
  const images = [...new Set([new URL(config.assetBase).origin, ...imageOrigins])].sort();
  const media = [...new Set(mediaOrigins)].sort();
  const connect = config.apiBase ? ` ${directoryURL(config.apiBase, "apiBase").origin}` : "";
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${images.join(" ")}; media-src 'self'${media.length ? " " + media.join(" ") : ""}; font-src 'self'; connect-src 'self'${connect}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` },
  ];
}

export function edgeoneConfig(config, imageOrigins = [], mediaOrigins = []) {
  return {
    installCommand: "npm ci",
    buildCommand: "npm run build:edgeone",
    outputDirectory: "artifacts/edgeone-pages",
    nodeVersion: "24.18.0",
    headers: [{ source: "/*", headers: securityHeaders(config, imageOrigins, mediaOrigins) }],
  };
}
