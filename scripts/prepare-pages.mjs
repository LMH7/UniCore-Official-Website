import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const repository =
  process.env.GITHUB_REPOSITORY || "LMH7/UniCore-Official-Website";
const [owner, name] = repository.split("/");
const base =
  name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "/" : `/${name}/`;
const source = path.join(root, "site");
const output = path.join(root, "artifacts/github-pages");
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
      versions.set(filepath, createHash("sha256").update(content).digest("hex").slice(0, 12));
    }
    const query = new URLSearchParams(search.replace(/&amp;/g, "&"));
    query.set("v", versions.get(filepath));
    const versioned = `${assetPath}?${query.toString().replace(/&/g, "&amp;")}${fragment}`;
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
await cp(source, output, { recursive: true });
const filename = path.join(output, "404.html");
await writeFile(
  filename,
  errorPage.replace(baseElement, `<base href="${base}" />`),
);
for (const htmlPath of await htmlFiles(output)) {
  const html = await readFile(htmlPath, "utf8");
  await writeFile(htmlPath, await versionAssets(html, htmlPath), "utf8");
}
await checkEntry(output);
await writeFile(path.join(output, ".nojekyll"), "");
console.log(`GitHub Pages 发布目录：${output}，入口为互动封面，已为 ${versions.size} 个脚本和样式添加内容版本，错误页返回路径：${base}`);
