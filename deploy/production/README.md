# 长期运行方案：正式云服务器 + Python 3.12 容器

用户已明确以长期运行和产品稳定为目标。本项目生产基线为 Python 3.12；腾讯云托管运行环境若仍标公测，就选正式商用的 Linux 云服务器运行官方 Python 容器。Python 由容器提供，不依赖云函数控制台的语言版本列表。

架构：现有静态网站 → HTTPS API 自有子域名 → Caddy → Waitress/Flask。Caddy 提供 HTTPS 和证书续期；API 只在容器网络开放 9000，不向公网暴露该端口。当前无数据库，内容源与后端快照在 Git 和部署包中版本化保存。

建议从一台 Ubuntu 24.04 LTS、x86_64、2 核 2GB 的正式云服务器起步。它是这个轻量服务的起始配置，不是容量保证；上线后按实际延迟、内存和流量调整。可使用已有符合条件的服务器，无需另购数据库或网关。费用以账号控制台的服务器、带宽和续费价格为准，不能只看首年优惠。使用中国大陆服务器前确认域名备案条件；地域、域名、预算由资源持有人落实。

## 选择依据

- Python 3.12 于 2023-10-02 正式发布，官方安全支持计划到 2028 年 10 月；“云平台某运行时公测”不等于 Python 自身公测。
- Python 3.10 的官方发布计划记载，2026-10-01 已结束维护，不作为新生产部署目标。
- 同学的纯标准库实现可作演示，但 `http.server` 官方文档明确不推荐生产使用。代码结构与运行环境一起升级，不以零依赖作为稳定性标准。
- Python 版本、基础镜像、系统和依赖都需要持续维护；长期运行不等于永久冻结一个环境。此方案保留完整测试和回退包。

官方依据：[Python 3.12 发布及支持计划](https://peps.python.org/pep-0693/)、[Python 3.10 维护结束](https://peps.python.org/pep-0619/)、[http.server 生产使用说明](https://docs.python.org/3.12/library/http.server.html)。腾讯云“3.11/3.12/3.13 全部公测”目前来自同学反馈，未取得对应地域、产品和架构的官方状态证明；选用正式服务器可避开该条件。

## 部署前需要的资源

1. 正式 Linux 云服务器和受控管理入口；由用户持有账号，不把永久密钥写入聊天或仓库。
2. 一个可以设置解析的 API 子域名，例如 `api.团队域名`，DNS 指向服务器公网地址；正式服务不长期依赖共享测试域名。
3. 安装并启用 Docker Engine 和 Compose 插件，确认 Docker 随服务器启动。公网放行 80/443；管理入口仅向维护人员开放。
4. 保存上一个已验收的提交、镜像、`.env` 配置和公开内容。准备好费用提醒与外部可用性告警的接收人。

## 首次上线

先在仓库根目录完成检查：

```sh
npm ci
npm run check
python3.12 -m venv .venv-backend
.venv-backend/bin/python -m pip install -r backend/requirements.lock
npm run test:backend
npm test
npm run test:integration
```

浏览器依赖按 README 安装。服务器可部署已经在其他环境验收的同一提交，不必为正式服务常驻 Node、浏览器或开发依赖。

将同一提交的仓库放入服务器，在仓库根目录执行。也可使用已经验收的后端发布 ZIP，它包含 `backend/` 和 `deploy/production/`；此时从解压根目录执行部署命令，前面的源码检查在完整仓库中完成：

```sh
cp deploy/production/production.env.example deploy/production/.env
# 编辑 .env：填真实域名、已验收提交号和来源；不要直接使用示例值。
docker compose -f deploy/production/compose.yml config --quiet
docker compose -f deploy/production/compose.yml build --pull
docker compose -f deploy/production/compose.yml up -d --wait
docker compose -f deploy/production/compose.yml ps
```

镜像构建会安装锁定的 Python 依赖；容器按非 root 用户运行。Caddy 在域名解析及 80/443 可访问后申请证书。记录实际 API 镜像和 Caddy 镜像摘要、提交号、内容版本与上线时间；仅写“最新版”不足以回退。

`restart: unless-stopped` 在进程退出、服务器和 Docker 重启后恢复服务。健康检查负责标记状态，Compose 不会仅因 unhealthy 自动重启仍存活的进程；外部监测需另行配置。

## 验收后再切网页

```sh
.venv-backend/bin/python scripts/verify-backend.py https://真实API域名 --version 包中内容版本
```

健康、标准路径、旧地址、CORS、ETag 和 JSON 错误都通过后，把 `config/public.json` 的 apiBase 改成 `https://真实API域名/api/v1/`、source 改成 api；执行 `npm run sync` 和检查，发布网页。再从公网电脑和手机检查图片、详情、实验室介绍及联系方式。源码测试、镜像构建、公网部署和实际浏览分别记录，不能互相代替。

## 维护与回退

- 每月检查系统、Python 镜像、Caddy 和依赖的安全更新；紧急修复及时安排。先在测试环境拉取镜像、重建并跑检查，再发布生产。更新基础镜像前保留已验收的旧镜像摘要。
- 云平台配置 CPU、内存、磁盘和费用告警；外部监测每 5 分钟访问 `/healthz` 并检查状态/JSON，另监测网页关键路径，确认通知确实能收到。容器日志按大小轮转，磁盘仍须监测。
- 每次内容更新先检查再发布；保存部署包、对应提交与配置。当前没有用户写入数据；以后加数据库时必须另设计备份和恢复。
- Python 3.12 支持在 2028 年 10 月结束，最迟于 2028 年上半年完成下一受支持版本的验证迁移。
- 出现问题先把网页 source 改回 local 并发布，保留访客浏览；恢复上一个提交及对应 `.env`/镜像，重新运行验收。不要删除 Caddy 数据卷，避免丢失证书状态。

截至 2026-11-11：以上部署文件已准备；本机 Docker 引擎未运行，尚未声称镜像构建、云端部署和证书申请已通过。只有拿到实际云资源后才能完成这些验收。
