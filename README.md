# iNEX 联核智域官网

自主空中机器人展示网站，已完成整个前端的品牌、栏目与浏览交互。当前使用静态内容，后端尚未开发。

- [在线预览](https://lmh7.github.io/UniCore-Official-Website/)
- [自动检查和发布](https://github.com/LMH7/UniCore-Official-Website/actions)
- [内容维护说明](CONTENT_GUIDE.md)
- [后端接入方案](BACKEND_PLAN.md)
- [检查记录](ACCEPTANCE.md)

## 本次前端能力

- iNEX 正式标识、深蓝与青蓝品牌配色、移动端导航、统一页脚。
- 首页、产品中心、产品详情、解决方案、公开资源、关于、联系、错误页。
- 产品关键词搜索、感知类型筛选、分享筛选地址、零结果恢复。
- 最多三款平台对比，支持手机上左右查看表格。
- 全站搜索（顶部放大镜，或在非输入框时按 `/`）。
- 产品图片放大、分享链接复制、相关平台推荐。
- 微信与 LinkedIn 二维码放大和原图保存；LinkedIn 主页直达。
- 产品咨询入口保留所选型号，可复制咨询内容。
- FAQ 展开、方案快捷导航、回到顶部、滚动进度。
- 卡片、按钮、图片与导航 hover 反馈，轻量进入动效、鼠标轨迹反馈。
- 键盘操作、弹窗焦点管理、Escape 关闭、减少动态效果设置。
- 本地静态运行与 GitHub Pages 自动发布；未来 API 接入点、出错/超时回退。

功能适用于当前的展示官网。现阶段没有后台登录、在线表单收信、数据库或支付服务，页面不会模拟这些功能的成功结果。

## 本地打开

双击 `启动预览.cmd`，浏览器打开 http://127.0.0.1:4173 。需要 Node.js 20 或以上；当前电脑已安装。保持预览窗口打开。

也可在 VS Code 打开此目录，终端执行：

```sh
npm run dev
```

预览无需先安装依赖。端口被占用时用 `npm run dev -- --port 4174`。直接双击 `site/index.html` 可查看基础页面，但推荐使用预览服务检查复制、分享、错误页等行为。

## 文件位置

| 文件 | 用途 |
| --- | --- |
| `site/assets/js/products.js` | 产品记录；首页、列表、详情、搜索与对比共用 |
| `site/assets/js/site-content.js` | 团队、方案、资源、微信/LinkedIn、FAQ |
| `site/assets/js/data-service.js` | 本地与未来 API 数据源切换；目前为 local |
| `site/assets/js/layout.js` | 公共导航、品牌、页脚与转义工具 |
| `site/assets/js/app.js` | 栏目呈现、产品筛选、联系卡片 |
| `site/assets/js/product-detail.js` | 产品详情与相关平台 |
| `site/assets/js/interactions.js` | 搜索、弹窗、对比、分享与动效 |
| `site/assets/css/custom.css` | 基础排版与响应式布局 |
| `site/assets/css/enhancements.css` | iNEX 视觉与交互样式 |
| `site/assets/images/` | 自有产品图、Logo、二维码与插画 |
| `site/*.html` | 各页面的标题、结构与独立文字 |

`site/` 是唯一网站发布源。原始会议材料、PDF、开发依赖不放入站点。素材与组件来源见 [ASSET_SOURCES.md](ASSET_SOURCES.md) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 日常同步、检查和上传

开始编辑前：

```sh
git pull --ff-only
```

完成后检查实际页面与差异，再执行：

```sh
npm run check
git add .
git commit -m "说明本次修改"
git push
```

推送 main 后自动检查并发布。上传成功不等于发布成功，须等待 Actions 的 deploy 步骤成功，再打开线上网址复查。

## 浏览器检查和截图

```sh
npm ci
npm test
```

Windows 默认使用已安装的 Edge，GitHub 云端使用 Chromium。Windows 没有 Edge 时可调整 `playwright.config.mjs` 并执行 `npx playwright install chromium`。

本地开启预览后，用 `node scripts/capture.mjs` 保存电脑、手机和联系页截图，保存在 `artifacts/screenshots/`。用于截图的浏览器选择减少动态效果，以免全页截图包含未进入视野的过渡状态；正式页面仍按访客设备偏好显示。

## 部署与备份

```sh
npm run package
```

`release/` 中会得到可解压的通用网站包；仅含 `site/` 的公开内容。GitHub Pages 由工作流自动准备子目录错误页，无需手动上传 ZIP。发布、迁移与回退见 [DEPLOY.md](DEPLOY.md)。

## 后续内容

可以继续补充高清产品原图、经确认参数、公开资料、真实案例和邮箱。仅添加已经确认可公开的内容，避免把研究方向写成实际性能或已完成案例。后端接口规划和切换方法见 [BACKEND_PLAN.md](BACKEND_PLAN.md)，目前不需要架设服务器即可使用本站。
