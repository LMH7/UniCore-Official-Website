# 官网后端：运行、维护与云端部署

新版代码在 `backend/`，取代原 `docs/function/app.py`。这是提供公开网站内容的只读服务，使用 Python 3.12、Flask 和 Waitress。产品、团队、方案、资源、FAQ、联系方式可以继续添加；现阶段通过文件审核和发布更新。

**2026-11-12 已完成后端镜像构建，并上传到用户自己的广州个人版仓库，本次没有购买企业版仓库。** 按要求暂不运行应用测试，尚未创建/启用云函数，网页仍为本地内容。标签、摘要和下一步控制台设置见 [上传记录](../deploy/tencent-scf/2026-11-12-上传记录.md)，完整步骤见 [部署说明](../deploy/tencent-scf/README.md)。

## 在本机查看新版

Windows 已安装环境后，双击仓库根目录的 **启动后端预览.cmd**，打开 <http://127.0.0.1:9000/>。这个地址同时运行网页和真实后端；`/about.html` 包含实验室介绍，`/api/v1/products` 显示后端数据。保持窗口打开，停止用 Ctrl+C。

`启动预览.cmd` / 4173 是静态预览。已有 4174 窗口可能仍属于旧目录或旧进程，关闭后重新启动；以窗口打印的地址为准。

首次在另一台 Windows 电脑安装（Python 3.12、Node.js 20+）：

```powershell
py -3.12 -m venv .venv-backend
.venv-backend\Scripts\python.exe -m pip install -r backend/requirements.lock
npm ci
npm run dev:backend
```

macOS/Linux 用 `python3.12 -m venv .venv-backend`，安装依赖时 Python 路径换为 `.venv-backend/bin/python`。Node 脚本自动选择项目虚拟环境，也可用 `BACKEND_PYTHON` 指定解释器。

只运行 API：`python -m backend --host 127.0.0.1 --port 9000`。在虚拟环境中执行；不使用 Flask 调试服务器对外提供服务。

## 日常更新

1. 将可公开的产品信息写入 `content/products.json`，团队、联系方式等写入 `content/site-content.json`，图片放在 `site/assets/images/`。
2. 执行 `npm run sync`。它生成网页本地副本、后端快照、接口示例、配置及网络许可，并同步导航与方案。
3. 执行 `npm run check`、`npm run test:backend`、`npm test`、`npm run test:integration`，在 9000 预览检查内容和图片。
4. 提交源内容和生成文件。生成文件标有 Generated，不直接编辑；检查会发现漏生成。
5. 内容需要上线时，重新打包发布后端，再发布同一提交的网页本地副本和图片。生产进程启动后使用固定快照，修改磁盘文件不会热更新；要发布新版本或重启。

内容版本是两个公开文件内容的 SHA-256 前 16 位，接口返回在 `meta.version`。两个接口版本不同、缺字段、超时或失败时，网页整体使用已保存的本地版本。旧云服务两份响应都没有版本号时暂时兼容。撤下敏感或过期资料时，应同时更新网页本地副本及已公开素材，避免故障回退仍显示旧内容。

关于页独立的实验室介绍仍在 `site/about.html`；它是页面内容，不在这两个 API 的维护范围。

## 配置

网页唯一配置入口：`config/public.json`，修改后 `npm run sync`。

| 字段 | 含义 |
| --- | --- |
| source | `local` 为静态数据，`api` 为读取后端 |
| apiBase | 完整 HTTPS 接口前缀，结尾 `/api/v1/` |
| timeoutMs | 250～10000 毫秒，默认 5000 |
| assetBase | 图片所在的网站目录，必须包含仓库子目录及末尾 `/` |

当前保留 `source: local`，直到新版云服务验收后再切换；9000 联调预览会临时使用本机 API，不改发布配置。

生产服务环境变量：

