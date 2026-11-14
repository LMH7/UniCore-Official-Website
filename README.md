# iNEX 联核智域官网

可浏览、可持续补充内容的团队展示网站。包含互动封面、首页、产品中心和详情、方案、资源、学术成果、重点项目、团队与实验室介绍、联系方式及错误页；配套 Python 3.12 只读内容后端。

2026-11-13 选择性同步：本分支保留完整产品详情、分组参数、特点、视频/资料入口及研究方向映射，保留品牌英文、144px 靠左侧栏、正文居中和导航高亮修复，同时接入主线的 EdgeOne 构建、资源兼容和 API 版本保护。发布配置仍为 `local`，本机 9000 预览使用同版真实 API；启用公网 API 前先发布对应完整数据快照。

- [现有网站预览](https://lmh7.github.io/UniCore-Official-Website/)
- [EdgeOne 部署步骤](deploy/edgeone/README.md) · [按优先级的优化清单](docs/优化清单.md)
- [项目交付说明](项目交付说明.md)：先读这一份，含查看、维护、验收与剩余账号事项。
- [内容维护](CONTENT_GUIDE.md) · [交接与分工](HANDOFF.md) · [发布和回退](DEPLOY.md)
- [2026-11-13 本地同步与手动提交](docs/MAIN-SYNC-20261113.md)：本次保留项、验证和待提交状态。
- [后端运行](backend/README.md) · [腾讯云部署](deploy/tencent-scf/README.md)
- [上游历史验收记录](docs/2026-11-12-整体验收.md) · [自动检查和发布](https://github.com/LMH7/UniCore-Official-Website/actions)

## 本机查看

**查看本轮 EdgeOne 发布副本：双击 `启动EdgeOne预览.cmd`，打开 <http://127.0.0.1:4178/>。** 它启用发布安全策略并使用随站内容；不会更改原后端。

**双击 `启动后端预览.cmd`，打开 <http://127.0.0.1:9000/>。** 这是本机网页加真实后端；关闭窗口后本机服务停止，不影响公网网站。网页入口先显示互动封面，“进入首页”打开 `home.html`，实验室介绍在“关于我们”。

只看网页也可双击 `启动预览.cmd`，打开 <http://127.0.0.1:4173/>。不要继续刷新以前的 4174 窗口；它可能属于其他目录或旧服务。以新窗口打印的地址为准。

换电脑时安装 Node.js 20+（建议 24 LTS）、Python 3.12，并在项目目录执行：

```powershell
py -3.12 -m venv .venv-backend
.venv-backend/Scripts/python.exe -m pip install -r backend/requirements.lock
npm ci
npm run dev:backend
```

macOS/Linux 用 `python3.12 -m venv .venv-backend`，安装依赖时使用 `.venv-backend/bin/python`。仅预览静态网页无需安装 Python 或开发依赖，直接 `npm run dev`。

## 内容只有一个维护入口

| 要修改什么 | 文件 |
| --- | --- |
| 产品名称、图片、参数、资料 | `content/products.json` |
| 简介、联系、方案、资源、FAQ | `content/site-content.json` |
| 官网/图片/API 地址与数据源 | `config/public.json` |
| 实验室详细介绍 | `site/about.html` |
| 重点项目 | `site/projects.html` |
| 学术成果 | `site/publications.html` |
| 封面结构与轮播文案 | `site/welcome.html`、`site/assets/js/welcome.js` |
| 图片 | `site/assets/images/` |

修改后执行 `npm run sync`。`site/assets/js/products.js`、`site-content.js`、`data-config.js`、后端快照及接口示例由源文件生成，不直接编辑。公共导航和方案正文也由同步命令生成。

## 检查、协作和交付

开始工作先 `git pull --ff-only`，每项工作新建分支；完成后：

```sh
npm run sync
npm run verify
```

`verify` 依次检查生成内容、部署配置、静态路径、后端、浏览器、真实 HTTP 联调，以及启用安全策略的 EdgeOne 发布副本。Windows 默认使用 Edge；本机 Edge 若启动异常，已安装 Chrome 时可设置 `$env:PLAYWRIGHT_CHANNEL = 'chrome'`。也可以安装独立测试浏览器后运行：

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run verify
```

发布后可用 `npm run verify:live` 只读复查公网电脑/手机页面、API 内容版本和图片，结果保存在 `artifacts/live-final/`。

向团队仓库提交 Pull Request，检查通过后合并 main，GitHub Actions 发布备用网页，并在全部检查通过后更新 EdgeOne 跟踪的 `edgeone-release` 分支。没有通过检查的版本不发布。函数镜像通过独立流程更新，网页工作流不持有云账号权限。

```sh
npm run release
```

生成 `release/` 下的通用网站 ZIP、后端源码 ZIP 和 `artifacts/github-pages/` 的 Pages 发布副本。源码与文档备份也随本次交付提供，具体文件见交付说明。不要把虚拟环境、账号或原始内部材料放进网站包。

## 网站与云函数

网页唯一发布源是 `site/`，正式托管选择 EdgeOne Pages/Makers，GitHub Pages 保留备用；后端为你的广州腾讯云 SCF，使用个人版镜像仓库，无数据库和常驻服务器。本次没有购买企业版仓库或其他新资源。

本轮用户尚无域名，先交付 `npm run package:edgeone` 生成的预览包；新云项目和正式切换待账号操作。EdgeOne 默认预览采用完整随站内容，不调用 SCF。

`config/public.json` 当前保留本地内容模式。接口出错、超时、缺版本，或接口版本与网页不一致时，整体使用已保存版本并提示访客。广州现有云函数的历史版本尚不包含本分支完整产品字段，需先更新云端快照并验收，再配置 API 来源。图片由网站托管，不通过云函数中转。

最终云端版本、上传镜像及公网结果以 [整体验收](docs/2026-11-12-整体验收.md) 为准。网站没有管理登录、在线收信、订单或支付；维护内容通过文件、审阅和发布完成。

正式内容仍可继续补充：高清产品照片、经核实参数、已获准公开的案例与成果、真实联系邮箱。没有提供的资料保留明确空状态，不编造性能、客户、文件或提交成功结果。素材出处见 [ASSET_SOURCES.md](ASSET_SOURCES.md) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
