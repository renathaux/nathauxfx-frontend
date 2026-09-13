(function () {
  if (window.innerWidth < 701) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1") return;

  const STORAGE_KEY = "nathauxfx_dashboard_layout_main_trade_hover_v1";
  const el = document.querySelector(".main-trade-card");
  if (!el) return;

  const dirs = ["nw","n","ne","e","se","s","sw","w"];
  const minW = 320;
  const minH = 260;

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}

  function readTransform(node) {
    const matrix = getComputedStyle(node).transform;
    if (!matrix || matrix === "none") return { x: 0, y: 0 };
    try {
      const m = new DOMMatrixReadOnly(matrix);
      return { x: m.m41 || 0, y: m.m42 || 0 };
    } catch (_error) {
      return { x: 0, y: 0 };
    }
  }

  const rect = el.getBoundingClientRect();
  const current = readTransform(el);
  const state = {
    x: Number.isFinite(Number(saved?.x)) ? Number(saved.x) : current.x,
    y: Number.isFinite(Number(saved?.y)) ? Number(saved.y) : current.y,
    width: Number.isFinite(Number(saved?.width)) ? Number(saved.width) : rect.width,
    height: Number.isFinite(Number(saved?.height)) ? Number(saved.height) : rect.height
  };

  function setImportant(node, prop, value) { node.style.setProperty(prop, value, "important"); }
  function applyBox() {
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
  style.id = "mainTradeHoverEditorStyle";
  style.textContent = `
    .main-trade-card.main-trade-hover-edit { position:relative!important; overflow:visible!important; }
    .main-trade-card.main-trade-hover-edit::after { content:""; position:absolute; inset:-4px; border:2px dashed #55a6ff; border-radius:12px; opacity:0; pointer-events:none; transition:opacity .12s ease; z-index:2147483000; }
    .main-trade-card.main-trade-hover-edit:hover::after,
    .main-trade-card.main-trade-hover-edit.main-trade-edit-active::after { opacity:1; }
    .main-trade-hover-label,.main-trade-hover-handle { opacity:0!important; pointer-events:none!important; transition:opacity .12s ease!important; }
    .main-trade-card.main-trade-hover-edit:hover > .main-trade-hover-label,
    .main-trade-card.main-trade-hover-edit:hover > .main-trade-hover-handle,
    .main-trade-card.main-trade-hover-edit.main-trade-edit-active > .main-trade-hover-label,
    .main-trade-card.main-trade-hover-edit.main-trade-edit-active > .main-trade-hover-handle { opacity:1!important; pointer-events:auto!important; }
    .main-trade-hover-label { position:absolute!important; left:10px!important; top:10px!important; z-index:2147483645!important; padding:4px 9px!important; border:1px solid #68b4ff!important; border-radius:6px!important; background:#061425!important; color:#dcebff!important; font:700 11px/1.2 Arial,sans-serif!important; cursor:move!important; user-select:none!important; touch-action:none!important; }
    .main-trade-hover-handle { position:absolute!important; z-index:2147483646!important; width:18px!important; height:18px!important; border-radius:5px!important; border:2px solid #fff!important; background:#3b82f6!important; box-sizing:border-box!important; touch-action:none!important; }
    .main-trade-hover-handle[data-dir="nw"]{left:-9px!important;top:-9px!important;cursor:nwse-resize!important}
    .main-trade-hover-handle[data-dir="n"]{left:50%!important;top:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .main-trade-hover-handle[data-dir="ne"]{right:-9px!important;top:-9px!important;cursor:nesw-resize!important}
    .main-trade-hover-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .main-trade-hover-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}
    .main-trade-hover-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .main-trade-hover-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}
    .main-trade-hover-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #mainTradeHoverToolbar { position:fixed!important; right:22px!important; bottom:22px!important; z-index:2147483647!important; display:flex!important; gap:10px!important; padding:10px!important; border:1px solid #2d65a4!important; border-radius:12px!important; background:#061425!important; box-shadow:0 8px 28px rgba(0,0,0,.55)!important; }
    #mainTradeHoverToolbar button { padding:10px 16px!important; border-radius:8px!important; border:1px solid #3979bf!important; background:#0b2440!important; color:#fff!important; font-weight:800!important; cursor:pointer!important; }
  `;
  document.head.appendChild(style);

  el.classList.add("main-trade-hover-edit");
  const label = document.createElement("span");
  label.className = "main-trade-hover-label";
  label.textContent = "MAIN TRADE / SMC CARD";
  el.appendChild(label);
  dirs.forEach(dir => {
    const h = document.createElement("span");
    h.className = "main-trade-hover-handle";
    h.dataset.dir = dir;
    el.appendChild(h);
  });

  function beginSession(onMove) {
    el.classList.add("main-trade-edit-active");
    const move = event => { event.preventDefault(); onMove(event); };
    const end = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
      el.classList.remove("main-trade-edit-active");
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
  }

  function startMove(event) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const startX = event.clientX, startY = event.clientY, start = { ...state };
    beginSession(moveEvent => {
      state.x = start.x + (moveEvent.clientX - startX);
      state.y = start.y + (moveEvent.clientY - startY);
      applyBox();
    });
  }

  function startResize(event, dir) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const startX = event.clientX, startY = event.clientY, start = { ...state };
    beginSession(moveEvent => {
      const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
      let x = start.x, y = start.y, width = start.width, height = start.height;
      if (dir.includes("e")) width = Math.max(minW, start.width + dx);
      if (dir.includes("s")) height = Math.max(minH, start.height + dy);
      if (dir.includes("w")) { const next = Math.max(minW, start.width - dx); x = start.x + (start.width - next); width = next; }
      if (dir.includes("n")) { const next = Math.max(minH, start.height - dy); y = start.y + (start.height - next); height = next; }
      Object.assign(state, { x, y, width, height });
      applyBox();
    });
  }

  el.addEventListener("pointerdown", event => {
    const handle = event.target.closest?.(".main-trade-hover-handle");
    if (handle) return startResize(event, handle.dataset.dir || "se");
    if (event.target.closest?.(".main-trade-hover-label")) return startMove(event);
    if (event.target.closest?.("button,input,select,textarea,a,summary")) return;
    return startMove(event);
  }, true);

  const toolbar = document.createElement("div");
  toolbar.id = "mainTradeHoverToolbar";
  toolbar.innerHTML = '<button id="mainTradeHoverSave" type="button">SAVE LAYOUT</button><button id="mainTradeHoverReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);

  document.getElementById("mainTradeHoverSave")?.addEventListener("click", async () => {
    const payload = {
      version: 8,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items: { mainTradeCard: { x: Math.round(state.x), y: Math.round(state.y), width: Math.round(state.width), height: Math.round(state.height) } }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.items.mainTradeCard));
    const text = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(text); } catch (_error) { window.prompt("Copy layout:", text); }
  });

  document.getElementById("mainTradeHoverReset")?.addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); });
  applyBox();
})();