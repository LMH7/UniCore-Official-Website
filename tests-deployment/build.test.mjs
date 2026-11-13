import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { directoryURL } from "../scripts/deployment-config.mjs";

test("拒绝不安全的公开域名配置", () => {
  for (const value of ["http://example.com/", "https://user:pass@example.com/", "https://example.com/?token=x", "https://example.com/#x", "https://example.com", "https://example.com/\"onclick=x/"])
    assert.throws(() => directoryURL(value, "siteBase"), value);
  assert.equal(directoryURL("https://example.com/site/", "siteBase").pathname, "/site/");
});

test("预览与正式构建隔离、生成SEO和指纹资源、保留GitHub备用", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "inex-deploy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ["scripts", "content", "config", "site", "backend/data"])
    await cp(new URL("../" + directory, import.meta.url), path.join(root, directory), { recursive: true });
  const read = name => readFile(path.join(root, name), "utf8");
  const run = (script, args = [], env = {}) => execFileSync(process.execPath, ["scripts/" + script, ...args], {
    cwd: root, env: { ...process.env, DEPLOY_MODE: "preview", SITE_URL: "", ...env }, encoding: "utf8", stdio: "pipe",
  });
  const source = await read("site/home.html");
  const originalSnapshot = await read("backend/data/snapshot.json");
  run("sync-content.mjs");
  run("build-site.mjs", ["--edgeone"]);
  let info = JSON.parse(await read("artifacts/edgeone-pages/deploy-info.json"));
  assert.equal(info.source, "local");
  assert.equal(info.indexable, false);
  assert.deepEqual(Object.keys(JSON.parse(await read("artifacts/edgeone-pages/edgeone.json"))), ["headers"], "upload package must omit unsupported build settings");
  for (const name of (await readdir(path.join(root, "artifacts/edgeone-pages"))).filter(n => n.endsWith(".html"))) {
    const html = await read("artifacts/edgeone-pages/" + name);
    assert.match(html, /noindex,follow/, name);
    assert.doesNotMatch(html, /rel="canonical"|lmh7\.github\.io/, name);
    assert.doesNotMatch(html, /<script\s*>/, name);
  }
  assert.equal(await read("artifacts/edgeone-pages/robots.txt"), "User-agent: *\nDisallow: /\n");
  for (const [asset, name] of Object.entries(info.assets)) {
    const data = await readFile(path.join(root, "artifacts/edgeone-pages", asset));
    assert.ok(name.includes(createHash("sha256").update(data).digest("hex").slice(0, 12)), asset);
    assert.ok((await stat(path.join(root, "artifacts/edgeone-pages", path.dirname(asset), name))).size > 0);
  }
  assert.equal(await read("site/home.html"), source, "building must not change authored files");
  assert.equal(await read("backend/data/snapshot.json"), originalSnapshot, "URL overrides must not change the content release");
  assert.throws(() => run("build-site.mjs", ["--edgeone"], { DEPLOY_MODE: "production" }), /Production requires SITE_URL/);
  assert.throws(() => run("build-site.mjs", ["--edgeone"], { SITE_URL: "https://example.com/sub/" }), /root path/);
  run("build-site.mjs", ["--edgeone"], { DEPLOY_MODE: "production", SITE_URL: "https://official.example/" });
  info = JSON.parse(await read("artifacts/edgeone-pages/deploy-info.json"));
  assert.equal(info.source, "api");
  assert.equal(info.indexable, true);
  const home = await read("artifacts/edgeone-pages/home.html");
  assert.match(home, /href="https:\/\/official.example\/home.html"/);
  assert.match(home, /content="https:\/\/official.example\/assets\/images\/inex-social.jpg"/);
  assert.doesNotMatch(home, /noindex/);
  const sitemap = await read("artifacts/edgeone-pages/sitemap.xml");
  assert.match(sitemap, /product.html\?id=nex-500/);
  assert.doesNotMatch(sitemap, /welcome.html|404.html|publications.html|github.io/);
  const cfgPath = path.join(root, "config/public.json");
  const config = JSON.parse(await read("config/public.json"));
  config.siteBase = "https://official.example/";
  await writeFile(cfgPath, JSON.stringify(config));
  for (const script of ["sync-content.mjs", "sync-seo.mjs", "sync-cover.mjs"]) run(script);
  run("build-site.mjs", [], { GITHUB_REPOSITORY: "LMH7/UniCore-Official-Website" });
  assert.match(await read("artifacts/github-pages/404.html"), /<base href="\/UniCore-Official-Website\/"/);
  assert.match(await read("artifacts/github-pages/home.html"), /noindex,follow/);
  assert.match(await read("artifacts/github-pages/home.html"), /https:\/\/official.example\/home.html/);
  assert.equal(JSON.parse(await read("artifacts/github-pages/deploy-info.json")).indexable, false);
  assert.ok((await stat(path.join(root, "artifacts/github-pages/assets/images/cover-sky-day.png"))).size > 0, "cached pages on the old host must retain their image URLs");
});