| 名称 | 建议值或用途 |
| --- | --- |
| ALLOWED_ORIGINS | `https://lmh7.github.io`，多个网站来源用英文逗号分开，无路径、无结尾斜杠 |
| PUBLIC_ASSET_BASE | 默认使用快照中的 assetBase，可覆盖为 `https://lmh7.github.io/UniCore-Official-Website/` |
| PORT | 默认 9000，由平台指定时跟随平台 |
| CONTENT_SNAPSHOT | 默认 `backend/data/snapshot.json`，通常不设置 |

不使用 `*` 跨域许可。CORS 是浏览器读取规则，公开接口仍可被任何人直接访问，不承担登录或保密作用。不要将草稿、账号、密钥、内部资料放入公开内容文件。

## 生成部署包

```powershell
npm run package:backend
npm run package:backend -- --linux
```

`release/inex-backend-版本-source.zip`：后端源码、锁定依赖、Dockerfile、上线检查脚本和部署说明。容器构建会安装依赖；直接 Python 部署时安装 `backend/requirements.lock`。**腾讯镜像函数使用构建上传的容器，不直接上传 ZIP。**

`release/inex-backend-版本-linux-py312.zip`：额外包含 **Linux x86_64 CPython 3.12** 依赖，可直接用于匹配的云运行环境；不包含 Python 解释器。不能上传到 Python 3.6/3.9、ARM 或 Windows 运行环境。

ZIP 根目录有 `app.py` 启动入口、`scf_bootstrap`、`backend/`、`manifest.json`。启动脚本权限为 755、Linux 换行。包内按文件记录 SHA-256，旁边另有 ZIP 校验值。包只收录后端和依赖，不包含虚拟环境、会议材料、账号或原始联系图片。内容版本相同但代码修复不同时，ZIP 校验值会不同；留存验收通过的 ZIP 和提交号，不仅依赖文件名辨别版本。

## 腾讯云正式部署

以下仅为费用前提满足后、重新决定上线时的配置参考。按 [腾讯云部署说明](../deploy/tencent-scf/README.md) 使用已确认可用且费用合适的私有仓库和镜像 Web 函数。仓库根目录执行 `npm run build:cloud` 可构建并验收容器；账号持有人在本机登录仓库后，使用 `--image 实际仓库地址 --push` 上传。脚本不会自动创建云资源，当前不运行。

此路线不使用代码包里的 `scf_bootstrap`；该文件仅保留给匹配 Python 3.12 的标准代码包环境，不是腾讯旧 Custom Runtime 的推荐入口。不要将源码 ZIP 或 Linux 依赖 ZIP 直接上传到“容器镜像”配置。

本地构建/测试、镜像上传、云函数创建、公网验收是四个不同状态。当前没有云账号操作会话，尚未创建新函数或切换前端。账号持有人完成登录和仓库操作后，提供仓库地址；新函数创建后提供实际公网 URL，即可继续验收。

正式切到 API 前，必须运行 `node scripts/backend-task.mjs smoke 实际服务根URL --version 实际内容版本`，通过后再修改前端配置、运行同步和检查，发布同一版网页与图片。完整的参数、版本/别名、预算及回退步骤均在上述部署说明中。

## 费用、运维与回退

由账号持有人确认函数、网关、公网流量、日志的计费规则，设置预算提醒、错误率和调用量告警，并确认资源归属。不能保证免费额度永久够用。平台并发/流量限制在确认实际额度后配置；这份代码不依赖数据库或常驻付费服务器。

故障时先将网页 `source` 改回 `local`，重新生成并发布，访客可继续浏览；然后在云端恢复上一个**已验收完整部署包**及其配置。恢复后运行 smoke 并复查网页。常规代码回退用 `git revert`，不强推覆盖队友历史。

只读内容服务已覆盖本次展示官网需求。以后确实需要多人在线编辑，再单独设计管理员登录、权限、数据库和图片上传；当前没有订单、留言收信或支付接口。
