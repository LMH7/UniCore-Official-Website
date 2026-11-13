# 前端交付与后续维护

## 已交付

完整前端及 iNEX 品牌更新，包含首页、产品列表/详情、方案、资源、关于、联系、错误页，全站搜索、筛选、对比、图像/二维码弹窗、分享、FAQ 和轻量动效。联系信息使用用户本次提供的微信及 LinkedIn。

源码仍在原仓库，部署源为 `site/`。本地打开方法见 README；详细改内容的方法见 CONTENT_GUIDE；后端准备见 BACKEND_PLAN。

## 接手入口

| 需要做什么 | 修改/查看哪里 |
| --- | --- |
| 改产品、图、参数 | `content/products.json`，然后运行 `npm run sync` |
| 改简介、方案、资源、联系、FAQ | `content/site-content.json`，然后运行 `npm run sync` |
| 改全站品牌和布局 | `layout.js`、`custom.css`、`enhancements.css` |
| 改页面交互 | `interactions.js`，产品筛选在 `app.js` |
| 运行/维护后端 | `backend/README.md`、`config/public.json` 和 `BACKEND_PLAN.md` |
| 发布和恢复旧版 | `DEPLOY.md` |
| 查看实际检查证据 | `ACCEPTANCE.md`、`docs/screenshots/`、Actions |

## 协作

开工先 `git pull --ff-only`，结束前检查差异并执行：

```sh
git add .
git commit -m "说明本次修改"
git push
```

多人同时修改时建议用分支和代码审阅；发生冲突不使用强制推送覆盖别人。不要把原始会议资料、账号密钥或未经审核的草稿加入 `site/`。

## 内容上仍需要团队提供

- 高清产品原图、经核实技术参数和公开资料。
- 进一步确认的团队介绍、真实案例与可公开成果。
- 如需邮箱联系，提供允许公开的邮箱；现有二维码可正常浏览和保存。
- 手机移动网络、校园网的实际可达性反馈。

以上为内容与真实设备验收事项。2026-11-12 已整合同学的只读后端、统一内容生成和部署候选，本机 9000 可同时预览网页与真实 API；发布数据仍为 local，新云端部署暂缓。完整团队介绍、重点项目正文和封面仍在各自 HTML/样式中维护，参见 CONTENT_GUIDE。
