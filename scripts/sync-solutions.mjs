import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const site = fileURLToPath(new URL("../site/", import.meta.url));
const check = process.argv.includes("--check");
const sources = await Promise.all(
  ["site-content.js", "products.js", "layout.js", "app.js"].map(
    async (filename) => ({
      filename,
      source: await readFile(path.join(site, "assets/js", filename), "utf8"),
    }),
  ),
);

// 使用浏览器里的同一份模板生成内容，不维护另一套方案文案和 HTML。
const header = { dataset: {}, innerHTML: "", querySelector: () => null };
const footer = { innerHTML: "" };
const solutions = { dataset: {}, innerHTML: "", querySelector: () => null };
const sandbox = {
  SiteData: { ready: Promise.resolve() },
  document: {
    body: { dataset: { page: "solutions" } },
    getElementById(id) {
      if (id === "site-header") return header;
      if (id === "site-footer") return footer;
      throw new Error(`Unexpected layout element: ${id}`);
    },
    querySelector(selector) {
      return selector === "[data-full-solutions]" ? solutions : null;
    },
    querySelectorAll() {
      return [];
    },
  },
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
for (const { filename, source } of sources)
  vm.runInContext(source, context, { filename });
await Promise.all([context.LAYOUT_READY, context.APP_READY]);
if (!solutions.innerHTML || !solutions.dataset.solutionsKey)
  throw new Error("Solutions did not render");

const filepath = path.join(site, "solutions.html");
const html = await readFile(filepath, "utf8");
const containers = [
  ...html.matchAll(
    /<div\b(?=[^>]*\bdata-full-solutions\b)[^>]*>[\s\S]*?<\/div>(?=\s*<div class="info-note")/gi,
  ),
];
if (containers.length !== 1)
  throw new Error("solutions.html: expected one solutions container before info-note");
const opening = containers[0][0]
  .match(/^<div\b[^>]*>/i)[0]
  .replace(/\sdata-solutions-key="[^"]*"/gi, "")
  .replace(/>$/, ` data-solutions-key="${solutions.dataset.solutionsKey}">`);
const next = html.replace(
  containers[0][0],
  () => `${opening}${solutions.innerHTML}</div>`,
);
if (next !== html) {
  if (check) {
    console.error("方案内容未同步。请运行 npm run sync:solutions。");
    process.exitCode = 1;
  } else {
    await writeFile(filepath, next, "utf8");
    console.log("方案同步完成：已更新 solutions.html。");
  }
} else {
  console.log(check ? "方案内容检查通过。" : "方案同步完成：内容已是最新。");
}
