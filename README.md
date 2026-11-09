# 联核智域官网 · UniCore Official Website

面向科研与教育的自主空中机器人展示网站。采用静态 HTML、Bootstrap 5.2.3 和少量 JavaScript；无需数据库、账号密钥或构建服务即可浏览。

预览网址：**https://lmh7.github.io/UniCore-Official-Website/**。首次发布及当前运行结果请查看仓库的 **Actions → Check and publish website**；以绿色成功状态和实际访问为准。

## 本地打开

最省事：双击 `启动预览.cmd`，然后用浏览器打开 http://127.0.0.1:4173 。需要 Node.js 20 或以上版本；当前电脑已安装。预览过程中保持窗口打开。

也可在 VS Code 打开本目录，在终端运行：

```sh
npm run dev
```

**预览无需先执行 npm install。** 如果端口被占用，用 `npm run dev -- --port 4174`，浏览器同步改为 4174。

直接双击 `site/index.html` 也能查看页面、图片、产品和导航；推荐用上面的预览服务检查错误地址及复制邮箱功能。

## 当前范围

- A：统一风格、公共导航与页脚、首页、错误页、预览服务、自动检查、部署与交接说明。
- B/C 接手基础：产品中心与三条详情、解决方案、资源、关于、联系均可浏览，使用会议材料中的有限信息搭建初版。页面内容仍需 B/C 和研发负责人审核、扩充。
- 联系方式按要求预留；未填写时清楚提示「官方联系方式即将公布」。不存在无法收信的假表单。
- 首页产品图来自团队会议材料；概念插画为本站绘制。没有加入客户数量、性能指标、合作机构背书等未经确认的信息。

## 谁改哪里

| 负责人 | 主要文件 | 用途 |
| --- | --- | --- |
| A | `site/index.html`、`site/assets/css/custom.css`、`site/assets/js/layout.js` | 首页、全局样式、统一导航和页脚 |
| B | `site/assets/js/products.js`、`site/products.html`、`site/product.html`、`site/assets/js/product-detail.js` | 产品数据、列表、详情 |
| C | `site/assets/js/site-content.js`、`site/solutions.html`、`site/resources.html`、`site/about.html`、`site/contact.html` | 团队、方案、资源、联系信息 |
| A/B/C 协调 | `site/assets/js/app.js` | 基础产品卡片与其他栏目的数据呈现，修改前同步范围 |

详细步骤见 [CONTENT_GUIDE.md](CONTENT_GUIDE.md)，协作约定见 [HANDOFF.md](HANDOFF.md)，发布和回退见 [DEPLOY.md](DEPLOY.md)，检查记录见 [ACCEPTANCE.md](ACCEPTANCE.md)，素材来源见 [ASSET_SOURCES.md](ASSET_SOURCES.md)。

## 日常同步与上传

开始编辑之前拉取最新内容；发现冲突时先处理，不要覆盖队友工作：

```sh
git pull --ff-only
```

提交前查看 `git status` 和 `git diff`，确认只包含准备提交的改动。首次完整协作版本按用户要求使用 main；后续建议 B/C 分别在任务分支提交，A 检查后合并。

```sh
git add .
git commit -m "说明本次修改"
git push
```

推送 main 后会自动检查并发布到 GitHub Pages。**仓库同步成功不等于发布成功**，需要等待 Actions 的部署步骤完成。

## 检查与部署包

普通内容检查不需要额外依赖：

```sh
npm run check
npm run package
```

部署包在 `release/` 下，仅包含 `site/` 中的网站文件，不含会议原文、账号信息和开发依赖。这个目录不会随 Git 上传。

浏览器检查需要安装开发依赖。Windows 默认使用已安装的 Edge；Linux CI 使用 Chromium：

```sh
npm ci
npm test
```

如果 Windows 没有 Edge，可以修改 `playwright.config.mjs` 使用 Chromium，再执行 `npx playwright install chromium`。自动检查覆盖不同宽度、导航、图片、详情刷新、错误地址和联系功能。截图保存方法：先启动本地预览，再执行 `node scripts/capture.mjs`；结果在 `artifacts/screenshots/`。

## 结构

```text
site/                      可以独立发布的网站
  assets/css/custom.css    全局自定义风格
  assets/js/               公共布局、产品数据和栏目内容
  assets/images/           本地图片与概念插画
  assets/vendor/           模板成品样式、Bootstrap 脚本和许可证
scripts/                   预览、静态检查、截图与打包工具
tests/                     浏览器功能检查
references/upstream.json   模板版本、下载来源与校验值
.github/workflows/         检查和 GitHub Pages 发布
```

仅 `site/` 会公开发布为网页。网站以中文首版为目标，后续可继续增加产品、方案、公开资料和正式 Logo。现阶段无需引入后台或复杂框架。
