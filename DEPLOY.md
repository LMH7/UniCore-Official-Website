# 发布与回退

2026-11-13 决策：**正式前端使用腾讯 EdgeOne Pages/Makers，后端保留广州 SCF，GitHub Pages 保留为迁移期间入口和备用站。** 用户尚无域名，本轮先交付 EdgeOne 预览包；云项目尚未创建，不宣称迁移上线。

## EdgeOne

按 [EdgeOne 操作说明](deploy/edgeone/README.md) 创建项目。选择仓库根目录、框架 Other，构建命令 `npm run build:edgeone`，输出 `artifacts/edgeone-pages`，跟踪 `edgeone-release` 分支。

该分支只在 main 通过全部 GitHub 检查后自动快进。不要手工修改发布分支。EdgeOne 控制台需另外确认部署成功，GitHub 检查不等于云端部署完成。

```powershell
npm run package:edgeone
```

生成 `release/inex-edgeone-时间戳.zip`。默认预览使用随站内容，禁止搜索引擎收录，不调用 SCF。正式模式要求域名、HTTPS、`DEPLOY_MODE=production`、`SITE_URL=https://实际域名/` 及对应 SCF 跨域/图片配置。

官网、图片和 API 地址集中在 `config/public.json`。修改后运行 `npm run sync`，提交生成文件。构建参数仅修改发布副本，不回写源码。新域名就绪前保持当前配置，避免影响旧站。

默认平台域名在中国大陆需使用三小时有效的预览链接，长期使用需要自定义域名；备案区域与账号步骤见 EdgeOne 操作说明。

## GitHub Pages 备用

[当前可浏览网址](https://lmh7.github.io/UniCore-Official-Website/)。源码分支 main，网页源 site，Settings → Pages 继续选择 GitHub Actions。

`.github/workflows/website.yml` 先检查内容、部署配置、后端、网页、真实接口和 EdgeOne 副本，再发布 Pages 并更新 EdgeOne 发布源。

```powershell
npm run build:github
```

`artifacts/github-pages` 适配仓库子路径；EdgeOne 输出适配根路径，两者不能互换。404 返回路径分别生成。CSS/JS 使用内容指纹文件名，原始文件保留兼容运行时引用；不要给所有 HTML 和配置设置一年缓存。

正式域名写入 config/public.json.siteBase 后，GitHub 备用页 noindex，canonical 指向官网。目前尚无正式域名，旧站保留现有 SEO。

## 检查与打包

```powershell
npm ci
npm run sync
npm run verify
npm run package:edgeone
```

Windows 使用 Chrome 检查时先设置 `$env:PLAYWRIGHT_CHANNEL='chrome'`。CI 使用 Chromium。EdgeOne 浏览器检查实际加载发布副本并启用 edgeone.json 的安全策略，覆盖手机/电脑、封面切换与刷新、图片和深层404；这仍不是腾讯云线上验收。

`npm run package` 继续生成通用网页 ZIP；`npm run release` 生成通用网页包、后端包和 GitHub 发布目录。EdgeOne 使用 package:edgeone。压缩包根目录直接包含 index.html，不多套一层 site；内部文档、账号和虚拟环境不上传网页。

## SCF 后端

步骤见 [SCF 部署说明](deploy/tencent-scf/README.md)，上轮云端结果见 [2026-11-12 验收](docs/2026-11-12-整体验收.md)。本分支保留了额外的产品详情字段，与公网历史版本 `a56f29d171df80e5` 不同；以 `npm run sync` 生成的当前内容版本为准。当前发布使用本地数据，启用公网 API 前必须重新构建并部署同版完整快照，不能直接切换到旧快照。

正式域名与新站资源就绪后，按 EdgeOne 手册切换 ALLOWED_ORIGINS/PUBLIC_ASSET_BASE。页面能浏览不等于 API 接通，因为有完整本地回退。更新 content 时，先部署对应镜像并做公网检查，再发布同版网页。

## 回退与运维

1. 保留上个已验收部署、提交号、内容版本与镜像。EdgeOne 故障先恢复部署列表中的已验收版本，保留 GitHub 备用网址。
2. 代码用 git revert 生成恢复提交，通过检查后发布；不强推或清空队友工作。
3. API 异常可把 config/public.json.source 改为 local，同步发布；恢复镜像和配置后再切回 api。
4. 账号负责人确认预算提醒、SCF 错误/超时、日志保留与无预置并发。本轮没有购买新付费资源，套餐以实际账号为准。

发布后仍需同学在校园网与真实手机网络验收。历史截图和旧验收不能替代新平台验收。
