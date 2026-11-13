# EdgeOne Pages / Makers 部署

更新：2026-11-13。目标：EdgeOne 前端、广州 SCF 只读 API、GitHub 源码与检查。**本次交付预览包；用户尚无正式域名，尚未创建云端项目。** GitHub Pages 继续可用。

## 现在由账号持有人操作

1. 登录自己的腾讯云账号，打开 [Pages/Makers 控制台](https://console.cloud.tencent.com/edgeone/pages)。若入口重定向，选择 EdgeOne 中的 Pages/Makers。
2. 先使用免费版，选择“导入 Git 仓库”，连接 GitHub，只授权 `LMH7/UniCore-Official-Website`。不用发送密码或令牌。
3. 按下表创建项目。`edgeone-release` 在本轮合并 main 且 GitHub 检查成功后自动生成；没有该分支时先等检查完成。
4. 暂不添加域名，不升级付费套餐，不开通服务器/COS/数据库/企业镜像仓库。关闭其他分支的自动预览可减少重复构建。
5. 部署成功后，在控制台点“预览”，将**完整预览链接**发回当前聊天；不要删去平台访问校验参数。开发者再验收真实网站。

| 配置 | 当前预览阶段填写 |
| --- | --- |
| 仓库 | `LMH7/UniCore-Official-Website` |
| 生产分支 | `edgeone-release` |
| 框架 | Other / None / 其他 |
| 根目录 | `./`，不是 `site/` |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run build:edgeone` |
| 输出目录 | `artifacts/edgeone-pages` |
| Node.js | `24.18.0`，官方构建指南列出的预装版本 |
| 加速区域 | 暂选“全球可用区（不含中国大陆）” |
| 环境变量 | `DEPLOY_MODE=preview`，暂不设置 `SITE_URL` |

根目录 `edgeone.json` 已配置构建与安全响应头。它由 `config/public.json` 生成，不手改；EdgeOne 不使用 Cloudflare 的 `_headers` 文件。

默认项目/部署域名在中国大陆网络下需要带校验的预览链接，官方目前说明有效期为 **3 小时**，到期在控制台重新生成。它不能代替长期官网地址。预览禁止搜索引擎收录、使用随站内容、不连接 SCF，因此现在无需改云函数跨域；这也不代表正式 API 已完成验收。

## 本机查看与部署包

在完整源码目录中可直接双击 `启动EdgeOne预览.cmd`，打开 `http://127.0.0.1:4178/`；也可执行：

```powershell
npm ci
npm run package:edgeone
node scripts/serve.mjs --port 4178 --dir artifacts/edgeone-pages --headers edgeone.json
```

打开 `http://127.0.0.1:4178/`。新包为 `release/inex-edgeone-时间戳.zip`，解压后直接看到 index.html、home.html 和 assets。不要上传整个源码目录或原始会议资料。

长期维护优先用 Git 导入。ZIP 可用于直接上传预览，包内 edgeone.json 只包含直接上传支持的响应头配置。直接上传项目之后不能改为 Git 集成，需另建项目，因此不要把临时上传项目当成长期维护方案。仍须在平台确认响应头已生效，本机检查不能替代云端检查。

## 正式域名准备好以后

1. 账号持有人购买/提供域名。未备案先用“不含中国大陆”节点；大陆或含大陆的全球加速需先备案。添加域名、DNS CNAME 和 HTTPS 证书。
2. 开发者将 `config/public.json` 中的 `siteBase`、`assetBase` 改为正式 HTTPS 根网址，**以 `/` 结尾**。默认保持 `source: "local"`、`apiBase: ""`，正式域名也可使用随站内容，无需修改云函数。执行 `npm run sync` 和 `npm run verify`，连同生成文件一起提交。GitHub 备用页会 noindex，canonical 指向官网。
3. 只在 EdgeOne **生产环境**设置 `DEPLOY_MODE=production`、`SITE_URL=https://实际域名/`。预览环境仍为 preview。正式模式未填写网址时构建会报错。
4. 如需启用 API，先按 SCF 手册部署包含**当前完整快照**的后端，再在域名、证书、新站图片均可访问后，给广州 SCF 设置：

   ```text
   ALLOWED_ORIGINS=https://实际域名,https://lmh7.github.io
   PUBLIC_ASSET_BASE=https://实际域名/
   PORT=9000
   ```

   来源不带路径和结尾 `/`；图片地址必须带 `/`。保留 GitHub 来源用于备用站，不使用 `*`。不要让 API 过早指向尚未上线的图片。
5. 当前版本以 `backend/data/snapshot.json` 中的 `version` 为准；本次整合后的产品完整字段与公网旧快照不同，不能直接沿用旧镜像。只有确认云端与当前快照版本和内容一致时，单改上述环境变量才无需重建镜像。随后将 `config/public.json` 改为 `source: "api"`，并显式填写有效、以 `/` 结尾的 HTTPS `apiBase`（包含 `/api/v1/` 路径），重新执行同步、检查和前端构建。
6. 检查响应头、全部图片、产品详情刷新、实验室、二维码、深层 404。启用 API 时确认页面数据来源是 api，不能把跨域失败或版本不匹配后的本地回退误认为接通。保持 local 模式时使用 `--source local` 验收，无需云端改动。

```powershell
npm run verify:live -- --base https://实际域名/ --source api --edgeone
$contentVersion = node -p "require('./backend/data/snapshot.json').version"
node scripts/backend-task.mjs smoke https://1531026871-73sj75z34t.ap-guangzhou.tencentscf.com --version $contentVersion --origin https://实际域名
```

普通可访问的预览地址可用 `--source local --edgeone`；平台带校验的预览链接先在浏览器中验收，不能把普通根域名代替完整校验链接传给脚本。全部完成并真实公网验收通过后，才宣布正式迁移。

## 日常发布、缓存与回退

- 工作分支 → PR → main。GitHub 检查完成后才快进 edgeone-release，EdgeOne 跟踪此分支。不要向发布分支手工提交，不强推。权限或分支保护导致快进失败时先修复工作流。
- GitHub 只证明检查通过及发布源更新，EdgeOne 成功状态须去其控制台看。GitHub Pages 仍单独发布备用站。
- 发布副本中的 CSS/JS 使用内容指纹文件名，适用 Makers 默认长期浏览器缓存；页面、配置和未带指纹资源采用平台默认重新验证策略。每次部署平台自动使边缘缓存失效，没有给所有文件统一设置一年缓存。
- GitHub 备用网址保留历史 PNG 地址，兼容旧页面缓存；EdgeOne 新站包只发布所需 WebP。
- 保留根目录 404.html，平台返回真正的 404；不要加把所有路径重写到首页的 SPA 规则。
- deploy-info.json 记录内容版本、模式与指纹。Git 导入构建可能没有 GITHUB_SHA，此时 commit 为 null，以平台提交号为准。
- 故障先从 Makers 部署列表恢复已验收版本；没有回滚入口时用 git revert 恢复源码，通过检查后重发。保留 GitHub 备用网址和旧镜像。
- 账号负责人设置预算/用量提醒，检查 SCF 错误、超时、调用量与日志保留。免费版无 SLA，额度以实际账号为准。静态前端迁移不需要再开通 AI、KV、Blob 等服务。

## 官方依据

2026-11-13 查询，域名期限与套餐并非永久承诺：

- [导入 Git 仓库](https://pages.edgeone.ai/zh/document/importing-a-git-repository)
- [直接上传与配置字段限制](https://pages.edgeone.ai/zh/document/direct-upload)
- [构建指南](https://pages.edgeone.ai/zh/document/build-guide)
- [edgeone.json 与响应头](https://pages.edgeone.ai/zh/document/edgeone-json)
- [缓存](https://pages.edgeone.ai/zh/document/configuring-cache) · [自定义 404](https://pages.edgeone.ai/zh/document/custom-404-page)
- [域名、预览期限和备案区域](https://pages.edgeone.ai/zh/document/domain-overview)
- [套餐比较](https://pages.edgeone.ai/zh/document/pricing-and-plans)
