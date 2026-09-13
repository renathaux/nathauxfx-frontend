(function () {
  if (window.innerWidth < 701) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1") return;

  const STORAGE_KEY = "nathauxfx_dashboard_layout_entry_outer_v1";
  const dirs = ["nw","n","ne","e","se","s","sw","w"];
  const minW = 220;
  const minH = 180;

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
        r.height <= innerRect.height + 900
      ) return parent;
    }
    return inner.parentElement;
  }

  const el = resolveEntryOuter();
  if (!el) return;

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}
  const state = {
    x: Number.isFinite(Number(saved?.x)) ? Number(saved.x) : 0,
    y: Number.isFinite(Number(saved?.y)) ? Number(saved.y) : 0,
    width: Number.isFinite(Number(saved?.width)) ? Number(saved.width) : 274,
    height: Number.isFinite(Number(saved?.height)) ? Number(saved.height) : 811
  };

  function setImportant(node, prop, value) {
    node.style.setProperty(prop, value, "important");
  }

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
  style.id = "entryOuterHoverEditorStyle";
  style.textContent = `
    .entry-outer-hover-edit { position:relative!important; overflow:visible!important; }
    .entry-outer-hover-edit::after { content:""; position:absolute; inset:-4px; border:2px dashed #55a6ff; border-radius:10px; opacity:0; pointer-events:none; transition:opacity .12s ease; z-index:2147482999; }
    .entry-outer-hover-edit:hover::after,
    .entry-outer-hover-edit.entry-outer-edit-active::after { opacity:1; }
    .entry-outer-hover-label,
    .entry-outer-hover-handle { opacity:0!important; pointer-events:none!important; transition:opacity .12s ease!important; }
    .entry-outer-hover-edit:hover > .entry-outer-hover-label,
    .entry-outer-hover-edit:hover > .entry-outer-hover-handle,
    .entry-outer-hover-edit.entry-outer-edit-active > .entry-outer-hover-label,
    .entry-outer-hover-edit.entry-outer-edit-active > .entry-outer-hover-handle { opacity:1!important; pointer-events:auto!important; }
    .entry-outer-hover-label { position:absolute!important; left:10px!important; top:10px!important; z-index:2147483645!important; padding:4px 9px!important; border:1px solid #68b4ff!important; border-radius:6px!important; background:#061425!important; color:#dcebff!important; font:700 11px/1.2 Arial,sans-serif!important; cursor:move!important; user-select:none!important; touch-action:none!important; }
    .entry-outer-hover-handle { position:absolute!important; z-index:2147483646!important; width:18px!important; height:18px!important; border-radius:5px!important; border:2px solid #fff!important; background:#3b82f6!important; box-sizing:border-box!important; touch-action:none!important; }
    .entry-outer-hover-handle[data-dir="nw"]{left:-9px!important;top:-9px!important;cursor:nwse-resize!important}
    .entry-outer-hover-handle[data-dir="n"]{left:50%!important;top:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .entry-outer-hover-handle[data-dir="ne"]{right:-9px!important;top:-9px!important;cursor:nesw-resize!important}
    .entry-outer-hover-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .entry-outer-hover-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}
    .entry-outer-hover-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .entry-outer-hover-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}
    .entry-outer-hover-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #entryOuterToolbar { position:fixed!important; right:250px!important; bottom:22px!important; z-index:2147483647!important; display:flex!important; gap:10px!important; padding:10px!important; border:1px solid #2d65a4!important; border-radius:12px!important; background:#061425!important; box-shadow:0 8px 28px rgba(0,0,0,.55)!important; }
    #entryOuterToolbar button { padding:10px 16px!important; border-radius:8px!important; border:1px solid #3979bf!important; background:#0b2440!important; color:#fff!important; font-weight:800!important; cursor:pointer!important; }
  `;
  document.head.appendChild(style);

  el.classList.add("entry-outer-hover-edit");
  applyBox();

  const label = document.createElement("span");
  label.className = "entry-outer-hover-label";
  label.textContent = "ENTRY CHECKS OUTER";
  el.appendChild(label);
  dirs.forEach(dir => {
    const h = document.createElement("span");
    h.className = "entry-outer-hover-handle";
    h.dataset.dir = dir;
    el.appendChild(h);
  });

  function beginSession(onMove) {
    el.classList.add("entry-outer-edit-active");
    const move = event => { event.preventDefault(); onMove(event); };
    const end = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
      el.classList.remove("entry-outer-edit-active");
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
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
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
    const handle = event.target.closest?.(".entry-outer-hover-handle");
    if (handle) return startResize(event, handle.dataset.dir || "se");
    if (event.target.closest?.(".entry-outer-hover-label")) return startMove(event);
    if (event.target.closest?.("button,input,select,textarea,a,.entry-strategy-debug")) return;
    return startMove(event);
  }, true);

  const toolbar = document.createElement("div");
  toolbar.id = "entryOuterToolbar";
  toolbar.innerHTML = '<button id="entryOuterSave" type="button">SAVE OUTER</button><button id="entryOuterReset" type="button">RESET OUTER</button>';
  document.body.appendChild(toolbar);

  document.getElementById("entryOuterSave")?.addEventListener("click", async () => {
    const payload = {
      version: 10,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items: { entryChecksOuter: { x: Math.round(state.x), y: Math.round(state.y), width: Math.round(state.width), height: Math.round(state.height) } }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.items.entryChecksOuter));
    const text = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(text); } catch (_error) { window.prompt("Copy layout:", text); }
  });

  document.getElementById("entryOuterReset")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
})();