(function () {
  if (window.innerWidth < 701) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1") return;

  const STORAGE_KEY = "nathauxfx_dashboard_layout_stage4";
  const dirs = ["nw","n","ne","e","se","s","sw","w"];
  const states = new Map();

  const locked = [
    { selector: "#fundamental-insight-card", x: 0, y: 0, width: 706, height: 423 },
    { selector: ".main-metrics", x: 0, y: 0, width: 358, height: 66 },
    { selector: ".main-signal-box", x: 0, y: 0, width: 358, height: 64 },
    { selector: ".main-live", x: 0, y: 0, width: 358, height: 14 },
    { selector: "#main-candle-debug", x: 0, y: 0, width: 358, height: 13 },
    { selector: ".history-section", x: -684, y: 34, width: 2108, height: 260 },
    { selector: ".entry-strategy-debug", x: 0, y: -1, width: 265, height: 179 },
    { selector: "#eurusd-card", x: 0, y: 0, width: 264, height: 296 },
    { selector: "#gold-card", x: 0, y: 6, width: 264, height: 288 }
  ];

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

  function applyLocked() {
    locked.forEach(cfg => {
      const el = document.querySelector(cfg.selector);
      if (el) applyBox(el, cfg);
    });
  }

  function resolveEntryOuter() {
    const inner = document.querySelector(".entry-strategy-debug");
    if (!inner) return null;
    let parent = inner.parentElement;
    const innerRect = inner.getBoundingClientRect();
    for (let i = 0; parent && i < 5; i++, parent = parent.parentElement) {
      const r = parent.getBoundingClientRect();
      if (
        r.width >= innerRect.width + 8 &&
        r.width <= innerRect.width + 140 &&
        r.height >= innerRect.height + 16 &&
        r.height <= innerRect.height + 180
      ) return parent;
    }
    return inner.parentElement;
  }

  const targets = [
    {
      key: "entryChecksOuter",
      label: "ENTRY CHECKS OUTER",
      resolve: resolveEntryOuter,
      minW: 220,
      minH: 140
    },
    {
      key: "mainTradeCard",
      label: "MAIN TRADE OUTER",
      resolve: () => document.querySelector(".main-trade-card"),
      minW: 300,
      minH: 260
    },
    {
      key: "mainSmcPlan",
      label: "SMC PLAN",
      resolve: () => document.querySelector(".main-smc-panel"),
      minW: 220,
      minH: 160,
      initial: { x: -9, y: 0, width: 367, height: 487 }
    }
  ];

  const style = document.createElement("style");
  style.id = "dashboardStage4Styles";
  style.textContent = `
    .stage4-edit-target { position:relative!important; overflow:visible!important; outline:2px dashed #55a6ff!important; outline-offset:3px!important; }
    .stage4-edit-label { position:absolute!important; left:8px!important; top:8px!important; z-index:2147483645!important; padding:3px 8px!important; border:1px solid #68b4ff!important; border-radius:6px!important; background:#061425!important; color:#dcebff!important; font:700 11px/1.2 Arial,sans-serif!important; cursor:move!important; user-select:none!important; pointer-events:auto!important; touch-action:none!important; }
    .stage4-edit-handle { position:absolute!important; z-index:2147483646!important; width:18px!important; height:18px!important; border-radius:5px!important; border:2px solid white!important; background:#3b82f6!important; box-sizing:border-box!important; pointer-events:auto!important; touch-action:none!important; }
    .stage4-edit-handle[data-dir="nw"]{left:3px!important;top:3px!important;cursor:nwse-resize!important}
    .stage4-edit-handle[data-dir="n"]{left:50%!important;top:3px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .stage4-edit-handle[data-dir="ne"]{right:3px!important;top:3px!important;cursor:nesw-resize!important}
    .stage4-edit-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .stage4-edit-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}
    .stage4-edit-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .stage4-edit-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}
    .stage4-edit-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #dashboardStage4Toolbar { position:fixed!important; right:22px!important; bottom:22px!important; z-index:2147483647!important; display:flex!important; gap:10px!important; padding:10px!important; border:1px solid #2d65a4!important; border-radius:12px!important; background:#061425!important; box-shadow:0 8px 28px rgba(0,0,0,.55)!important; }
    #dashboardStage4Toolbar button { padding:10px 16px!important; border-radius:8px!important; border:1px solid #3979bf!important; background:#0b2440!important; color:#fff!important; font-weight:800!important; cursor:pointer!important; }
    #dashboardStage4Toast { position:fixed!important; right:22px!important; bottom:82px!important; z-index:2147483647!important; padding:8px 12px!important; border-radius:8px!important; background:#0b2440!important; color:#fff!important; opacity:0!important; transform:translateY(8px)!important; transition:.18s!important; pointer-events:none!important; }
    #dashboardStage4Toast.show { opacity:1!important; transform:translateY(0)!important; }
  `;
  document.head.appendChild(style);

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}

  function ensureChrome(el, cfg) {
    el.classList.add("stage4-edit-target");
    if (!el.querySelector(":scope > .stage4-edit-label")) {
      const label = document.createElement("span");
      label.className = "stage4-edit-label";
      label.textContent = cfg.label;
      el.appendChild(label);
    }
    dirs.forEach(dir => {
      if (el.querySelector(`:scope > .stage4-edit-handle[data-dir="${dir}"]`)) return;
      const handle = document.createElement("span");
      handle.className = "stage4-edit-handle";
      handle.dataset.dir = dir;
      el.appendChild(handle);
    });
  }

  function readTransform(el) {
    const matrix = getComputedStyle(el).transform;
    if (!matrix || matrix === "none") return { x: 0, y: 0 };
    try {
      const m = new DOMMatrixReadOnly(matrix);
      return { x: m.m41 || 0, y: m.m42 || 0 };
    } catch (_error) {
      return { x: 0, y: 0 };
    }
  }

  function initTarget(cfg) {
    const el = cfg.resolve();
    if (!el || states.has(el)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return false;

    const restored = saved?.items?.[cfg.key];
    const current = readTransform(el);
    const base = cfg.initial || {
      x: current.x,
      y: current.y,
      width: rect.width,
      height: rect.height
    };
    const state = {
      key: cfg.key,
      minW: cfg.minW,
      minH: cfg.minH,
      x: Number.isFinite(Number(restored?.x)) ? Number(restored.x) : base.x,
      y: Number.isFinite(Number(restored?.y)) ? Number(restored.y) : base.y,
      width: Number.isFinite(Number(restored?.width)) ? Number(restored.width) : base.width,
      height: Number.isFinite(Number(restored?.height)) ? Number(restored.height) : base.height
    };
    states.set(el, state);
    ensureChrome(el, cfg);
    applyBox(el, state);
    setImportant(el, "cursor", "move");
    return true;
  }

  function ensureTargets() {
    applyLocked();
    targets.forEach(initTarget);
  }

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
      let x = start.x, y = start.y, width = start.width, height = start.height;
      if (dir.includes("e")) width = Math.max(state.minW, start.width + dx);
      if (dir.includes("s")) height = Math.max(state.minH, start.height + dy);
      if (dir.includes("w")) {
        const next = Math.max(state.minW, start.width - dx);
        x = start.x + (start.width - next);
        width = next;
      }
      if (dir.includes("n")) {
        const next = Math.max(state.minH, start.height - dy);
        y = start.y + (start.height - next);
        height = next;
      }
      Object.assign(state, { x, y, width, height });
      applyBox(el, state);
    });
  }

  document.addEventListener("pointerdown", event => {
    ensureTargets();
    const target = event.target;
    const handle = target.closest?.(".stage4-edit-handle");
    const label = target.closest?.(".stage4-edit-label");
    const editTarget = (handle || label)?.closest?.(".stage4-edit-target");
    if (editTarget && states.has(editTarget)) {
      const state = states.get(editTarget);
      if (handle) return startResize(event, editTarget, state, handle.dataset.dir || "se");
      return startMove(event, editTarget, state);
    }

    for (const [el, state] of states.entries()) {
      if (!el.contains(target)) continue;
      if (target.closest?.("button,input,select,textarea,a,summary,.stage4-edit-handle,.stage4-edit-label")) return;
      return startMove(event, el, state);
    }
  }, true);

  function ensureToolbar() {
    if (document.getElementById("dashboardStage4Toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.id = "dashboardStage4Toolbar";
    toolbar.innerHTML = '<button id="dashboardStage4Save" type="button">SAVE LAYOUT</button><button id="dashboardStage4Reset" type="button">RESET</button>';
    document.body.appendChild(toolbar);
    const toast = document.createElement("div");
    toast.id = "dashboardStage4Toast";
    document.body.appendChild(toast);
  }

  document.addEventListener("click", async event => {
    if (event.target.closest?.("#dashboardStage4Reset")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
      return;
    }
    if (!event.target.closest?.("#dashboardStage4Save")) return;
    event.preventDefault();
    ensureTargets();
    const items = {};
    targets.forEach(cfg => {
      const el = cfg.resolve();
      const state = el ? states.get(el) : null;
      if (!state) return;
      items[cfg.key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(state.width),
        height: Math.round(state.height)
      };
    });
    const payload = {
      version: 6,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items
    };
    const text = JSON.stringify(payload, null, 2);
    localStorage.setItem(STORAGE_KEY, text);
    const toast = document.getElementById("dashboardStage4Toast");
    try {
      await navigator.clipboard.writeText(text);
      if (toast) {
        toast.textContent = "Saved — paste the JSON in ChatGPT.";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2600);
      }
    } catch (_error) {
      window.prompt("Copy this layout and paste it in ChatGPT:", text);
    }
  }, true);

  ensureToolbar();
  ensureTargets();
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    ensureToolbar();
    ensureTargets();
    if (states.size >= targets.length || tries > 120) clearInterval(timer);
  }, 150);
  window.addEventListener("load", () => {
    ensureToolbar();
    ensureTargets();
  }, { once: true });
})();
