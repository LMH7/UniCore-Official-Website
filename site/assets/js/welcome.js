/* 互动封面：只做概念飞行演示，不依赖第三方库或后台服务。 */
(() => {
  const world = document.getElementById("flight-world");
  const aircraft = document.getElementById("flight-aircraft");
  const model = document.getElementById("aircraft-model");
  const origin = document.getElementById("flight-origin");
  const launchMarker = document.getElementById("flight-launch-point");
  const idleHint = document.getElementById("flight-idle-hint");
  const idleLabel = document.getElementById("flight-idle-label");
  const targetMarker = document.getElementById("flight-target");
  const trail = document.getElementById("flight-trail");
  const trailPath = document.getElementById("flight-trail-path");
  const toggle = document.getElementById("flight-toggle");
  const toggleLabel = document.getElementById("flight-toggle-label");
  const status = document.getElementById("flight-status");
  const controls = document.getElementById("flight-controls");
  const resetButton = document.getElementById("flight-reset");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const touch = matchMedia("(hover: none) and (pointer: coarse)");
  const state = {
    x: 0, y: 0, targetX: 0, targetY: 0, angle: 0,
    width: 0, height: 0, radius: 80,
    following: false, hasFlown: false, frame: 0, time: 0,
    returning: false, returnFrame: 0, homeX: 0, homeY: 0,
  };
  let trailPoints = [];
  let syncPalette = () => {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(Math.max(min, max), value));
  }
  function constrain(x, y) {
    const marginX = Math.min(state.radius, state.width / 2);
    const marginY = Math.min(state.radius, state.height / 2);
    return {
      x: clamp(x, marginX, state.width - marginX),
      y: clamp(y, marginY, state.height - marginY),
    };
  }
  function shortestTurn(from, to) {
    return ((to - from + 540) % 360 + 360) % 360 - 180;
  }
  function updateIdleHint() {
    if (idleHint) idleHint.hidden = state.following || state.returning;
    if (idleLabel) idleLabel.textContent = state.hasFlown ? "点击飞机继续跟随" : "点击飞机开始跟随";
  }
  function updateLaunchPoint() {
    const bounds = world.getBoundingClientRect();
    const home = origin.getBoundingClientRect();
    const point = constrain(home.left - bounds.left, home.top - bounds.top);
    state.homeX = point.x;
    state.homeY = point.y;
    if (launchMarker) {
      launchMarker.style.left = `${point.x}px`;
      launchMarker.style.top = `${point.y}px`;
      launchMarker.hidden = false;
    }
  }
  function cancelReturn() {
    if (!state.returning) return;
    cancelAnimationFrame(state.returnFrame);
    state.returnFrame = 0;
    state.returning = false;
    state.targetX = state.x;
    state.targetY = state.y;
    document.body.classList.remove("is-returning");
  }
  function render() {
    aircraft.style.transform = `translate3d(${state.x - aircraft.offsetWidth / 2}px, ${state.y - aircraft.offsetHeight / 2}px, 0)`;
    aircraft.dataset.hintSide = state.x < Math.min(210, state.width / 2) ? "right" : "left";
    model.style.transform = `rotate(${state.angle}deg)`;
    targetMarker.style.transform = `translate(${state.targetX - 11}px, ${state.targetY - 11}px)`;
    syncPalette();
  }
  function clearTrail() {
    trailPoints = [];
    trailPath.setAttribute("d", "");
  }
  function drawTrail() {
    const last = trailPoints.at(-1);
    if (last && Math.hypot(last.x - state.x, last.y - state.y) < 5) return;
    trailPoints.push({ x: state.x, y: state.y });
    if (trailPoints.length > 36) trailPoints.shift();
    trailPath.setAttribute("d", trailPoints.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
  }
  function queueFrame() {
    if (state.following && !state.frame) state.frame = requestAnimationFrame(step);
  }
  function step(time) {
    state.frame = 0;
    if (!state.following) return;
    const delta = state.time ? Math.min(time - state.time, 50) : 16.7;
    state.time = time;
    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    const distance = Math.hypot(dx, dy);
    const ease = reduced.matches ? 1 : 1 - Math.exp(-delta / 110);
    let turn = 0;
    if (distance > 1) {
      const heading = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      turn = shortestTurn(state.angle, heading);
      state.angle += turn * (reduced.matches ? 1 : 1 - Math.exp(-delta / 90));
    }
    state.x += dx * ease;
    state.y += dy * ease;
    if (distance < .2) { state.x = state.targetX; state.y = state.targetY; }
    if (!reduced.matches) drawTrail();
    render();
    if (Math.hypot(state.targetX - state.x, state.targetY - state.y) > .2)
      queueFrame();
    else state.time = 0;
  }
  function setFollowing(following, message) {
    cancelReturn();
    state.following = following;
    document.body.classList.toggle("is-following", following);
    aircraft.setAttribute("aria-pressed", String(following));
    aircraft.setAttribute("aria-label", following ? "暂停飞机跟随" : "让飞机跟随指针");
    toggle.setAttribute("aria-pressed", String(following));
    toggleLabel.textContent = following ? "暂停跟随" : "开始跟随";
    status.textContent = message || (following ? "跟随中" : "已暂停");
    targetMarker.hidden = !following;
    if (following) {
      state.hasFlown = true;
      state.time = 0;
      queueFrame();
    } else {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.time = 0;
    }
    updateIdleHint();
    syncPalette();
  }
  function pointAt(clientX, clientY) {
    // 指针经过其他控件时，不能改变正在返航的固定目的地。
    if (state.returning) return;
    const bounds = world.getBoundingClientRect();
    const point = constrain(clientX - bounds.left, clientY - bounds.top);
    state.targetX = point.x;
    state.targetY = point.y;
    if (state.following) queueFrame();
  }
  function placeAtLaunch() {
    setFollowing(false, "等待起飞");
    state.hasFlown = false;
    state.angle += shortestTurn(state.angle, -24);
    state.x = state.targetX = state.homeX;
    state.y = state.targetY = state.homeY;
    clearTrail();
    render();
    updateIdleHint();
  }
  function reset() {
    setFollowing(false);
    const dx = state.homeX - state.x;
    const dy = state.homeY - state.y;
    const distance = Math.hypot(dx, dy);
    if (reduced.matches || !state.hasFlown || (distance < .2 && Math.abs(shortestTurn(state.angle, -24)) < .2)) {
      placeAtLaunch();
      return;
    }
    const start = { x: state.x, y: state.y, angle: state.angle, time: performance.now() };
    const bend = Math.min(90, distance * .14);
    const control = constrain(
      (state.x + state.homeX) / 2 - (distance ? dy / distance : 0) * bend,
      (state.y + state.homeY) / 2 + (distance ? dx / distance : 0) * bend,
    );
    const heading = distance > .2 ? Math.atan2(dy, dx) * 180 / Math.PI + 90 : -24;
    const travelAngle = start.angle + shortestTurn(start.angle, heading);
    const finalAngle = travelAngle + shortestTurn(travelAngle, -24);
    const smooth = (value) => value * value * (3 - 2 * value);
    state.returning = true;
    document.body.classList.add("is-returning");
    aircraft.setAttribute("aria-label", "中断返航并开始跟随");
    status.textContent = "正在返回出发点";
    clearTrail();
    updateIdleHint();
    function returnStep(time) {
      state.returnFrame = 0;
      if (!state.returning) return;
      const progress = Math.min(1, Math.max(0, (time - start.time) / 900));
      const path = smooth(progress);
      const inverse = 1 - path;
      state.x = inverse * inverse * start.x + 2 * inverse * path * control.x + path * path * state.homeX;
      state.y = inverse * inverse * start.y + 2 * inverse * path * control.y + path * path * state.homeY;
      state.angle = progress < .65
        ? start.angle + (travelAngle - start.angle) * smooth(progress / .65)
        : travelAngle + (finalAngle - travelAngle) * smooth((progress - .65) / .35);
      drawTrail();
      render();
      if (progress === 1) placeAtLaunch();
      else state.returnFrame = requestAnimationFrame(returnStep);
    }
    state.returnFrame = requestAnimationFrame(returnStep);
  }
  function resize() {
    const wasReturning = state.returning;
    setFollowing(false);
    const bounds = world.getBoundingClientRect();
    state.width = bounds.width;
    state.height = bounds.height;
    state.radius = Math.hypot(aircraft.offsetWidth, aircraft.offsetHeight) / 2 + 8;
    trail.setAttribute("viewBox", `0 0 ${state.width} ${state.height}`);
    updateLaunchPoint();
    if (!state.hasFlown || wasReturning) placeAtLaunch();
    else {
      const point = constrain(state.x, state.y);
      state.x = state.targetX = point.x;
      state.y = state.targetY = point.y;
      clearTrail();
      render();
    }
  }

  document.addEventListener("pointermove", (event) => {
    if (event.isPrimary === false) return;
    pointAt(event.clientX, event.clientY);
  }, { passive: true });
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const clicked = event.target.closest?.("a, button, input, textarea, select");
    if (clicked && clicked !== aircraft) return;
    cancelReturn();
    if (event.detail > 0) pointAt(event.clientX, event.clientY);
    setFollowing(!state.following);
  });
  toggle.addEventListener("click", () => setFollowing(!state.following));
  resetButton.addEventListener("click", reset);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { setFollowing(false); return; }
    if (event.target !== aircraft && event.target !== toggle) return;
    const moves = { ArrowUp: [0, -40], ArrowDown: [0, 40], ArrowLeft: [-40, 0], ArrowRight: [40, 0] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    cancelReturn();
    const point = constrain(state.targetX + move[0], state.targetY + move[1]);
    state.targetX = point.x;
    state.targetY = point.y;
    if (!state.following) setFollowing(true);
    else queueFrame();
  });
  document.documentElement.addEventListener("pointerleave", (event) => {
    // 触屏抬手也会派发 pointerleave，保留轻点后的飞行状态。
    if (event.pointerType === "touch") return;
    if (state.following) setFollowing(false);
  });
  addEventListener("blur", () => {
    if (state.following || state.returning) setFollowing(false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (state.following || state.returning)) setFollowing(false);
  });
  addEventListener("pagehide", () => setFollowing(false));
  addEventListener("resize", resize);
  reduced.addEventListener("change", () => {
    clearTrail();
    if (reduced.matches && state.returning) placeAtLaunch();
    else if (state.following) queueFrame();
  });
  const help = document.getElementById("flight-help");
  help.innerHTML = touch.matches
    ? "轻点飞机或空白处，开启飞行<br /><span>触摸移动来引导，再轻点一次暂停</span>"
    : "点击飞机或空白处，开启跟随<br /><span>移动指针来引导，再点一下暂停 · Esc 也可暂停</span>";
  aircraft.hidden = false;
  controls.hidden = false;
  resize();

  // 天空与目标色前景共享同一裁剪层；完整按住后才提交主题与会话记录。
  let coverEntering = false;
  const root = document.documentElement;
  const skyBase = document.getElementById("cover-sky-base");
  const skyReveal = document.getElementById("cover-sky-reveal");
  const themeToggle = document.getElementById("cover-theme-toggle");
  const themeLabel = document.getElementById("cover-theme-label");
  if (skyBase && skyReveal && themeToggle && themeLabel) {
    const palettePreview = globalThis.createCoverPalettePreview?.(document.getElementById("cover-scene"), skyReveal);
    syncPalette = () => {
      if (palettePreview?.sync() === false) skyReveal.classList.add("is-background-only");
    };
    const themeKey = "inex-cover-theme:v1";
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    let currentTheme = root.dataset.coverTheme === "night" ? "night" : "day";
    const boundary = document.getElementById("cover-theme-boundary");
    const ring = document.getElementById("cover-theme-ring");
    const holdDuration = 1500;
    let operation = null;
    let version = 0;
    let pointerId = null;
    let heldKey = null;
    let replayingEntry = false;
    let navigationRecovery = 0;

    function updateThemeControl() {
      themeToggle.setAttribute("aria-pressed", String(currentTheme === "night"));
      themeToggle.setAttribute("aria-label", currentTheme === "day" ? "长按 1.5 秒切换为夜间" : "长按 1.5 秒切换为日间");
      themeLabel.textContent = currentTheme === "day" ? "长按切换夜空" : "长按切换晴空";
      themeToggle.removeAttribute("title");
    }
    function applyTheme(theme, remember = true) {
      currentTheme = theme;
      root.dataset.coverTheme = theme;
      skyBase.dataset.sky = theme;
      themeMeta?.setAttribute("content", theme === "night" ? "#06111f" : "#79b6df");
      if (remember) {
        try { sessionStorage.setItem(themeKey, theme); } catch { /* 存储不可用仍可切换。 */ }
      }
      updateThemeControl();
    }
    function clearPreview() {
      palettePreview?.clear();
      skyReveal.classList.remove("is-revealing", "is-background-only");
      skyReveal.style.removeProperty("clip-path");
      boundary?.classList.remove("is-active");
      ring?.setAttribute("r", "0");
      themeToggle.style.setProperty("--hold-progress", "0");
      delete themeToggle.dataset.holding;
      delete root.dataset.coverPreview;
    }
    function releaseInput() {
      const capturedPointer = pointerId;
      pointerId = null;
      heldKey = null;
      if (capturedPointer !== null) {
        try { themeToggle.releasePointerCapture(capturedPointer); } catch { /* 指针可能已被系统取消。 */ }
      }
    }
    function discardOperation() {
      version++;
      if (operation) cancelAnimationFrame(operation.frame);
      operation = null;
      clearPreview();
      themeToggle.disabled = coverEntering;
      themeToggle.setAttribute("aria-busy", "false");
      updateThemeControl();
    }
    async function prepareSky(theme) {
      const image = document.getElementById(`cover-sky-${theme}-image`);
      if (!image) return false;
      if (image.complete && image.naturalWidth > 0) return true;
      if (typeof image.decode !== "function") return false;
      let timeout = 0;
      try {
        return await Promise.race([
          image.decode().then(() => image.naturalWidth > 0).catch(() => false),
          new Promise((resolve) => { timeout = setTimeout(() => resolve(false), 5000); }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    }
    function geometry() {
      const bounds = skyReveal.getBoundingClientRect();
      const button = themeToggle.getBoundingClientRect();
      const x = button.left + button.width / 2 - bounds.left;
      const y = button.top + button.height / 2 - bounds.top;
      const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y)) + 12;
      boundary?.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      return { x, y, radius };
    }
    function showPreview(op) {
      if (reduced.matches) return;
      // 背景入场的缩放只作用于底图，切换从稳定的视口坐标开始。
      document.querySelector(".cover-skies")?.classList.add("is-settled");
      skyReveal.dataset.sky = op.target;
      skyReveal.style.clipPath = `circle(0px at ${op.x}px ${op.y}px)`;
      const hasForeground = palettePreview?.show(op.target) === true;
      skyReveal.classList.toggle("is-background-only", !hasForeground);
      skyReveal.classList.add("is-revealing");
      boundary?.classList.add("is-active");
      root.dataset.coverPreview = op.target;
    }
    function paintPreview(op, progress) {
      op.progress = progress;
      themeToggle.style.setProperty("--hold-progress", String(progress));
      if (reduced.matches) return;
      syncPalette();
      const radius = op.radius * progress;
      skyReveal.style.clipPath = `circle(${radius}px at ${op.x}px ${op.y}px)`;
      ring?.setAttribute("cx", String(op.x));
      ring?.setAttribute("cy", String(op.y));
      ring?.setAttribute("r", String(radius));
    }
    function commitOperation(op) {
      if (operation !== op) return;
      // 目标底图先就位，再移除展开层，避免结束时闪回旧主题。
      applyTheme(op.target);
      discardOperation();
    }
    function rollback(immediate = false) {
      const previous = operation;
      if (!previous) return;
      if (immediate || reduced.matches || previous.progress === 0) {
        discardOperation();
        return;
      }
      cancelAnimationFrame(previous.frame);
      const op = {
        ...previous, kind: "revert", version: ++version,
        startedAt: performance.now(), from: previous.progress, frame: 0,
      };
      operation = op;
      delete themeToggle.dataset.holding;
      themeToggle.setAttribute("aria-busy", "false");
      themeLabel.textContent = "松开已取消";
      const duration = 240 + op.from * 160;
      function retreat(time) {
        if (operation !== op) return;
        const elapsed = Math.min(1, Math.max(0, (time - op.startedAt) / duration));
        paintPreview(op, op.from * Math.pow(1 - elapsed, 3));
        if (elapsed === 1) discardOperation();
        else op.frame = requestAnimationFrame(retreat);
      }
      op.frame = requestAnimationFrame(retreat);
    }
    function unavailable() {
      discardOperation();
      releaseInput();
      themeLabel.textContent = "背景未就绪";
      themeToggle.setAttribute("aria-label", "背景图片尚未就绪，请稍后重新长按切换");
      themeToggle.setAttribute("title", "背景图片尚未加载完成，请稍后重试");
    }
    async function startHold() {
      const op = {
        kind: "hold", target: currentTheme === "day" ? "night" : "day",
        version: ++version, startedAt: performance.now(), progress: 0, frame: 0,
        ...geometry(),
      };
      operation = op;
      themeToggle.dataset.holding = "";
      themeToggle.setAttribute("aria-busy", "true");
      themeToggle.removeAttribute("title");
      themeLabel.textContent = "正在准备背景…";
      const ready = await prepareSky(op.target);
      if (operation !== op || version !== op.version) return;
      if (!ready) { unavailable(); return; }
      showPreview(op);
      function advance(time) {
        if (operation !== op) return;
        if ((pointerId === null && heldKey === null) || document.hidden) { rollback(document.hidden); return; }
        const progress = Math.min(1, Math.max(0, (time - op.startedAt) / holdDuration));
        themeLabel.textContent = `保持长按 ${Math.round(progress * 100)}%`;
        paintPreview(op, progress);
        if (progress === 1) commitOperation(op);
        else op.frame = requestAnimationFrame(advance);
      }
      op.frame = requestAnimationFrame(advance);
    }
    function stopHold(immediate = false) {
      releaseInput();
      if (operation?.kind === "hold") rollback(immediate);
    }
    themeToggle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.isPrimary === false || operation || coverEntering || pointerId !== null || heldKey !== null) return;
      event.preventDefault();
      pointerId = event.pointerId;
      themeToggle.focus({ preventScroll: true });
      try { themeToggle.setPointerCapture(pointerId); } catch { /* document 监听仍会接收松开。 */ }
      startHold();
    });
    function pointerReleased(event) {
      if (event.pointerId === pointerId) stopHold();
    }
    themeToggle.addEventListener("pointerup", pointerReleased);
    themeToggle.addEventListener("pointercancel", pointerReleased);
    themeToggle.addEventListener("lostpointercapture", pointerReleased);
    document.addEventListener("pointerup", pointerReleased);
    document.addEventListener("pointercancel", pointerReleased);
    themeToggle.addEventListener("keydown", (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (event.repeat || heldKey !== null || pointerId !== null || operation || coverEntering) return;
      heldKey = event.key;
      startHold();
    });
    document.addEventListener("keyup", (event) => {
      if (event.key !== heldKey) return;
      event.preventDefault();
      stopHold();
    });
    themeToggle.addEventListener("blur", () => stopHold());
    themeToggle.addEventListener("click", (event) => event.preventDefault());
    themeToggle.addEventListener("contextmenu", (event) => event.preventDefault());

    function resetNavigation() {
      clearTimeout(navigationRecovery);
      navigationRecovery = 0;
      coverEntering = false;
      delete root.dataset.coverEntering;
      themeToggle.disabled = false;
      if (operation?.kind === "entry") rollback(document.hidden);
      scheduleSlide();
    }
    function enterAfterNight(link, op) {
      if (operation !== op || !coverEntering) return;
      commitOperation(op);
      themeToggle.disabled = true;
      replayingEntry = true;
      link.click();
      replayingEntry = false;
      // 浏览器或扩展取消导航时，恢复当前封面可操作性。
      navigationRecovery = setTimeout(resetNavigation, 2200);
    }
    async function beginEntry(link) {
      stopHold(true);
      discardOperation();
      coverEntering = true;
      root.dataset.coverEntering = "";
      themeToggle.disabled = true;
      themeToggle.setAttribute("aria-busy", "true");
      setFollowing(false);
      stopCarouselTimers();
      const op = {
        kind: "entry", target: "night", version: ++version,
        startedAt: 0, progress: 0, frame: 0, ...geometry(),
      };
      operation = op;
      themeLabel.textContent = "正在进入夜空…";
      const ready = await prepareSky("night");
      if (operation !== op || version !== op.version || !coverEntering) return;
      if (!ready) {
        resetNavigation();
        unavailable();
        status.textContent = "夜空背景未就绪，请重试进入首页";
        return;
      }
      if (reduced.matches) { enterAfterNight(link, op); return; }
      showPreview(op);
      op.startedAt = performance.now();
      function advance(time) {
        if (operation !== op || !coverEntering) return;
        const progress = Math.min(1, Math.max(0, (time - op.startedAt) / 1200));
        paintPreview(op, progress);
        if (progress === 1) enterAfterNight(link, op);
        else op.frame = requestAnimationFrame(advance);
      }
      op.frame = requestAnimationFrame(advance);
    }
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[data-cover-entry]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      if (replayingEntry) return;
      if (coverEntering) { event.preventDefault(); return; }
      setFollowing(false);
      if (currentTheme === "night") {
        stopHold(true);
        discardOperation();
        return;
      }
      event.preventDefault();
      beginEntry(link);
    }, { capture: true });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const alreadyReverting = operation?.kind === "revert";
      if (operation || pointerId !== null || heldKey !== null || coverEntering) event.preventDefault();
      stopHold();
      if (coverEntering) resetNavigation();
      if (alreadyReverting) discardOperation();
    });
    addEventListener("blur", () => {
      stopHold();
      if (coverEntering) resetNavigation();
    });
    addEventListener("resize", () => {
      stopHold();
      if (coverEntering) resetNavigation();
    });
    addEventListener("pagehide", () => {
      stopHold(true);
      resetNavigation();
      discardOperation();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) return;
      stopHold(true);
      if (coverEntering) resetNavigation();
      discardOperation();
    });
    reduced.addEventListener("change", () => {
      stopHold(true);
      if (coverEntering) resetNavigation();
      discardOperation();
    });
    applyTheme(currentTheme, false);
    themeToggle.hidden = false;
  }

  // 文案只在此维护；轮播控制与飞机控制互不改变状态。
  const message = document.getElementById("cover-message");
  const title = document.getElementById("cover-title");
  const description = document.getElementById("cover-description");
  const carouselControls = document.getElementById("cover-carousel-controls");
  const carouselToggle = document.getElementById("cover-carousel-toggle");
  const carouselLabel = document.getElementById("cover-carousel-label");
  if (!message || !title || !description || !carouselControls || !carouselToggle || !carouselLabel) return;
  const slides = [
    {
      title: ["联核智域", "iNEX"],
      titleSeparator: " ",
      description: ["连接感知、算法与飞行实验，", "探索自主空中机器人的更多可能。"],
    },
    {
      title: ["让想法，", "自由飞行。"],
      description: ["面向科研与教育，", "让每一次好奇都有起飞的可能。"],
    },
    {
      title: ["从单机，", "到集群协同。"],
      description: ["连接机器人平台、感知与仿真，", "为研究打开新的方向。"],
    },
  ];
  const selectors = [...carouselControls.querySelectorAll("[data-cover-slide-index]")];
  let currentSlide = 0;
  let userPaused = false;
  let focused = !document.hidden;
  let nextTimer = 0;
  let changeTimer = 0;
  function stopCarouselTimers() {
    clearTimeout(nextTimer);
    clearTimeout(changeTimer);
    nextTimer = changeTimer = 0;
    message.classList.remove("is-changing");
  }
  function updateCarouselControl() {
    carouselToggle.disabled = reduced.matches;
    carouselToggle.setAttribute("aria-pressed", String(userPaused || reduced.matches));
    carouselToggle.setAttribute("aria-label", reduced.matches
      ? "自动轮播已按减少动态偏好关闭，可手动选择文案"
      : userPaused ? "继续自动切换文案" : "暂停自动切换文案");
    carouselLabel.textContent = reduced.matches ? "手动切换" : userPaused ? "继续轮播" : "暂停轮播";
  }
  function renderLines(container, lines, firstOrder, separator = "") {
    const content = [];
    lines.forEach((text, index) => {
      if (index > 0 && separator) content.push(document.createTextNode(separator));
      const line = document.createElement("span");
      line.className = "cover-line";
      line.dataset.lineOrder = String(firstOrder + index);
      line.style.setProperty("--line-delay", `${(firstOrder + index) * 220}ms`);
      const inner = document.createElement("span");
      inner.className = "line-inner";
      inner.textContent = text;
      line.append(inner);
      content.push(line);
    });
    container.replaceChildren(...content);
  }
  function renderSlide(index) {
    currentSlide = index;
    const slide = slides[index];
    renderLines(title, slide.title, 0, slide.titleSeparator);
    renderLines(description, slide.description, slide.title.length);
    selectors.forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.coverSlideIndex) === index));
    });
    syncPalette();
  }
  function scheduleSlide() {
    clearTimeout(nextTimer);
    nextTimer = 0;
    if (coverEntering || userPaused || reduced.matches || document.hidden || !focused) return;
    nextTimer = setTimeout(() => selectSlide((currentSlide + 1) % slides.length), 7000);
  }
  function selectSlide(index) {
    if (!Number.isInteger(index) || index < 0 || index >= slides.length) return;
    stopCarouselTimers();
    if (index === currentSlide) { scheduleSlide(); return; }
    if (reduced.matches || document.hidden || !focused) {
      renderSlide(index);
      scheduleSlide();
      return;
    }
    message.classList.add("is-changing");
    changeTimer = setTimeout(() => {
      changeTimer = 0;
      renderSlide(index);
      message.classList.remove("is-changing");
      scheduleSlide();
    }, 240);
  }
  selectors.forEach((button) => {
    button.addEventListener("click", () => selectSlide(Number(button.dataset.coverSlideIndex)));
  });
  carouselToggle.addEventListener("click", () => {
    userPaused = !userPaused;
    stopCarouselTimers();
    updateCarouselControl();
    scheduleSlide();
  });
  addEventListener("blur", () => {
    focused = false;
    stopCarouselTimers();
  });
  addEventListener("focus", () => {
    focused = true;
    scheduleSlide();
  });
  document.addEventListener("visibilitychange", () => {
    stopCarouselTimers();
    if (!document.hidden) scheduleSlide();
  });
  addEventListener("pagehide", () => {
    focused = false;
    stopCarouselTimers();
  });
  addEventListener("pageshow", () => {
    focused = !document.hidden;
    scheduleSlide();
  });
  reduced.addEventListener("change", () => {
    stopCarouselTimers();
    updateCarouselControl();
    scheduleSlide();
  });
  renderSlide(0);
  updateCarouselControl();
  carouselControls.hidden = false;
  scheduleSlide();
})();
