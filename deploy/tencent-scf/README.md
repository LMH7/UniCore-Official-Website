# 腾讯云广州云函数部署与维护

当前使用用户个人账号的广州 SCF Web 函数及个人版镜像仓库。新镜像已上传且公网升级检查通过；[最终验收记录](../../docs/2026-11-12-整体验收.md) 是当前状态入口。早期成本调查和上传记录只描述当时状态。

## 当前资源

| 项目 | 当前值 |
| --- | --- |
| 地域 | 广州 `ap-guangzhou` |
| 仓库 | `ccr.ccs.tencentyun.com/limuheng/test-nginx`，个人版 |
| 当前标签 | `v-a56f29d171df80e5-20261112t151218z` |
| 当前摘要 | `sha256:fe47e9c0064d940adb809a225022b17839333e120cee0d3c5fd47ec89eb8e1ec` |
| 内容版本 | `a56f29d171df80e5` |
| 函数 URL | `https://1531026871-73sj75z34t.ap-guangzhou.tencentscf.com` |
| 运行方式 | Linux/amd64 容器，Python 3.12.16、Flask、Waitress |
| 监听端口 | 9000 |
| 上一版标签 | `inex-backend-d858ad922405d8d9-20261112`，保留回退 |

本次没有购买企业版 TCR、服务器、数据库、API 网关或常驻实例。个人版仓库现已能实际上传；早期按企业版固定价算的每月数百元不适用于当前仓库。函数计算、调用、响应流量与日志仍按实际用量计费，不承诺永久免费。[原始选型调查](选型调查.md) 保留作出处和选型历史。

## 更新镜像

在完整 Git 仓库中执行：

```powershell
npm run sync
npm run verify
docker login ccr.ccs.tencentyun.com --username 你的账号ID
npm run build:cloud -- --image ccr.ccs.tencentyun.com/limuheng/test-nginx --push
```

登录密码在交互提示中输入，不放在命令、聊天或文件中。Docker Desktop 使用 Linux 容器。构建脚本会检查内容、构建 Linux/amd64 镜像、启动临时容器、验证真实 HTTP，再上传；失败不上传。输出专属标签、摘要和 `release/cloud-image-*.json`，不覆盖旧标签，也不自动修改云函数。

默认拉取 Docker 官方 `python:3.12-slim-bookworm` 的当前补丁。若本地网络无法正常拉取，可使用经审核的官方镜像地址与摘要：

```powershell
npm run build:cloud -- --image ccr.ccs.tencentyun.com/limuheng/test-nginx --base public.ecr.aws/docker/library/python@sha256:935c3c5b12357a7e10caa9c1e6ca5692344d97cf229832ef584be2cec9fc03df --push
```

上述摘要对应本次构建；长期维护时定期审核并更新补丁摘要，不永久冻结到该镜像。不能关闭 TLS 校验绕过网络问题。

本机没有 Docker 时，可用仓库 Actions 的 **Build and verify cloud image**。默认只构建验收；需要上传时，由账号持有人在仓库 Secrets 配置 `TCR_USERNAME`、`TCR_PASSWORD`，填写实际仓库地址并勾选上传。此工作流不需要云 API 管理密钥。

## 账号持有人操作控制台

[函数控制台](https://console.cloud.tencent.com/scf) → 广州 → 当前函数 → 镜像配置 → 编辑 → 个人版仓库 `limuheng/test-nginx` → 本次专属标签 → 提交 → 保存部署。

- 函数为 Web 函数、容器镜像部署；端口 9000，Entrypoint/CMD 留空使用镜像入口。
- 初始建议 512MB、15 秒超时，不配置预置并发/常驻实例；实际设置由账号持有人核实。
- 业务不需要 VPC、NAT、数据库、持久磁盘或公网固定 IP，不创建这些资源。
- 保留环境变量：`ALLOWED_ORIGINS=https://lmh7.github.io`、`PUBLIC_ASSET_BASE=https://lmh7.github.io/UniCore-Official-Website/`、`PORT=9000`。
- CORS 由应用处理，不在平台重复添加 `*`；公开接口使用 GET/HEAD/OPTIONS，不携带云账号凭据。

已有 HTTPS 函数 URL 无需重建。直接打开函数地址可能下载 JSON，这是平台添加的响应行为；网页用 fetch 读取，不把该地址当成网站首页。

稳定后可发布不可变函数版本并建立 `prod` 别名，保留上一个已验收版本。若别名 URL 不同，要以实际 URL 更新 `config/public.json`、同步网络配置并发布网页；不要未经检查更换现有入口。

## 公网验收与网页发布

版本号取当前快照或本次镜像记录：

```powershell
node scripts/backend-task.mjs smoke https://1531026871-73sj75z34t.ap-guangzhou.tencentscf.com --version a56f29d171df80e5
```

检查覆盖健康、两个接口、旧地址别名、版本、CORS、ETag/304、HEAD、OPTIONS、JSON 404 和写方法拒绝。之后发布同一版网页与图片，从公网实际验证搜索、详情刷新、实验室、方案推荐、资源和二维码。

官网 `config/public.json` 已使用 `source: api` 和此 URL 下的 `/api/v1/`。两个 API 与网页内容版本必须一致，否则使用网页本地副本，避免把新方案或资源降回旧版。图片由网站托管，函数不下载或转发图片。

## 运维和回退

每次内容发布保存 Git 提交、镜像专属标签、摘要、内容版本及验收结果。旧镜像在仍被函数版本引用时不要删除，避免冷启动拉取失败。

后端故障时恢复上一个已验收标签/版本及其配置；网页可先把 `source` 改回 `local`，同步后发布维持浏览。使用 `git revert` 回退代码，不强推覆盖队友历史。

账号持有人设置预算提醒，检查请求量、失败率、延迟、并发和 CLS 日志费用；初期日志可按需保留 7 天。不要每分钟访问强行保活。低流量允许缩到零，冷启动时网页有超时回退。

Python 3.12 官方安全维护到 2028-10，需提前计划升级，并定期重建、验收补丁版本。现有平台 HTTPS 地址可用于本轮展示；将来使用团队域名时再确认归属及相应备案规则。
