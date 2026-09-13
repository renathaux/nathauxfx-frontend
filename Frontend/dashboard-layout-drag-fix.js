(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1" || window.innerWidth < 701) return;

  const STORAGE_KEY = "nathauxfx_dashboard_layout_editor_v1";
  const targets = [
    { key: "recentSignalHistory", selector: ".history-section", minW: 260, minH: 100 },
    { key: "entryStrategyChecks", selector: ".entry-strategy-debug", minW: 180, minH: 90 },
    { key: "fundamentalInsight", selector: "#fundamental-insight-card", minW: 280, minH: 140 },
    { key: "mainSmcPlan", selector: ".main-smc-panel", minW: 220, minH: 160 },
    { key: "mainBiasMetrics", selector: ".main-metrics", minW: 220, minH: 60 },
    { key: "mainSignalBox", selector: ".main-signal-box", minW: 220, minH: 50 },
    { key: "mainRuntimeStatus", selector: ".main-live", minW: 80, minH: 20 },
    { key: "mainCandleDebug", selector: "#main-candle-debug", minW: 180, minH: 20 }
  ];

  const states = new Map();

  function parseTranslate(el) {
    const value = getComputedStyle(el).translate;
    if (!value || value === "none") return { x: 0, y: 0 };
    const parts = value.split(/\s+/);
    return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1] || "0") || 0 };
  }

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function initTarget(config) {
    const el = document.querySelector(config.selector);
    if (!el || states.has(el)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 8) return false;

    const offset = parseTranslate(el);
    const state = {
      key: config.key,
      selector: config.selector,
      minW: config.minW,
      minH: config.minH,
      x: offset.x,
      y: offset.y,
      width: rect.width,
      height: rect.height
    };
    states.set(el, state);

    // Safari was not visually honoring the individual translate property reliably
    // on these dashboard panels. Move with transform instead.
    setImportant(el, "translate", "0px 0px");
    apply(el, state);
    return true;
  }

  function apply(el, state) {
    setImportant(el, "width", `${Math.round(state.width)}px`);
    setImportant(el, "height", `${Math.round(state.height)}px`);
    setImportant(el, "max-width", "none");
    setImportant(el, "min-width", "0");
    setImportant(el, "min-height", "0");
    setImportant(el, "transform", `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`);
    setImportant(el, "translate", "0px 0px");
  }

  function ensureTargets() {
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

  document.addEventListener("pointerdown", event => {
    const label = event.target.closest?.(".dashboard-layout-editor-label");
    const handle = event.target.closest?.(".dashboard-layout-editor-handle");
    if (!label && !handle) return;

    const el = (label || handle).closest?.(".dashboard-layout-editor-target");
    if (!el) return;
    if (!states.has(el)) {
      const config = targets.find(item => el.matches(item.selector));
      if (config) initTarget(config);
    }
    const state = states.get(el);
    if (!state) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };

    if (label) {
      beginSession(moveEvent => {
        state.x = start.x + (moveEvent.clientX - startX);
        state.y = start.y + (moveEvent.clientY - startY);
        apply(el, state);
      });
      return;
    }

    const dir = handle.dataset.dir || "se";
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
      apply(el, state);
    });
  }, true);

  document.addEventListener("click", async event => {
    const button = event.target.closest?.("#dashboardLayoutSave");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    ensureTargets();

    const items = {};
    targets.forEach(config => {
      const el = document.querySelector(config.selector);
      const state = el ? states.get(el) : null;
      if (!el || !state) return;
      const rect = el.getBoundingClientRect();
      items[config.key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });

    const payload = {
      version: 3,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items
    };
    const text = JSON.stringify(payload, null, 2);
    localStorage.setItem(STORAGE_KEY, text);

    const toast = document.getElementById("dashboardLayoutToast");
    try {
      await navigator.clipboard.writeText(text);
      if (toast) {
        toast.textContent = "Saved — drag positions and sizes copied. Paste them in ChatGPT.";
        toast.classList.add("show");
        window.setTimeout(() => toast.classList.remove("show"), 2800);
      }
    } catch (_error) {
      window.prompt("Copy this layout and paste it in ChatGPT:", text);
    }
  }, true);

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    ensureTargets();
    if (states.size >= targets.length || tries > 120) window.clearInterval(timer);
  }, 150);
  window.addEventListener("load", ensureTargets);
})();
