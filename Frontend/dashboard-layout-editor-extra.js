(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1" || window.innerWidth < 701) return;

  const STORAGE_KEY = "nathauxfx_dashboard_layout_editor_v1";
  const dirs = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  const extraTargets = [
    {
      key: "mainSmcPlan",
      label: "SMC PLAN",
      selector: ".main-smc-panel",
      minW: 220,
      minH: 160,
    },
    {
      key: "mainBiasMetrics",
      label: "BULLISH / BEARISH / BIAS STRENGTH",
      selector: ".main-metrics",
      minW: 220,
      minH: 60,
    },
    {
      key: "mainSignalBox",
      label: "MAIN WAIT / SIGNAL",
      selector: ".main-signal-box",
      minW: 220,
      minH: 50,
    },
    {
      key: "mainRuntimeStatus",
      label: "LIVE / STALE DATA",
      selector: ".main-live",
      minW: 80,
      minH: 20,
    },
    {
      key: "mainCandleDebug",
      label: "CANDLE STATUS",
      selector: "#main-candle-debug",
      minW: 180,
      minH: 20,
    },
  ];

  const allSaveTargets = [
    { key: "recentSignalHistory", selector: ".history-section" },
    { key: "entryStrategyChecks", selector: ".entry-strategy-debug" },
    { key: "fundamentalInsight", selector: "#fundamental-insight-card" },
    ...extraTargets.map(({ key, selector }) => ({ key, selector })),
  ];

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_error) {}

  function number(value, fallback = 0) {
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
    return {
      x: parseFloat(parts[0]) || 0,
      y: parseFloat(parts[1] || "0") || 0,
    };
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

  function attachExtraTarget(config) {
    const el = document.querySelector(config.selector);
    if (!el || el.dataset.dashboardLayoutExtraAttached === "1") return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 8) return false;

    el.dataset.dashboardLayoutExtraAttached = "1";
    const originalPosition = getComputedStyle(el).position;
    el.classList.add("dashboard-layout-editor-target");
    if (originalPosition === "absolute" || originalPosition === "fixed") {
      setImportant(el, "position", originalPosition);
    } else {
      setImportant(el, "position", "relative");
    }

    const base = parseTranslate(el);
    const restored = saved?.items?.[config.key];
    const state = {
      x: number(restored?.x, base.x),
      y: number(restored?.y, base.y),
      width: number(restored?.width, rect.width),
      height: number(restored?.height, rect.height),
    };
    applyState(el, state);

    const label = document.createElement("span");
    label.className = "dashboard-layout-editor-label";
    label.textContent = config.label;
    el.appendChild(label);

    label.addEventListener("pointerdown", event => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startXOffset = state.x;
      const startYOffset = state.y;
      dragSession(moveEvent => {
        state.x = startXOffset + moveEvent.clientX - startX;
        state.y = startYOffset + moveEvent.clientY - startY;
        applyState(el, state);
      });
    });

    dirs.forEach(dir => {
      const handle = document.createElement("span");
      handle.className = "dashboard-layout-editor-handle";
      handle.dataset.dir = dir;
      el.appendChild(handle);

      handle.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const start = { ...state };

        dragSession(moveEvent => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          let x = start.x;
          let y = start.y;
          let width = start.width;
          let height = start.height;

          if (dir.includes("e")) width = Math.max(config.minW, start.width + dx);
          if (dir.includes("s")) height = Math.max(config.minH, start.height + dy);
          if (dir.includes("w")) {
            const next = Math.max(config.minW, start.width - dx);
            x = start.x + (start.width - next);
            width = next;
          }
          if (dir.includes("n")) {
            const next = Math.max(config.minH, start.height - dy);
            y = start.y + (start.height - next);
            height = next;
          }

          Object.assign(state, { x, y, width, height });
          applyState(el, state);
        });
      });
    });

    return true;
  }

  function readTarget(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const translation = parseTranslate(el);
    return {
      x: Math.round(translation.x),
      y: Math.round(translation.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function replaceSaveButton() {
    const oldButton = document.getElementById("dashboardLayoutSave");
    if (!oldButton || oldButton.dataset.saveAllInstalled === "1") return false;

    const button = oldButton.cloneNode(true);
    button.dataset.saveAllInstalled = "1";
    oldButton.replaceWith(button);

    button.addEventListener("click", async () => {
      const items = {};
      allSaveTargets.forEach(target => {
        const item = readTarget(target.selector);
        if (item) items[target.key] = item;
      });

      const payload = {
        version: 2,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        savedAt: new Date().toISOString(),
        items,
      };
      const text = JSON.stringify(payload, null, 2);
      localStorage.setItem(STORAGE_KEY, text);

      const toast = document.getElementById("dashboardLayoutToast");
      try {
        await navigator.clipboard.writeText(text);
        if (toast) {
          toast.textContent = "Saved all editable dashboard items — paste it in ChatGPT.";
          toast.classList.add("show");
          window.setTimeout(() => toast.classList.remove("show"), 2800);
        }
      } catch (_error) {
        window.prompt("Copy this layout and paste it in ChatGPT:", text);
      }
    });

    return true;
  }

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    extraTargets.forEach(attachExtraTarget);
    replaceSaveButton();

    const ready =
      extraTargets.every(target => document.querySelector(target.selector)?.dataset.dashboardLayoutExtraAttached === "1") &&
      document.getElementById("dashboardLayoutSave")?.dataset.saveAllInstalled === "1";

    if (ready || tries > 100) window.clearInterval(timer);
  }, 200);
})();
