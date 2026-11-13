import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../site/", import.meta.url)));
const errors = [];
const context = vm.createContext({ window: {} });
for (const filename of ["site-content.js", "products.js"])
  vm.runInContext(
    await readFile(path.join(root, "assets/js", filename), "utf8"),
    context,
    { filename },
  );
const { PRODUCTS, SITE_CONTENT } = context.window;
const ids = new Set();
for (const p of PRODUCTS) {
  if (!/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id))
    errors.push(`产品 id 不合法或重复：${p.id}`);
  ids.add(p.id);
  for (const key of ["name", "summary", "image", "imageAlt", "sensor"])
    if (!p[key]) errors.push(`${p.id} 缺少 ${key}`);
  try {
    if (!/^https:\/\//.test(p.image)) await stat(path.join(root, p.image));
  } catch {
    errors.push(`产品图片不存在：${p.image}`);
  }
}
const pages = (await readdir(root)).filter((f) => f.endsWith(".html"));
for (const page of pages) {
  const html = await readFile(path.join(root, page), "utf8");
  if (!html.includes('lang="zh-CN"')) errors.push(`${page} 缺少中文语言标记`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${page} 缺少标题`);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|#|\/)/i.test(href)) continue;
    const file = href.split(/[?#]/)[0];
    try {
      if (!(await stat(path.join(root, file))).isFile())
        errors.push(`${page} 链接不是文件：${href}`);
    } catch {
      errors.push(`${page} 链接不存在：${href}`);
    }
  }
}
for (const asset of [
  SITE_CONTENT.logo,
  ...SITE_CONTENT.contacts.map((c) => c.qrImage),
]) {
  if (!asset || /^https:\/\//.test(asset)) continue;
  try {
    await stat(path.join(root, asset));
  } catch {
    errors.push(`品牌或联系素材不存在：${asset}`);
  }
}
if (!SITE_CONTENT.email)
  console.log("提示：未配置邮箱；联系页使用已提供的微信与 LinkedIn。");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `检查通过：${pages.length} 个页面，${PRODUCTS.length} 条产品记录，静态路径与图片均存在。`,
);
