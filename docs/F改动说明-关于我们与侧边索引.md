# F 分工改动说明：关于我们页 · 联系页 · 侧边栏目索引组件

分支：`lw`（由 `feat/about-index-f-20261110` 改名而来）
负责人：F（交叉验收人：E）
状态：仅推送分支，**暂不发起合并**，待团队验收

---

## 一、改动总览

本次改动围绕 F 负责的两块内容展开：

1. **关于我们页（about.html）**：按分工重建页面结构与视觉。
2. **侧边栏目索引组件（原 about-index，现泛化为 page-index）**：从关于页推广到解决方案、资源与支持、联系我们三个栏目页，并按反馈调整了样式与交互。

页面内容数据仍集中在 `site/assets/js/site-content.js` 等数据文件中维护，本次未改动数据结构，仅调整展示层（HTML / CSS / 交互脚本）。

## 二、关于我们页（about.html）

页面采用「左侧索引 + 右侧内容」的双栏布局（`.page-layout`）：

- **01 我们是谁**：团队简介与定位（公司注册中，页面不出现"有限公司"字样）。
- **02 研究方向**：三个方向卡片压在主题插画底边上（`.about-direction-visual`），减少割裂感。
- **03 依托实验室**：实验室列表，最下方以上标编号形式标注。
- **04 合作伙伴**：暂为占位文案，待团队确认可公开信息后补充。

板块标题统一样式（`.about-block`：眉标 + h2 + 顶部分隔线），页面间视觉一致。

## 三、侧边栏目索引组件（page-index）

由关于页原有的 `about-index` 泛化而来，现为全站通用组件：

### 结构

```html
<div class="page-layout">
  <aside class="page-index" aria-label="栏目索引">
    <span class="page-index-title">本页内容</span>
    <nav>
      <a href="#section-id"><span class="page-index-num">01</span>条目名</a>
    </nav>
  </aside>
  <div class="page-layout-main">…页面主体…</div>
</div>
```

### 样式

- 桌面端：浅蓝圆角面板（#f2f7ff + 细边框 + 轻投影），宽 216px，与主内容间距 56px。
- 垂直位置：sticky `top/bottom: 0` + `margin: auto`，滚动过程中在视口垂直居中，不固定贴顶。
- 当前板块：白底高亮 + 加粗 + 轻投影；悬停为浅蓝底。
- 移动端（≤991px）：变为内容顶部横向滚动条，毛玻璃白底，保持可用性。
- 关于页索引底部保留品牌卡（深色 logo + 两架手绘风格无人机插画，带浮动动画）。

### 交互（interactions.js）

- 滚动监听基于每个 `.page-index` 自身的链接 hash 自动匹配目标板块（IntersectionObserver），新增页面只需照结构写 HTML，无需改脚本。
- 接近页面底部时自动点亮最后一条索引。
- 各锚点已设置 `scroll-margin-top`，跳转后标题不被固定导航遮挡。

### 各页索引条目

| 页面 | 条目 |
| --- | --- |
| 关于我们 | 我们是谁 / 研究方向 / 依托实验室 / 合作伙伴 |
| 解决方案 | 教育与科研 / 自主探索与巡检 / 集群协同 |
| 资源与支持 | 公开资源 / 常见问题 |
| 联系我们 | 联系方式 / 交流主题 / 常见问题 |

## 四、随组件推广做的配套调整

1. **移除方案页横导航（solution-subnav）**：与左侧索引功能重复，已从 `app.js` 模板、interactions.js 监听与 CSS 中彻底移除，并通过 `scripts/sync-solutions.mjs` 重新生成静态内容，`npm run check` 通过。
2. **页面板块标题与索引对齐**：联系页卡片主标题定为"联系方式"（原标语"一起，让想法起飞"保留为副文案）；联系页"交流主题"、两页"常见问题"标题与索引一一对应，方便读者建立"索引 ↔ 板块"的映射。

## 五、涉及文件

- `site/about.html`：双栏布局、索引结构、类名迁移（about-index → page-index）
- `site/solutions.html` / `site/resources.html` / `site/contact.html`：引入 page-layout + page-index，板块补 id
- `site/assets/css/enhancements.css`：page-layout / page-index 系列样式（含移动端）、scroll-margin、移除 solution-subnav 样式
- `site/assets/js/interactions.js`：索引滚动监听泛化、移除方案页横导航监听
- `site/assets/js/app.js`：移除方案页横导航模板、联系卡片标题调整

## 六、验证方式

```bash
npm run check   # 导航同步 / 方案同步 / 页面与资源检查，须全部通过
```

本地预览：`npm run dev` 后访问对应栏目页，检查索引高亮跟随滚动、锚点跳转位置、移动端横条三处表现。

## 七、注意事项与后续

- **潜在冲突**：E 的 `feat/solutions-resources` 分支也在改首页/资源栏目，合并前建议双方对照 `solutions.html`、`resources.html` 的差异。
- **内容红线**：公司注册完成前，任何页面不得出现"有限公司"字样；网站无后端，联系页只展示微信 / LinkedIn 等公开渠道，不做表单提交。
- 合作伙伴等板块内容待团队确认后补充，当前为占位。
