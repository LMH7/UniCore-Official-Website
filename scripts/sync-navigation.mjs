import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const site = fileURLToPath(new URL("../site/", import.meta.url));
const check = process.argv.includes("--check");
const sources = await Promise.all(
  ["site-content.js", "layout.js"].map(async (filename) => ({
    filename,
    source: await readFile(path.join(site, "assets/js", filename), "utf8"),
  })),
);

// Run the browser's single layout template with only the DOM it needs.
async function renderNavigation(page) {
  const header = {
    dataset: {},
    innerHTML: "",
    querySelector() {
      return null;
    },
  };
  const footer = { innerHTML: "" };
  const sandbox = {
    SiteData: { ready: Promise.resolve() },
    document: {
      body: { dataset: { page } },
      getElementById(id) {
        if (id === "site-header") return header;
        if (id === "site-footer") return footer;
        throw new Error(`Unexpected layout element: ${id}`);
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
  await context.LAYOUT_READY;
  if (!header.innerHTML || !header.dataset.navigationKey)
    throw new Error(`Navigation did not render for ${page}`);
  return header;
}

const pages = (await readdir(site)).filter((name) => name.endsWith(".html")).sort();
const stale = [];
for (const filename of pages) {
  const filepath = path.join(site, filename);
  const html = await readFile(filepath, "utf8");
  const page = html.match(/<body\b[^>]*\bdata-page="([^"]+)"/i)?.[1];
  const headers = [
    ...html.matchAll(/<header\b(?=[^>]*\bid="site-header")[^>]*>[\s\S]*?<\/header>/gi),
  ];
  if (!page || headers.length !== 1)
    throw new Error(`${filename}: expected one data-page and one site-header`);
  const header = await renderNavigation(page);
  const opening = headers[0][0]
    .match(/^<header\b[^>]*>/i)[0]
    .replace(/\sdata-navigation-key="[^"]*"/gi, "")
    .replace(/>$/, ` data-navigation-key="${header.dataset.navigationKey}">`);
  const next = html.replace(
    headers[0][0],
    () => `${opening}${header.innerHTML}</header>`,
  );
  if (next === html) continue;
  stale.push(filename);
  if (!check) await writeFile(filepath, next, "utf8");
}

if (check && stale.length) {
  console.error(`导航未同步：${stale.join("、")}。请运行 npm run sync:nav。`);
  process.exitCode = 1;
} else {
  console.log(
    check
      ? `导航检查通过：${pages.length} 个页面已同步。`
      : `导航同步完成：更新 ${stale.length} / ${pages.length} 个页面。`,
  );
}
