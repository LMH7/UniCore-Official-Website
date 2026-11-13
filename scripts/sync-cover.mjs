import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { publicConfig, seoHTML } from "./deployment-config.mjs";

const source = fileURLToPath(new URL("../site/welcome.html", import.meta.url));
const target = fileURLToPath(new URL("../site/index.html", import.meta.url));
const check = process.argv.includes("--check");
const welcome = await readFile(source, "utf8");
if (!welcome.includes('data-layout="standalone"') || !welcome.includes('href="home.html"'))
  throw new Error("封面需要独立布局与 home.html 首页入口。");
// 保留 welcome.html 预览地址；index.html 与它共用同一份封面结构。
const expected = seoHTML(welcome, "index.html", await publicConfig());
let current = "";
try { current = await readFile(target, "utf8"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (current !== expected) {
  if (check) {
    console.error("默认封面未同步，请运行 npm run sync:cover。");
    process.exitCode = 1;
  } else {
    await writeFile(target, expected, "utf8");
    console.log("默认入口已同步：index.html 使用互动封面，首页为 home.html。");
  }
} else {
  console.log(check ? "默认封面检查通过。" : "默认封面已是最新。");
}
