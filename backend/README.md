# 官网后端：运行、维护与云端部署

新版代码在 `backend/`，取代原 `docs/function/app.py`。这是提供公开网站内容的只读服务，使用 Python 3.12、Flask 和 Waitress。产品、团队、方案、资源、FAQ、联系方式可以继续添加；现阶段通过文件审核和发布更新。

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

`release/inex-backend-版本-source.zip`：源码和锁定依赖，目标环境安装 `backend/requirements.lock`。

`release/inex-backend-版本-linux-py312.zip`：额外包含 **Linux x86_64 CPython 3.12** 依赖，可直接用于匹配的云运行环境；不包含 Python 解释器。不能上传到 Python 3.6/3.9、ARM 或 Windows 运行环境。

ZIP 根目录有 `scf_bootstrap`、`backend/`、`manifest.json`。启动脚本权限为 755、Linux 换行。包内按文件记录 SHA-256，旁边另有 ZIP 校验值。包只收录后端和依赖，不包含虚拟环境、会议材料、账号或原始联系图片。内容版本相同但代码修复不同时，ZIP 校验值会不同；留存验收通过的 ZIP 和提交号，不仅依赖文件名辨别版本。

## 腾讯云上线交接

本地测试和打包不代表公网已更新。旧函数由同学个人账号托管，目前没有该账号的控制台操作权限；需要账号持有人完成部署。不要在聊天中发送密码、验证码或永久密钥。

1. 先保存旧函数版本、配置和 URL。建议新建一个测试 Web 函数验证，验收后再接替旧服务。
2. 查看控制台实际提供的**函数类型、运行环境和架构**。目标是 HTTP/Web 服务、Linux x86_64、Python 3.12，服务监听 `0.0.0.0:9000`。若可选择此环境，上传 `linux-py312.zip`，确认 ZIP 根目录结构以及 `scf_bootstrap` 启动方式；以控制台该类型的启动约定为准。
3. 若只提供旧 Python 模板，**不要把新代码粘回旧模板的 app.py**。保留旧函数，选择支持 Python 3.12 的容器或其他 HTTP 服务环境；仓库提供 `backend/Dockerfile`，在仓库根目录执行 `docker build -f backend/Dockerfile -t inex-api .`。腾讯云的可选运行环境、镜像权限和启动入口须根据实际控制台确认后选定。
4. 设置上表环境变量。开放 HTTPS 公网 GET/HEAD/OPTIONS 访问；保持平台层与代码层的 CORS 设置一致，避免额外添加 `*` 或重定向。不要开放调试模式。
5. 先确认 `/healthz`、`/api/v1/products`、`/api/v1/site-content` 返回 JSON，并查看 `meta.version` 与包中一致；启动日志不得有缺依赖或架构错误。
6. 在本地执行下列命令，`URL` 填服务根地址，不包含 `/api/v1/`，版本填该包 manifest 中的 `contentVersion`：

```powershell
node scripts/backend-task.mjs smoke URL --version 版本
```

7. 云端检查通过后，把 `config/public.json` 中 `apiBase` 换为正式地址、`source` 换为 `api`，运行 `npm run sync` 和所有检查，再提交发布网页。Cloudflare 的 `_headers` 会同步加入准确的接口及图片来源；GitHub Pages 不应用该文件。
8. 从公网网页打开首页、产品详情、关于和联系页，电脑/手机检查图片、咨询入口和二维码；等待缓存最多约 60 秒再核对版本。线上验收记录必须写实际结果，不能用本地结果代替。

平台的 Python 3.12 支持及腾讯云部署尚需实际账号确认；当前没有假定旧模板能直接升级。参考腾讯云控制台的 Web 函数创建文档：<https://cloud.tencent.com/document/product/583/56124>。

## 费用、运维与回退

由账号持有人确认函数、网关、公网流量、日志的计费规则，设置预算提醒、错误率和调用量告警，并确认资源归属。不能保证免费额度永久够用。平台并发/流量限制在确认实际额度后配置；这份代码不依赖数据库或常驻付费服务器。

故障时先将网页 `source` 改回 `local`，重新生成并发布，访客可继续浏览；然后在云端恢复上一个**已验收完整部署包**及其配置。恢复后运行 smoke 并复查网页。常规代码回退用 `git revert`，不强推覆盖队友历史。

只读内容服务已覆盖本次展示官网需求。以后确实需要多人在线编辑，再单独设计管理员登录、权限、数据库和图片上传；当前没有订单、留言收信或支付接口。
