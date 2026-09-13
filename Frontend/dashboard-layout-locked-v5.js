(function () {
  if (window.innerWidth < 701) return;

  const locked = [
    { selector: "#fundamental-insight-card", x: 0, y: 0, width: 706, height: 423 },
    { selector: ".main-smc-panel", x: -9, y: 0, width: 367, height: 500 },
    { selector: ".main-metrics", x: 0, y: 0, width: 358, height: 66 },
    { selector: ".main-signal-box", x: 0, y: 0, width: 358, height: 64 },
    { selector: ".main-live", x: 0, y: 0, width: 358, height: 14 },
    { selector: "#main-candle-debug", x: 0, y: 0, width: 358, height: 13 },

    { selector: ".history-section", x: -698, y: 13, width: 1405, height: 332 },
    { selector: ".entry-strategy-debug", x: 1, y: -9, width: 265, height: 174 },
    { selector: "#eurusd-card", x: 0, y: 0, width: 264, height: 296 },
    { selector: "#gold-card", x: 0, y: 6, width: 264, height: 288 },
    { selector: ".main-trade-card", x: 0, y: 7, width: 393, height: 819 },
  ];

  const entryChecksOuter = { x: 0, y: 0, width: 274, height: 802 };

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function applyBox(el, state) {
    setImportant(el, "box-sizing", "border-box");
    setImportant(el, "width", `${state.width}px`);
    setImportant(el, "height", `${state.height}px`);
    setImportant(el, "max-width", "none");
    setImportant(el, "min-width", "0");
    setImportant(el, "min-height", "0");
    setImportant(el, "translate", "0px 0px");
    setImportant(el, "transform", `translate3d(${state.x}px, ${state.y}px, 0)`);
    el.style.removeProperty("cursor");
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

  function removeEditorUi() {
    document.querySelectorAll(
      ".dashboard-layout-editor-label, .dashboard-layout-editor-handle, .dashboard-card-top-overlay, .stage4-edit-label, .stage4-edit-handle, .main-trade-hover-label, .main-trade-hover-handle, .history-entry-hover-label, .history-entry-hover-handle, .entry-outer-hover-label, .entry-outer-hover-handle, #dashboardLayoutToolbar, #dashboardLayoutSave, #dashboardLayoutReset, #dashboardLayoutToast, #dashboardStage4Toolbar, #dashboardStage4Toast, #mainTradeHoverToolbar, #historyEntryToolbar, #entryOuterToolbar"
    ).forEach(node => node.remove());

    document.querySelectorAll(".dashboard-layout-editor-target, .stage4-edit-target, .main-trade-hover-edit, .history-entry-hover-edit, .entry-outer-hover-edit").forEach(el => {
      el.classList.remove("dashboard-layout-editor-target", "stage4-edit-target", "main-trade-hover-edit", "main-trade-edit-active", "history-entry-hover-edit", "history-entry-edit-active", "entry-outer-hover-edit", "entry-outer-edit-active");
      el.style.removeProperty("outline");
      el.style.removeProperty("outline-offset");
      el.style.removeProperty("cursor");
    });
  }

  function applyLockedLayout() {
    locked.forEach(config => {
      const el = document.querySelector(config.selector);
      if (!el) return;
      applyBox(el, config);
    });

    const outer = resolveEntryOuter();
    if (outer) applyBox(outer, entryChecksOuter);

    removeEditorUi();
  }

  applyLockedLayout();
  window.addEventListener("load", applyLockedLayout, { once: true });

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    applyLockedLayout();
    if (tries >= 80) window.clearInterval(timer);
  }, 150);
})();