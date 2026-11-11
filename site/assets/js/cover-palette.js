/* 昼夜展开层中的纯显示前景：同步真实场景，所有交互仍由原节点处理。 */
(() => {
  const referenceAttributes = new Set([
    "id", "name", "autofocus", "accesskey", "for", "form", "list",
    "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns",
    "aria-activedescendant", "aria-flowto", "aria-details", "aria-errormessage",
  ]);
  const interactiveTags = new Set([
    "a", "area", "button", "input", "select", "textarea", "summary",
    "iframe", "object", "embed", "audio", "video",
  ]);

  window.createCoverPalettePreview = (scene, reveal) => {
    let preview = null;
    let rootPair = null;
    let target = "";
    let syncing = false;

    function clear() {
      const previous = preview;
      preview = rootPair = null;
      target = "";
      try { previous?.remove(); } catch { /* 展开层已被浏览器移除时无需再处理。 */ }
    }

    function copyAttributes(pair) {
      const { source, copy } = pair;
      const tag = source.localName?.toLowerCase() || "";
      const expected = new Map();
      for (const attribute of source.attributes) {
        const name = attribute.name;
        if (referenceAttributes.has(name) || name.startsWith("on")) continue;
        // 保留 SVG use 的外部图形引用，移除不可交互副本中的 HTML 链接。
        if (name === "href" && (tag === "a" || tag === "area")) continue;
        expected.set(name, attribute.value);
      }
      // inert 副本不会真正悬停或获得焦点，只镜像原控件的视觉状态。
      if (source.matches?.(":hover")) expected.set("data-cover-hover", "");
      if (source.matches?.(":focus-visible")) expected.set("data-cover-focus-visible", "");
      if (interactiveTags.has(tag) || source.hasAttribute("tabindex")) expected.set("tabindex", "-1");
      if (source.hasAttribute("contenteditable")) expected.set("contenteditable", "false");
      if (pair === rootPair) {
        const classes = (expected.get("class") || "").split(/\s+/).filter(Boolean);
        if (!classes.includes("cover-scene-preview")) classes.push("cover-scene-preview");
        expected.set("class", classes.join(" "));
        expected.set("data-cover-palette", target);
        expected.set("aria-hidden", "true");
        expected.set("inert", "");
        expected.set("tabindex", "-1");
      }
      for (const attribute of [...copy.attributes]) {
        if (!expected.has(attribute.name)) copy.removeAttribute(attribute.name);
      }
      for (const [name, value] of expected) {
        if (copy.getAttribute(name) !== value) copy.setAttribute(name, value);
      }
    }

    function pairTree(source, copy) {
      const pair = { source, copy, children: [] };
      pair.children = [...source.childNodes].map((child, index) => pairTree(child, copy.childNodes[index]));
      return pair;
    }

    function syncTree(pair) {
      const { source, copy } = pair;
      if (source.nodeType === 1) copyAttributes(pair);
      else if (copy.nodeValue !== source.nodeValue) copy.nodeValue = source.nodeValue;
      const sourceChildren = [...source.childNodes];
      if (sourceChildren.length !== pair.children.length || sourceChildren.some((node, index) => node !== pair.children[index]?.source)) {
        const previous = new Map(pair.children.map((child) => [child.source, child]));
        const next = sourceChildren.map((node) => {
          if (previous.has(node)) return previous.get(node);
          const added = pairTree(node, node.cloneNode(true));
          syncTree(added);
          return added;
        });
        const retained = new Set(next.map((child) => child.copy));
        for (const old of pair.children) if (!retained.has(old.copy)) old.copy.remove();
        next.forEach((child, index) => {
          if (copy.childNodes[index] !== child.copy) copy.insertBefore(child.copy, copy.childNodes[index] || null);
        });
        pair.children = next;
      }
      for (const child of pair.children) syncTree(child);
    }

    function syncAnimations(pair) {
      const { source, copy } = pair;
      if (typeof source.getAnimations === "function" && typeof copy.getAnimations === "function") {
        const originals = source.getAnimations();
        const used = new Set();
        for (const animation of copy.getAnimations()) {
          const matching = originals.find((candidate) => !used.has(candidate)
            && candidate.animationName === animation.animationName
            && candidate.transitionProperty === animation.transitionProperty);
          if (matching) {
            used.add(matching);
            animation.pause();
            if (matching.currentTime !== null) animation.currentTime = matching.currentTime;
          } else {
            // 原场景中已结束且没有填充效果的入场动画，不应在副本里重新播放。
            try { animation.finish(); } catch { animation.cancel(); }
          }
        }
      }
      for (const child of pair.children) syncAnimations(child);
    }

    function sync() {
      if (!preview || !rootPair || syncing) return false;
      syncing = true;
      try {
        syncTree(rootPair);
        const bounds = scene.getBoundingClientRect();
        const container = reveal.getBoundingClientRect();
        Object.assign(preview.style, {
          position: "absolute", margin: "0", flex: "none", minHeight: "0",
          left: `${bounds.left - container.left}px`, top: `${bounds.top - container.top}px`,
          width: `${bounds.width}px`, height: `${bounds.height}px`,
          pointerEvents: "none",
        });
        syncAnimations(rootPair);
        return true;
      } catch {
        // 部分内嵌浏览器不提供完整 DOM/动画接口时，保持原场景可操作。
        clear();
        return false;
      } finally {
        syncing = false;
      }
    }

    function show(theme) {
      clear();
      if (!scene || !reveal || typeof scene.cloneNode !== "function") return false;
      try {
        target = theme === "night" ? "night" : "day";
        preview = scene.cloneNode(true);
        rootPair = pairTree(scene, preview);
        // 先清理所有标识和交互引用，再插入文档，避免瞬间出现重复 ID。
        syncTree(rootPair);
        reveal.append(preview);
        return sync();
      } catch {
        clear();
        return false;
      }
    }

    return { show, sync, clear };
  };
})();
