(function () {
  if (window.innerWidth < 701) return;

  const params = new URLSearchParams(window.location.search);
  const editMode = params.get("layoutEdit") === "1";
  const STORAGE_KEY = "nathauxfx_dashboard_layout_editor_v1";

  const locked = [
    { selector: "#fundamental-insight-card", x: 0, y: 0, width: 706, height: 423 },
    { selector: ".main-smc-panel", x: -9, y: 0, width: 367, height: 487 },
    { selector: ".main-metrics", x: 0, y: 0, width: 358, height: 66 },
    { selector: ".main-signal-box", x: 0, y: 0, width: 358, height: 64 },
    { selector: ".main-live", x: 0, y: 0, width: 358, height: 14 },
    { selector: "#main-candle-debug", x: 0, y: 0, width: 358, height: 13 },
  ];

  const editableConfigs = [
    { key: "recentSignalHistory", label: "RECENT SIGNAL HISTORY", selector: ".history-section", minW: 260, minH: 100, dragWhole: false, externalTop: false },
    { key: "entryStrategyChecks", label: "ENTRY STRATEGY CHECKS", selector: ".entry-strategy-debug", minW: 180, minH: 90, dragWhole: true, externalTop: false },
    { key: "eurusdCard", label: "EURUSD CARD", selector: "#eurusd-card", minW: 180, minH: 180, dragWhole: true, externalTop: true },
    { key: "goldCard", label: "GOLD CARD", selector: "#gold-card", minW: 180, minH: 180, dragWhole: true, externalTop: true },
  ];

  const dirs = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const states = new Map();
  const overlays = new Map();

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function applyBox(el, state) {
    setImportant(el, "box-sizing", "border-box");
    setImportant(el, "width", `${Math.round(state.width)}px`);
    setImportant(el, "height", `${Math.round(state.height)}px`);
    setImportant(el, "max-width", "none");
    setImportant(el, "min-width", "0");
    setImportant(el, "min-height", "0");
    setImportant(el, "translate", "0px 0px");
    setImportant(el, "transform", `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`);
  }

  function removeEditorChrome(el) {
    if (!el) return;
    el.querySelectorAll(":scope > .dashboard-layout-editor-label, :scope > .dashboard-layout-editor-handle").forEach(node => node.remove());
    el.classList.remove("dashboard-layout-editor-target");
    el.dataset.dashboardLayoutEditorAttached = "1";
    el.dataset.dashboardLayoutExtraAttached = "1";
  }

  function applyLockedLayout() {
    locked.forEach(config => {
      const el = document.querySelector(config.selector);
      if (!el) return;
      applyBox(el, config);
      if (editMode) removeEditorChrome(el);
    });
  }

  applyLockedLayout();
  window.addEventListener("load", applyLockedLayout);
  const lockedTimer = window.setInterval(applyLockedLayout, 250);
  window.setTimeout(() => window.clearInterval(lockedTimer), 12000);

  if (!editMode) return;

  const style = document.createElement("style");
  style.id = "dashboardStage3SelfContainedStyles";
  style.textContent = `
    .dashboard-layout-editor-target { position: relative !important; outline: 2px dashed #55a6ff !important; outline-offset: 3px !important; overflow: visible !important; }
    .dashboard-layout-editor-label { position:absolute!important; left:8px!important; top:-23px!important; z-index:2147483000!important; padding:3px 8px!important; border:1px solid #68b4ff!important; border-radius:6px!important; background:#061425!important; color:#dcebff!important; font:700 11px/1.2 Arial,sans-serif!important; cursor:move!important; user-select:none!important; pointer-events:auto!important; touch-action:none!important; }
    .dashboard-layout-editor-handle { position:absolute!important; z-index:2147483000!important; width:16px!important; height:16px!important; border-radius:4px!important; border:2px solid white!important; background:#3b82f6!important; box-sizing:border-box!important; pointer-events:auto!important; touch-action:none!important; }
    .dashboard-layout-editor-handle[data-dir="nw"]{left:-9px!important;top:-9px!important;cursor:nwse-resize!important}.dashboard-layout-editor-handle[data-dir="n"]{left:50%!important;top:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}.dashboard-layout-editor-handle[data-dir="ne"]{right:-9px!important;top:-9px!important;cursor:nesw-resize!important}.dashboard-layout-editor-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}.dashboard-layout-editor-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}.dashboard-layout-editor-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}.dashboard-layout-editor-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}.dashboard-layout-editor-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .dashboard-card-top-overlay { position:fixed!important; z-index:2147483647!important; pointer-events:none!important; height:34px!important; }
    .dashboard-card-top-overlay .top-bar { position:absolute!important; left:24px!important; right:24px!important; top:8px!important; height:18px!important; border-top:4px solid #00d4ff!important; background:rgba(0,212,255,.10)!important; cursor:ns-resize!important; pointer-events:auto!important; touch-action:none!important; }
    .dashboard-card-top-overlay .top-left,.dashboard-card-top-overlay .top-right { position:absolute!important; top:2px!important; width:24px!important; height:24px!important; border:2px solid white!important; border-radius:5px!important; background:#00a8ff!important; pointer-events:auto!important; touch-action:none!important; }
    .dashboard-card-top-overlay .top-left { left:0!important; cursor:nwse-resize!important; }
    .dashboard-card-top-overlay .top-right { right:0!important; cursor:nesw-resize!important; }
  `;
  document.head.appendChild(style);

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}

  function readTransform(el) {
    const style = getComputedStyle(el);
    const matrix = style.transform;
    if (matrix && matrix !== "none") {
      try {
        const m = new DOMMatrixReadOnly(matrix);
        return { x: m.m41 || 0, y: m.m42 || 0 };
      } catch (_error) {}
    }
    return { x: 0, y: 0 };
  }

  function ensureChrome(el, config) {
    el.classList.add("dashboard-layout-editor-target");

    let label = Array.from(el.children).find(child => child.classList?.contains("dashboard-layout-editor-label"));
    if (!label) {
      label = document.createElement("span");
      label.className = "dashboard-layout-editor-label";
      el.appendChild(label);
    }
    label.textContent = config.label;

    dirs.forEach(dir => {
      if (config.externalTop && (dir === "n" || dir === "nw" || dir === "ne")) return;
      let handle = Array.from(el.children).find(child => child.classList?.contains("dashboard-layout-editor-handle") && child.dataset.dir === dir);
      if (!handle) {
        handle = document.createElement("span");
        handle.className = "dashboard-layout-editor-handle";
        handle.dataset.dir = dir;
        el.appendChild(handle);
      }
    });
  }

  function makeTopOverlay(el, state) {
    if (overlays.has(el)) return;
    const overlay = document.createElement("div");
    overlay.className = "dashboard-card-top-overlay";
    overlay.innerHTML = '<span class="top-left" data-dir="nw"></span><span class="top-bar" data-dir="n"></span><span class="top-right" data-dir="ne"></span>';
    document.body.appendChild(overlay);
    overlays.set(el, overlay);

    overlay.addEventListener("pointerdown", event => {
      const hit = event.target.closest?.("[data-dir]");
      if (!hit) return;
      startResize(event, el, state, hit.dataset.dir);
    }, true);
  }

  function initEditable(config) {
    const el = document.querySelector(config.selector);
    if (!el || states.has(el)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;

    const current = readTransform(el);
    const restored = saved?.items?.[config.key];
    const state = {
      key: config.key,
      selector: config.selector,
      minW: config.minW,
      minH: config.minH,
      dragWhole: config.dragWhole,
      externalTop: config.externalTop,
      x: Number.isFinite(Number(restored?.x)) ? Number(restored.x) : current.x,
      y: Number.isFinite(Number(restored?.y)) ? Number(restored.y) : current.y,
      width: Number.isFinite(Number(restored?.width)) ? Number(restored.width) : rect.width,
      height: Number.isFinite(Number(restored?.height)) ? Number(restored.height) : rect.height,
    };
    states.set(el, state);
    ensureChrome(el, config);
    applyBox(el, state);
    if (config.dragWhole) el.style.setProperty("cursor", "move", "important");
    if (config.externalTop) makeTopOverlay(el, state);
    return true;
  }

  function ensureEditable() {
    editableConfigs.forEach(initEditable);
    applyLockedLayout();
  }

  function syncTopOverlays() {
    overlays.forEach((overlay, el) => {
      if (!document.documentElement.contains(el)) return;
      const rect = el.getBoundingClientRect();
      overlay.style.left = `${Math.round(rect.left)}px`;
      overlay.style.top = `${Math.round(rect.top - 10)}px`;
      overlay.style.width = `${Math.round(rect.width)}px`;
    });
    requestAnimationFrame(syncTopOverlays);
  }
  requestAnimationFrame(syncTopOverlays);

  function beginSession(onMove) {
    const move = event => {
      event.preventDefault();
      onMove(event);
    };
    const end = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
  }

  function startMove(event, el, state) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };
    beginSession(moveEvent => {
      state.x = start.x + (moveEvent.clientX - startX);
      state.y = start.y + (moveEvent.clientY - startY);
      applyBox(el, state);
    });
  }

  function startResize(event, el, state, dir) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };

    beginSession(moveEvent => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let x = start.x;
      let y = start.y;
      let width = start.width;
      let height = start.height;

      if (dir.includes("e")) width = Math.max(state.minW, start.width + dx);
      if (dir.includes("s")) height = Math.max(state.minH, start.height + dy);
      if (dir.includes("w")) {
        const nextWidth = Math.max(state.minW, start.width - dx);
        x = start.x + (start.width - nextWidth);
        width = nextWidth;
      }
      if (dir.includes("n")) {
        const nextHeight = Math.max(state.minH, start.height - dy);
        const actualDy = start.height - nextHeight;
        y = start.y + actualDy;
        height = nextHeight;
      }

      Object.assign(state, { x, y, width, height });
      applyBox(el, state);
    });
  }

  document.addEventListener("pointerdown", event => {
    ensureEditable();
    const target = event.target;
    const handle = target.closest?.(".dashboard-layout-editor-handle");
    const label = target.closest?.(".dashboard-layout-editor-label");
    const editorTarget = (handle || label)?.closest?.(".dashboard-layout-editor-target");

    if (editorTarget && states.has(editorTarget)) {
      const state = states.get(editorTarget);
      if (handle) return startResize(event, editorTarget, state, handle.dataset.dir || "se");
      return startMove(event, editorTarget, state);
    }

    for (const config of editableConfigs) {
      if (!config.dragWhole) continue;
      const el = target.closest?.(config.selector);
      if (!el || !states.has(el)) continue;
      if (target.closest?.("button,input,select,textarea,a,.dashboard-layout-editor-handle,.dashboard-layout-editor-label")) return;
      return startMove(event, el, states.get(el));
    }
  }, true);

  document.addEventListener("click", async event => {
    const button = event.target.closest?.("#dashboardLayoutSave");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    ensureEditable();

    const items = {};
    editableConfigs.forEach(config => {
      const el = document.querySelector(config.selector);
      const state = el ? states.get(el) : null;
      if (!el || !state) return;
      const rect = el.getBoundingClientRect();
      items[config.key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });

    const payload = {
      version: 5,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items,
    };
    const text = JSON.stringify(payload, null, 2);

    let merged = {};
    try { merged = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch (_error) {}
    merged.version = 5;
    merged.viewport = payload.viewport;
    merged.savedAt = payload.savedAt;
    merged.items = { ...(merged.items || {}), ...items };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged, null, 2));

    const toast = document.getElementById("dashboardLayoutToast");
    try {
      await navigator.clipboard.writeText(text);
      if (toast) {
        toast.textContent = "Saved unfinished items — paste them in ChatGPT.";
        toast.classList.add("show");
        window.setTimeout(() => toast.classList.remove("show"), 2800);
      }
    } catch (_error) {
      window.prompt("Copy this layout and paste it in ChatGPT:", text);
    }
  }, true);

  let tries = 0;
  const editTimer = window.setInterval(() => {
    tries += 1;
    ensureEditable();
    if (states.size >= editableConfigs.length || tries > 120) window.clearInterval(editTimer);
  }, 150);
  window.addEventListener("load", ensureEditable);
})();
