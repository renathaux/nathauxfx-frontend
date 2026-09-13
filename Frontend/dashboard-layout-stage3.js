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

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function applyBox(el, state) {
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
    // Keep the old editors from attaching these locked items again.
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

  // Apply the completed part of the user's saved layout in normal mode and edit mode.
  applyLockedLayout();
  window.addEventListener("load", applyLockedLayout);
  const lockedTimer = window.setInterval(applyLockedLayout, 250);
  window.setTimeout(() => window.clearInterval(lockedTimer), 12000);

  if (!editMode) return;

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_error) {}

  const editableConfigs = [
    { key: "recentSignalHistory", label: "RECENT SIGNAL HISTORY", selector: ".history-section", minW: 260, minH: 100, dragWhole: false },
    { key: "entryStrategyChecks", label: "ENTRY STRATEGY CHECKS", selector: ".entry-strategy-debug", minW: 180, minH: 90, dragWhole: true },
    { key: "eurusdCard", label: "EURUSD CARD", selector: "#eurusd-card", minW: 180, minH: 180, dragWhole: false },
    { key: "goldCard", label: "GOLD CARD", selector: "#gold-card", minW: 180, minH: 180, dragWhole: false },
  ];

  const dirs = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const states = new Map();

  function readTransform(el) {
    const style = getComputedStyle(el);
    const matrix = style.transform;
    if (matrix && matrix !== "none") {
      try {
        const m = new DOMMatrixReadOnly(matrix);
        return { x: m.m41 || 0, y: m.m42 || 0 };
      } catch (_error) {}
    }
    const translate = style.translate;
    if (translate && translate !== "none") {
      const parts = translate.split(/\s+/);
      return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1] || "0") || 0 };
    }
    return { x: 0, y: 0 };
  }

  function ensureChrome(el, labelText) {
    el.classList.add("dashboard-layout-editor-target");

    let label = Array.from(el.children).find(child => child.classList?.contains("dashboard-layout-editor-label"));
    if (!label) {
      label = document.createElement("span");
      label.className = "dashboard-layout-editor-label";
      el.appendChild(label);
    }
    label.textContent = labelText;

    dirs.forEach(dir => {
      let handle = Array.from(el.children).find(child => child.classList?.contains("dashboard-layout-editor-handle") && child.dataset.dir === dir);
      if (!handle) {
        handle = document.createElement("span");
        handle.className = "dashboard-layout-editor-handle";
        handle.dataset.dir = dir;
        el.appendChild(handle);
      }
    });
  }

  function initEditable(config) {
    const el = document.querySelector(config.selector);
    if (!el || states.has(el)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;

    ensureChrome(el, config.label);
    const current = readTransform(el);
    const restored = saved?.items?.[config.key];
    const state = {
      key: config.key,
      selector: config.selector,
      minW: config.minW,
      minH: config.minH,
      dragWhole: config.dragWhole,
      x: Number.isFinite(Number(restored?.x)) ? Number(restored.x) : current.x,
      y: Number.isFinite(Number(restored?.y)) ? Number(restored.y) : current.y,
      width: Number.isFinite(Number(restored?.width)) ? Number(restored.width) : rect.width,
      height: Number.isFinite(Number(restored?.height)) ? Number(restored.height) : rect.height,
    };
    states.set(el, state);
    applyBox(el, state);

    if (config.dragWhole) {
      el.style.setProperty("cursor", "move", "important");
    }
    return true;
  }

  function ensureEditable() {
    editableConfigs.forEach(initEditable);
    applyLockedLayout();
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
      state.x = start.x + moveEvent.clientX - startX;
      state.y = start.y + moveEvent.clientY - startY;
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

  // Capture phase wins over the older temporary editor handlers.
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

    // ENTRY STRATEGY CHECKS can be dragged directly from the middle of the card.
    const entry = target.closest?.(".entry-strategy-debug");
    if (entry && states.has(entry)) {
      if (target.closest?.("button,input,select,textarea,a,.dashboard-layout-editor-handle,.dashboard-layout-editor-label")) return;
      return startMove(event, entry, states.get(entry));
    }
  }, true);

  // Save only the items that are still being edited. Completed items are already locked above.
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
      version: 4,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items,
    };
    const text = JSON.stringify(payload, null, 2);

    // Merge the new editable values into storage so refreshes keep the unfinished work.
    let merged = {};
    try { merged = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch (_error) {}
    merged.version = 4;
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
