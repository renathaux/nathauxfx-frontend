(function () {
  if (window.innerWidth < 701) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1") return;

  const STORAGE_KEY = "nathauxfx_dashboard_layout_history_entry_v1";
  const dirs = ["nw","n","ne","e","se","s","sw","w"];
  const configs = [
    {
      key: "recentSignalHistory",
      label: "RECENT SIGNAL HISTORY",
      selector: ".history-section",
      minW: 320,
      minH: 100,
      initial: { x: -684, y: 34, width: 2108, height: 260 }
    },
    {
      key: "entryStrategyChecks",
      label: "ENTRY STRATEGY CHECKS",
      selector: ".entry-strategy-debug",
      minW: 180,
      minH: 100,
      initial: { x: 0, y: -1, width: 265, height: 179 }
    }
  ];

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}

  const states = new Map();

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

  const style = document.createElement("style");
  style.id = "historyEntryHoverEditorStyle";
  style.textContent = `
    .history-entry-hover-edit { position:relative!important; overflow:visible!important; }
    .history-entry-hover-edit::after { content:""; position:absolute; inset:-4px; border:2px dashed #55a6ff; border-radius:10px; opacity:0; pointer-events:none; transition:opacity .12s ease; z-index:2147483000; }
    .history-entry-hover-edit:hover::after,
    .history-entry-hover-edit.history-entry-edit-active::after { opacity:1; }
    .history-entry-hover-label,
    .history-entry-hover-handle { opacity:0!important; pointer-events:none!important; transition:opacity .12s ease!important; }
    .history-entry-hover-edit:hover > .history-entry-hover-label,
    .history-entry-hover-edit:hover > .history-entry-hover-handle,
    .history-entry-hover-edit.history-entry-edit-active > .history-entry-hover-label,
    .history-entry-hover-edit.history-entry-edit-active > .history-entry-hover-handle { opacity:1!important; pointer-events:auto!important; }
    .history-entry-hover-label { position:absolute!important; left:10px!important; top:10px!important; z-index:2147483645!important; padding:4px 9px!important; border:1px solid #68b4ff!important; border-radius:6px!important; background:#061425!important; color:#dcebff!important; font:700 11px/1.2 Arial,sans-serif!important; cursor:move!important; user-select:none!important; touch-action:none!important; }
    .history-entry-hover-handle { position:absolute!important; z-index:2147483646!important; width:18px!important; height:18px!important; border-radius:5px!important; border:2px solid #fff!important; background:#3b82f6!important; box-sizing:border-box!important; touch-action:none!important; }
    .history-entry-hover-handle[data-dir="nw"]{left:-9px!important;top:-9px!important;cursor:nwse-resize!important}
    .history-entry-hover-handle[data-dir="n"]{left:50%!important;top:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .history-entry-hover-handle[data-dir="ne"]{right:-9px!important;top:-9px!important;cursor:nesw-resize!important}
    .history-entry-hover-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .history-entry-hover-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}
    .history-entry-hover-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .history-entry-hover-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}
    .history-entry-hover-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #historyEntryToolbar { position:fixed!important; right:22px!important; bottom:22px!important; z-index:2147483647!important; display:flex!important; gap:10px!important; padding:10px!important; border:1px solid #2d65a4!important; border-radius:12px!important; background:#061425!important; box-shadow:0 8px 28px rgba(0,0,0,.55)!important; }
    #historyEntryToolbar button { padding:10px 16px!important; border-radius:8px!important; border:1px solid #3979bf!important; background:#0b2440!important; color:#fff!important; font-weight:800!important; cursor:pointer!important; }
  `;
  document.head.appendChild(style);

  function init(config) {
    const el = document.querySelector(config.selector);
    if (!el || states.has(el)) return;
    const restored = saved?.items?.[config.key];
    const state = {
      key: config.key,
      minW: config.minW,
      minH: config.minH,
      x: Number.isFinite(Number(restored?.x)) ? Number(restored.x) : config.initial.x,
      y: Number.isFinite(Number(restored?.y)) ? Number(restored.y) : config.initial.y,
      width: Number.isFinite(Number(restored?.width)) ? Number(restored.width) : config.initial.width,
      height: Number.isFinite(Number(restored?.height)) ? Number(restored.height) : config.initial.height
    };
    states.set(el, state);
    el.classList.add("history-entry-hover-edit");
    applyBox(el, state);

    const label = document.createElement("span");
    label.className = "history-entry-hover-label";
    label.textContent = config.label;
    el.appendChild(label);

    dirs.forEach(dir => {
      const h = document.createElement("span");
      h.className = "history-entry-hover-handle";
      h.dataset.dir = dir;
      el.appendChild(h);
    });
  }

  configs.forEach(init);

  function beginSession(el, onMove) {
    el.classList.add("history-entry-edit-active");
    const move = event => {
      event.preventDefault();
      onMove(event);
    };
    const end = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
      el.classList.remove("history-entry-edit-active");
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
    beginSession(el, moveEvent => {
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
    beginSession(el, moveEvent => {
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
    const el = event.target.closest?.(".history-entry-hover-edit");
    if (!el || !states.has(el)) return;
    const state = states.get(el);
    const handle = event.target.closest?.(".history-entry-hover-handle");
    if (handle) return startResize(event, el, state, handle.dataset.dir || "se");
    if (event.target.closest?.(".history-entry-hover-label")) return startMove(event, el, state);
    if (event.target.closest?.("button,input,select,textarea,a")) return;
    return startMove(event, el, state);
  }, true);

  const toolbar = document.createElement("div");
  toolbar.id = "historyEntryToolbar";
  toolbar.innerHTML = '<button id="historyEntrySave" type="button">SAVE LAYOUT</button><button id="historyEntryReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);

  document.getElementById("historyEntrySave")?.addEventListener("click", async () => {
    const items = {};
    configs.forEach(config => {
      const el = document.querySelector(config.selector);
      const state = el ? states.get(el) : null;
      if (!state) return;
      items[config.key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(state.width),
        height: Math.round(state.height)
      };
    });
    const payload = {
      version: 9,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const text = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(text); } catch (_error) { window.prompt("Copy layout:", text); }
  });

  document.getElementById("historyEntryReset")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
})();