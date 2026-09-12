(function () {
  window.FlowSignalBrokerAccounts = {
    feature: "brokerAccounts",
    status: "loaded",
  };

  const params = new URLSearchParams(window.location.search);
  const editMode = params.get("layoutEdit") === "1";
  const STORAGE_KEY = "nathauxfx_dashboard_layout_editor_v1";

  function injectBaseCleanup() {
    if (document.getElementById("dashboardLayoutCleanupStyle")) return;
    const style = document.createElement("style");
    style.id = "dashboardLayoutCleanupStyle";
    style.textContent = `
      .bias-only-note { display:none !important; }
    `;
    document.head.appendChild(style);
  }

  function removeBottomLeftDetails() {
    const all = Array.from(document.body.querySelectorAll("*"));
    for (const el of all) {
      if (el.id === "smartExplainDetails" || el.closest(".entry-strategy-debug")) continue;
      const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
      if (text !== "Details" && text !== "Details ×" && text !== "Details×") continue;
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if ((cs.position === "fixed" || cs.position === "absolute") && rect.left < 120 && rect.bottom > window.innerHeight - 90) {
        el.remove();
      }
    }
  }

  injectBaseCleanup();
  window.addEventListener("load", removeBottomLeftDetails);
  const cleanupObserver = new MutationObserver(removeBottomLeftDetails);
  cleanupObserver.observe(document.documentElement, { childList: true, subtree: true });

  if (!editMode || window.innerWidth < 701) return;

  const editorCss = document.createElement("style");
  editorCss.id = "dashboardLayoutEditorStyle";
  editorCss.textContent = `
    body.dashboard-layout-editor-on,
    body.dashboard-layout-editor-on #mainApp,
    body.dashboard-layout-editor-on .dashboard-grid,
    body.dashboard-layout-editor-on .signals-panel,
    body.dashboard-layout-editor-on .chart-panel,
    body.dashboard-layout-editor-on .main-trade-panel {
      overflow: visible !important;
    }
    .dashboard-layout-editor-target {
      position: relative !important;
      z-index: 2147482000 !important;
      box-sizing: border-box !important;
      max-width: none !important;
      min-width: 180px !important;
      min-height: 90px !important;
      overflow: visible !important;
      outline: 2px dashed rgba(96,165,250,.95) !important;
      outline-offset: 4px !important;
      touch-action: none !important;
    }
    .dashboard-layout-editor-label {
      position: absolute !important;
      left: 8px !important;
      top: -34px !important;
      z-index: 2147483646 !important;
      padding: 6px 10px !important;
      border-radius: 8px !important;
      background: #0a1a2d !important;
      border: 1px solid #3b82f6 !important;
      color: #fff !important;
      font: 800 11px/1 Arial,sans-serif !important;
      cursor: move !important;
      user-select: none !important;
      white-space: nowrap !important;
      box-shadow: 0 4px 18px rgba(0,0,0,.45) !important;
    }
    .dashboard-layout-editor-handle {
      position: absolute !important;
      z-index: 2147483647 !important;
      width: 18px !important;
      height: 18px !important;
      border-radius: 5px !important;
      border: 2px solid #fff !important;
      background: #3b82f6 !important;
      box-shadow: 0 2px 10px rgba(0,0,0,.55) !important;
      touch-action: none !important;
    }
    .dashboard-layout-editor-handle[data-dir="nw"]{left:-11px!important;top:-11px!important;cursor:nwse-resize!important}
    .dashboard-layout-editor-handle[data-dir="n"]{left:50%!important;top:-11px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .dashboard-layout-editor-handle[data-dir="ne"]{right:-11px!important;top:-11px!important;cursor:nesw-resize!important}
    .dashboard-layout-editor-handle[data-dir="e"]{right:-11px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .dashboard-layout-editor-handle[data-dir="se"]{right:-11px!important;bottom:-11px!important;cursor:nwse-resize!important}
    .dashboard-layout-editor-handle[data-dir="s"]{left:50%!important;bottom:-11px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .dashboard-layout-editor-handle[data-dir="sw"]{left:-11px!important;bottom:-11px!important;cursor:nesw-resize!important}
    .dashboard-layout-editor-handle[data-dir="w"]{left:-11px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #dashboardLayoutEditorToolbar {
      position: fixed !important;
      right: 18px !important;
      bottom: 18px !important;
      z-index: 2147483647 !important;
      display: flex !important;
      gap: 8px !important;
      padding: 9px !important;
      border-radius: 13px !important;
      border: 1px solid #315d96 !important;
      background: rgba(4,12,24,.97) !important;
      box-shadow: 0 18px 55px rgba(0,0,0,.6) !important;
    }
    #dashboardLayoutEditorToolbar button {
      height: 40px !important;
      padding: 0 14px !important;
      border-radius: 9px !important;
      border: 1px solid #315d96 !important;
      background: #10213a !important;
      color: #fff !important;
      font: 800 12px/1 Arial,sans-serif !important;
      cursor: pointer !important;
    }
    #dashboardLayoutSave { background:#1769ff !important; }
    #dashboardLayoutToast {
      position: fixed !important;
      right: 18px !important;
      bottom: 72px !important;
      z-index: 2147483647 !important;
      padding: 8px 12px !important;
      border-radius: 999px !important;
      background: #0a1728 !important;
      border: 1px solid #315d96 !important;
      color: #dbeafe !important;
      font: 700 12px/1.2 Arial,sans-serif !important;
      opacity: 0;
      transition: opacity .18s ease;
      pointer-events: none !important;
    }
    #dashboardLayoutToast.show { opacity:1; }
  `;
  document.head.appendChild(editorCss);
  document.body.classList.add("dashboard-layout-editor-on");

  const dirs = ["nw","n","ne","e","se","s","sw","w"];
  const states = new Map();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function parseTranslate(el) {
    const value = getComputedStyle(el).translate;
    if (!value || value === "none") return { x: 0, y: 0 };
    const parts = value.split(/\s+/);
    return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1] || "0") || 0 };
  }

  function applyState(el, state) {
    setImportant(el, "width", `${Math.round(state.width)}px`);
    setImportant(el, "height", `${Math.round(state.height)}px`);
    setImportant(el, "max-width", "none");
    setImportant(el, "min-width", "0");
    setImportant(el, "min-height", "0");
    setImportant(el, "translate", `${Math.round(state.x)}px ${Math.round(state.y)}px`);
  }

  function dragSession(onMove) {
    const move = e => { e.preventDefault(); onMove(e); };
    const end = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
  }

  function attachTarget(key, labelText, el) {
    if (!el || el.dataset.dashboardLayoutEditorAttached === "1") return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    el.dataset.dashboardLayoutEditorAttached = "1";
    el.classList.add("dashboard-layout-editor-target");

    const base = parseTranslate(el);
    const restored = saved?.items?.[key];
    const state = {
      x: num(restored?.x, base.x),
      y: num(restored?.y, base.y),
      width: num(restored?.width, rect.width),
      height: num(restored?.height, rect.height)
    };
    states.set(key, state);
    applyState(el, state);

    const label = document.createElement("span");
    label.className = "dashboard-layout-editor-label";
    label.textContent = labelText;
    el.appendChild(label);

    label.addEventListener("pointerdown", event => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const sx = state.x;
      const sy = state.y;
      dragSession(moveEvent => {
        state.x = sx + moveEvent.clientX - startX;
        state.y = sy + moveEvent.clientY - startY;
        applyState(el, state);
      });
    });

    dirs.forEach(dir => {
      const h = document.createElement("span");
      h.className = "dashboard-layout-editor-handle";
      h.dataset.dir = dir;
      el.appendChild(h);
      h.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const start = { ...state };
        const minW = 180;
        const minH = 80;
        dragSession(moveEvent => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          let x = start.x, y = start.y, width = start.width, height = start.height;
          if (dir.includes("e")) width = Math.max(minW, start.width + dx);
          if (dir.includes("s")) height = Math.max(minH, start.height + dy);
          if (dir.includes("w")) {
            const next = Math.max(minW, start.width - dx);
            x = start.x + (start.width - next);
            width = next;
          }
          if (dir.includes("n")) {
            const next = Math.max(minH, start.height - dy);
            y = start.y + (start.height - next);
            height = next;
          }
          Object.assign(state, { x, y, width, height });
          applyState(el, state);
        });
      });
    });
  }

  function tryAttach() {
    attachTarget("recentSignalHistory", "RECENT SIGNAL HISTORY", document.querySelector(".history-section"));
    attachTarget("entryStrategyChecks", "ENTRY STRATEGY CHECKS", document.querySelector(".entry-strategy-debug"));
    attachTarget("fundamentalInsight", "FUNDAMENTAL INSIGHT", document.querySelector("#fundamental-insight-card"));
    return states.size === 3;
  }

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (tryAttach() || tries > 80) window.clearInterval(timer);
  }, 250);
  window.addEventListener("load", tryAttach);

  const toolbar = document.createElement("div");
  toolbar.id = "dashboardLayoutEditorToolbar";
  toolbar.innerHTML = '<button id="dashboardLayoutSave" type="button">SAVE LAYOUT</button><button id="dashboardLayoutReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);

  const toast = document.createElement("div");
  toast.id = "dashboardLayoutToast";
  document.body.appendChild(toast);
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  document.getElementById("dashboardLayoutSave").addEventListener("click", async () => {
    const items = {};
    states.forEach((state, key) => {
      items[key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(state.width),
        height: Math.round(state.height)
      };
    });
    const payload = {
      version: 1,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items
    };
    const text = JSON.stringify(payload, null, 2);
    localStorage.setItem(STORAGE_KEY, text);
    try {
      await navigator.clipboard.writeText(text);
      showToast("Saved and copied — paste it in ChatGPT.");
    } catch (_error) {
      window.prompt("Copy this layout and paste it in ChatGPT:", text);
    }
  });

  document.getElementById("dashboardLayoutReset").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
})();
