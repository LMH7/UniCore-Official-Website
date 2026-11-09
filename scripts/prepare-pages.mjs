import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const repository =
  process.env.GITHUB_REPOSITORY || "LMH7/UniCore-Official-Website";
const [owner, name] = repository.split("/");
const base =
  name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "/" : `/${name}/`;
const output = path.join(root, "artifacts/github-pages");
await cp(path.join(root, "site"), output, { recursive: true });
const filename = path.join(output, "404.html");
const errorPage = await readFile(filename, "utf8");
const baseElement = /<base\s+href=["']\/["']\s*\/?>/i;
if (!baseElement.test(errorPage)) throw new Error("404 页面缺少根路径 base，停止发布以免错误页链接失效。");
await writeFile(
  filename,
  errorPage.replace(baseElement, `<base href="${base}" />`),
);
await writeFile(path.join(output, ".nojekyll"), "");
console.log(`GitHub Pages 发布目录：${output}，错误页返回路径：${base}`);
