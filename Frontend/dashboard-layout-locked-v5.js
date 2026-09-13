(function () {
  if (window.innerWidth < 701) return;

  const locked = [
    { selector: "#fundamental-insight-card", x: 0, y: 0, width: 706, height: 423 },
    { selector: ".main-smc-panel", x: -9, y: 0, width: 367, height: 487 },
    { selector: ".main-metrics", x: 0, y: 0, width: 358, height: 66 },
    { selector: ".main-signal-box", x: 0, y: 0, width: 358, height: 64 },
    { selector: ".main-live", x: 0, y: 0, width: 358, height: 14 },
    { selector: "#main-candle-debug", x: 0, y: 0, width: 358, height: 13 },

    { selector: ".history-section", x: -684, y: 34, width: 2108, height: 260 },
    { selector: ".entry-strategy-debug", x: 0, y: -1, width: 265, height: 179 },
    { selector: "#eurusd-card", x: 0, y: 0, width: 264, height: 296 },
    { selector: "#gold-card", x: 0, y: 6, width: 264, height: 288 },
  ];

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

  function removeEditorUi() {
    document.querySelectorAll(
      ".dashboard-layout-editor-label, .dashboard-layout-editor-handle, .dashboard-card-top-overlay, #dashboardLayoutToolbar, #dashboardLayoutSave, #dashboardLayoutReset, #dashboardLayoutToast"
    ).forEach(node => node.remove());

    document.querySelectorAll(".dashboard-layout-editor-target").forEach(el => {
      el.classList.remove("dashboard-layout-editor-target");
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
