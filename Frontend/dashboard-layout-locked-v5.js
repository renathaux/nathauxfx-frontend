(function () {
  if (window.innerWidth < 701) return;

  const locked = [
    { selector: "#fundamental-insight-card", x: 0, y: 0, width: 706, height: 423 },
    { selector: ".main-smc-panel", x: -9, y: 0, width: 367, height: 487 },
    { selector: ".main-metrics", x: 0, y: 0, width: 358, height: 66 },
    { selector: ".main-signal-box", x: 0, y: 0, width: 358, height: 64 },
    { selector: ".main-live", x: 0, y: 0, width: 358, height: 14 },
    { selector: "#main-candle-debug", x: 0, y: 0, width: 358, height: 13 },

    { selector: ".history-section", x: 544, y: 55, width: 880, height: 175 },
    { selector: ".entry-strategy-debug", x: -8, y: 5, width: 278, height: 173 },
    { selector: "#eurusd-card", x: -5, y: 13, width: 274, height: 295 },
    { selector: "#gold-card", x: -6, y: 22, width: 273, height: 298 },
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
