# 发布与回退

## 当前路线

按用户在 2026-11-09 的选择，先用 GitHub Pages 发布团队展示预览。

- 仓库：https://github.com/LMH7/UniCore-Official-Website
- 源分支：`main`
- 网页源：`site/`
- 工作流：`.github/workflows/website.yml`
- 预览地址：https://lmh7.github.io/UniCore-Official-Website/
- 发布结果：https://github.com/LMH7/UniCore-Official-Website/actions

这是展示预览，产品参数与案例仍可继续补充。后续若加入交易、付费业务或正式商业运营，需要按用途重新评估平台，方案仍推荐 Cloudflare Pages 或已获准的网站空间。

## 自动发布

推送 main 后，工作流依次：取得代码 → 安装 Node/Python 3.12 检查依赖 → 检查内容生成、静态资源和数据 → 后端自动测试 → Chromium 页面回归与真实后端联调 → 生成后端源码包 → 准备 GitHub Pages 子目录路径 → 上传网站文件 → 发布。工作流不持有云账号权限，不会自动升级腾讯云函数。

检查未通过就不会执行部署。Pull Request 只检查，不发布。无需添加账号密码或访问令牌到仓库；发布使用 GitHub 自带的工作流权限。

仓库 Settings → Pages 的 Build and deployment 应为 **GitHub Actions**。若迁移到另一个仓库，需要管理员在该仓库重新启用 Pages。

`scripts/prepare-pages.mjs` 在复制前后核对入口：根路径 `/` 和 `index.html` 展示互动封面，点击“进入首页”后才打开 `home.html`，不会按访问记录跳过封面。发布副本里的错误页 `<base>` 适配 `/<仓库名>/`；所有本地 CSS 和 JavaScript 引用自动追加由文件内容生成的 `v` 参数，文件更新时版本随之变化，减少沿用旧脚本、旧排版的情况。这些生成修改不写回 `site/`。普通页面仍使用相对路径；请勿全局改成 `/assets/...`。

版本参数不能清除浏览器已经缓存的旧 HTML。部署成功后若仍看到旧入口，可对原来的 `index.html` 地址执行一次强制刷新或用无痕窗口打开，无需长期改用另一个网址。

发布成功后打开首页、三款详情并刷新，再打开 `预览地址/not-a-real-page/deep`，确认自定义错误页能返回首页。404 错误页在根域托管时使用源文件的 `/` 路径，在 GitHub Pages 下使用发布副本的仓库路径。

## 手动重新发布

在仓库 Actions → Check and publish website → Run workflow，选择 main。发布后以实际打开网址为准，避免只看上传步骤。

## 本地部署包

```sh
npm run check
npm run package
```

`release/unicore-site-时间戳.zip` 的根目录就是网站文件。这个通用包适合网站根路径托管，不应直接用于 GitHub Pages 的手动子目录发布；GitHub Pages 请使用上面的工作流。

解压后应当直接看见 `index.html`，不要多套一层 `site/`。`index.html` 是互动封面，原官网首页为 `home.html`，请同时保留两个文件及资源目录。修改封面结构后先运行 `npm run sync:cover`，再检查、打包。原始会议材料与开发文件不应进入站点。部署包与本地截图已被 Git 忽略，需要分享时单独复制。

## 迁移到 Cloudflare Pages（备用）

连接同一个 GitHub 仓库，设置：

| 配置 | 值 |
| --- | --- |
| Production branch | main |
| Framework preset | None |
| Build command | npm ci && npm run check |
| Build output directory | site |

也可以在 Cloudflare Pages 的 Direct Upload 中上传通用部署包。账号登录由账号持有人操作，不把访问令牌发到聊天或写进源码。Git 集成与 Direct Upload 的管理方式不同，新建项目时按长期维护方式选择。

站点的 `_headers` 适用于 Cloudflare，GitHub Pages 不会应用该文件里的响应头；两种托管的基础浏览均已避免外部脚本、远程字体和混合内容。

## 独立部署后端

后端不上传 GitHub Pages。完整步骤、依赖 ZIP、容器入口、云账号交接及上线检查见 [backend/README.md](backend/README.md)。旧函数不能仅替换单个 app.py；新包需要 Python 3.12 环境。

腾讯云 **SCF 镜像 Web 函数 + 公网函数 URL** 已在用户自己的广州账号可访问，2026-11-12 基础公网接口与浏览器跨域读取检查通过，见 [公网检查](deploy/tencent-scf/2026-11-12-公网检查.md)。本次前端已配置用户新账号 API，且增加了网页与 API 内容版本匹配保护；最新镜像、部署和发布状态见 [整体验收](docs/2026-11-12-整体验收.md)。镜像摘要见 [上传记录](deploy/tencent-scf/2026-11-12-上传记录.md)，完整配置见 [部署说明](deploy/tencent-scf/README.md)。单独函数用量费不是总价，旧服务器配置仅为备份。

后续更新时先在控制台部署新镜像并做公网检查，再发布同一版网页。数据源和 API 地址仍只改 `config/public.json`，之后执行 `npm run sync`。生成的 `_headers` 同时包含准确的接口连接和图片来源，避免迁移到 Cloudflare 后被浏览器拦截。发布同一版图片、网页回退副本与后端快照。

云端故障时可先将配置 source 改回 local，重新生成发布网页，再恢复已验收的后端包；旧云服务验收不代表新包已部署。

官方说明：

- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 回退

只修复错误内容时，修改对应文件并提交；较大故障先恢复已验收的版本。

推荐回退方式：先在 `git log --oneline` 找到引入问题的提交，再用 `git revert 提交号` 撤销该次修改，检查后 `git push`。多人已有后续提交时先分析影响，避免误撤销别人的内容。不使用 `reset --hard` 或强制推送覆盖远程历史。

回退会触发同样的检查和发布，待 Actions 完成后验证首页、图片和产品详情。GitHub 的「重新运行旧工作流」不等于可靠的线上回退，优先提交一个可追踪的恢复版本。

本地当前已测试部署包解压与页面资源完整性。真实旧线上版本的回退演练需在有第二个可用版本后记录，不能提前视为通过。
