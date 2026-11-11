# 内容维护说明

开始前 `git pull --ff-only`，本地用 `npm run dev:backend` 联调预览，或 `npm run dev` 静态预览。全站内容按下面的文件位置统一维护。修改内容后运行 `npm run sync`，不要直接改标有 Generated 的文件。

## 改产品与换图

打开 `content/products.json`。`summary` 是一句话介绍，`description` 是详情。首页、列表、详情、搜索、筛选与对比共用这份源内容；`npm run sync` 会同时生成网页副本与后端快照。

- `id` 必须唯一，只用小写英文、数字和短横线。上线后尽量不改，避免旧分享链接失效。
- `image` 使用 `assets/images/文件名.webp`，`imageAlt` 用简短文字说明图片。
- `sensor` 是筛选依据，当前可填写“激光雷达”或“深度相机”。若新增新的传感器类型，还需要在 `products.html` 和 `app.js` 中同步筛选按钮与允许值。
- `applications` 为研究方向数组；`specs` 为 `{label,value}` 数组，数据必须经研发确认。
- `resources` 为 `{title,url}` 数组，没有正式资料保持 `[]`。
- `status` 目前只为后续扩展预留，不控制公开状态。草稿不要写进公开产品数组。

现有三张图片的原始尺寸分别是 559×420、397×298、306×229。拿到高清图后替换同名文件即可；优先完整透明背景的 4:3 图片，建议每张不超过约 300KB。

## 新增产品

复制一条已有记录，填写新的 id、名称、定位、传感器、图片、替代文字、简介、详情、研究方向与参数。必需结构可直接参考现有记录或 `docs/api-examples/products.json` 中的 `data` 数组。

新增记录会显示在首页产品区、列表、搜索、对比，并能通过 `product.html?id=新id` 访问。首页首屏自动展示数组中的前 3 款平台，调整记录顺序即可改变首屏展示；所有产品仍会出现在下面的产品区。

## 改团队、方案、资源与 FAQ

`content/site-content.json` 集中保存：

- `name` / `shortName` / `brand` / `logo`：团队名称、简称、iNEX 与 Logo 路径。
- `intro`：首页与关于页共用简介。
- `solutions`：首页卡片、方案详情、全站搜索与方案快捷导航。
- `resources`：公开资源与全站搜索内容。
- `faqs`：资源和联系页的常见问题；每条包含 `question`、`answer`。

修改方案数据或 `app.js` 中的方案模板后运行 `npm run sync`，将同一份内容生成到 `solutions.html`。不要直接修改其中带 `data-solutions-key` 的生成内容；预置正文与快捷导航能避免页面加载后的布局跳动。

独立页面标题和页面引导文字在相应 HTML 中；品牌改名还要检查 `<title>`、description、Open Graph 文案，以及 `product-detail.js` 的动态标题。公司主体与资质不要从 Logo 推断，应以负责人确认的对外表述为准。

关于页使用连续排版：公司介绍之后是“依托实验室”，不再使用二级切换按钮。两个实验室的简介、官网链接和标识在 `site/about.html` 的 `.about-labs` 区域维护，顺序为飞行器基础布局全国重点实验室、跨域智能飞行实验室。标识分别使用 `aircraft-basic-layout-lab-logo.png` 与 `cdif-lab-logo.png`；简介来源见 `ASSET_SOURCES.md`。

## 微信与 LinkedIn

`contacts` 数组是联系卡片与二维码弹窗的统一来源。二维码图片都在 `site/assets/images/`：

- `wechat-qr.png`：微信二维码；网站提供放大、保存与长按识别，不假设微信二维码链接可以在普通浏览器直接加好友。
- `linkedin-qr.png`：LinkedIn 二维码，同时提供二维码识别得到的个人主页链接。

每条字段为 `id / label / name / icon / description / qrImage / url / action / downloadName`。暂未提供微信号，不自行添加可复制的文字微信号。更换二维码后务必实际扫描；微信二维码可能失效，应由联系人检查。

图像中多余头像与个人名片背景没有公开上传，站点仅使用联系二维码区域。原始 PDF 和原始联系图片保留在仓库外。

## 启用邮箱和额外信息

`email` 填写允许公开的真实邮箱后，联系页自动增加可点击邮箱与复制按钮。留空时隐藏邮箱区域，现有微信/LinkedIn 仍可使用。`location` 和 `qrImage` 是额外地点与附加二维码，可留空。

复制功能需 HTTPS 或本地预览；失败时会显示手动复制提示。当前没有提交表单、发送邮件或后台收信功能。

## 调整视觉与交互

基础布局在 `custom.css`，iNEX 品牌、hover、对比、二维码和动效在 `enhancements.css`。公共导航和页脚在 `layout.js`；全站搜索、弹窗、对比和分享在 `interactions.js`。不要修改第三方 `vendor` 文件。

公共导航由 `layout.js` 统一生成并预置在各页 HTML 中。修改导航或 `content/site-content.json` 中的品牌名称、Logo 后运行 `npm run sync`，再运行 `npm run check`；不要直接编辑各页的导航 HTML。

页面转场由 `page-transitions.js` 与 `enhancements.css` 管理：支持的浏览器交叠淡化前后页面，内嵌预览使用正文淡出、淡入，导航保持显示。该脚本在各页 head 中同步执行，避免内容先显示再隐藏。减少动态效果时关闭转场，站内锚点、外链、下载与新标签页操作保留浏览器行为。

窄屏导航会在同一标签页内保留展开状态，切换栏目时保持菜单高度；再次点击菜单按钮或按 Escape 可收起。切回桌面宽度后清除展开状态，下次缩窄窗口时默认收起。状态按网站目录保存，不影响同域其他网站。

用户选择减少动态效果时不会做进入动画；触屏可点击所有功能，核心内容不依赖 hover 才可发现。保持按钮的可读标签与键盘焦点样式。

## 后端准备

后端已实现，操作见 `backend/README.md`。正式配置在 `config/public.json`，目前 `source:"local"`；9000 联调预览会自动读取本机真实后端。云端验收后再将正式配置切为 `api` 并重新生成发布。

运行 `npm run sync` 自动更新接口示例、网页副本及后端快照。更新后端内容需重新打包发布；已启动进程不会热更新。发布图片和网页时使用同一提交，特别是撤下内容时同时更新回退副本。API 故障会显示“最新内容暂时无法获取，当前展示已保存的版本。”，访客仍可浏览。

## 发布前检查

1. `npm run sync` 后，`npm run check`、`npm run test:backend`、`npm test`、`npm run test:integration` 通过。
2. 手机和电脑打开关键页面，检查产品图、筛选、二维码、链接与新增文字。
3. 产品详情打开和刷新，点击咨询后型号正确。
4. 新资源链接实际可访问；新产品参数与素材已获准公开。
5. 提交推送，待 Actions 发布成功后从公网网址复查。

分享预览站即可让队友浏览；不需要让每位访客安装环境。开发依赖只用于浏览器检查。
