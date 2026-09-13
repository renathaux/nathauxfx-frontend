(function () {
  if (window.innerWidth < 701) return;

  const locked = [
    { selector: "#fundamental-insight-card", x: 0, y: 0, width: 706, height: 423 },
    { selector: ".main-smc-panel", x: -9, y: 0, width: 367, height: 500 },
    { selector: ".main-metrics", x: 0, y: 0, width: 358, height: 66 },
    { selector: ".main-signal-box", x: 0, y: 0, width: 358, height: 64 },
    { selector: ".main-live", x: 0, y: 0, width: 358, height: 14 },
    { selector: "#main-candle-debug", x: 0, y: 0, width: 358, height: 13 },
    { selector: ".entry-strategy-debug", x: 1, y: -9, width: 265, height: 174 },
    { selector: "#eurusd-card", x: 0, y: 0, width: 264, height: 296 },
    { selector: "#gold-card", x: 0, y: 6, width: 264, height: 288 },
    { selector: ".main-trade-card", x: 0, y: 7, width: 393, height: 819 },
  ];

  const historyLocked = { x: -698, y: 13, width: 1405, height: 332 };
  const entryChecksOuter = { x: 0, y: 0, width: 274, height: 802 };

  function setImportant(el, prop, value) { el.style.setProperty(prop, value, "important"); }

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
      if (r.width >= innerRect.width + 8 && r.width <= innerRect.width + 140 && r.height >= innerRect.height + 16 && r.height <= innerRect.height + 180) return parent;
    }
    return inner.parentElement;
  }

  function applyHistoryLayout() {
    const history = document.querySelector(".history-section");
    const app = document.getElementById("mainApp");
    if (!history || !app) return;
    if (!history.dataset.detachedHistory) {
      const rect = history.getBoundingClientRect();
      const appRect = app.getBoundingClientRect();
      history.dataset.detachedHistory = "1";
      history.dataset.detachedTop = String(Math.round(rect.top - appRect.top));
      app.appendChild(history);
    }
    const top = Number(history.dataset.detachedTop || 0) + historyLocked.y;
    setImportant(app, "position", "relative");
    setImportant(app, "overflow", "visible");
    setImportant(history, "position", "absolute");
    setImportant(history, "left", "18px");
    setImportant(history, "top", `${Math.round(top)}px`);
    setImportant(history, "width", `${historyLocked.width}px`);
    setImportant(history, "height", `${historyLocked.height}px`);
    setImportant(history, "max-width", "none");
    setImportant(history, "min-width", "0");
    setImportant(history, "min-height", "0");
    setImportant(history, "transform", "none");
    setImportant(history, "translate", "0px 0px");
    setImportant(history, "overflow", "visible");
    setImportant(history, "contain", "none");
    setImportant(history, "clip-path", "none");
    setImportant(history, "z-index", "20");
    const needed = top + historyLocked.height + 24;
    if (needed > app.scrollHeight) setImportant(app, "min-height", `${Math.ceil(needed)}px`);
  }

  function norm(node) { return (node?.textContent || "").trim().replace(/\s+/g, " "); }

  function removeStrayDetails() {
    document.querySelectorAll("body *").forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.closest("#smartExplainDetails, .entry-strategy-debug")) return;
      const rect = node.getBoundingClientRect();
      if (!(rect.left < 260 && rect.top > window.innerHeight - 190)) return;
      const text = norm(node);
      if (text === "Details" || text === "Details ×" || text === "Details×") {
        const parent = node.parentElement;
        const ptext = norm(parent);
        if (parent && ptext.length <= 24 && /Details/i.test(ptext)) parent.remove(); else node.remove();
        return;
      }
      if ((text === "×" || text === "x" || text === "X") && node.parentElement && /Details/i.test(norm(node.parentElement)) && norm(node.parentElement).length <= 24) {
        node.parentElement.remove();
      }
    });
  }

  function installDetailsGuard() {
    removeStrayDetails();
    if (window.__nathauxDetailsGuardInstalled) return;
    window.__nathauxDetailsGuardInstalled = true;
    const observer = new MutationObserver(removeStrayDetails);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.setInterval(removeStrayDetails, 400);
  }

  function removeEditorUi() {
    document.querySelectorAll(".dashboard-layout-editor-label, .dashboard-layout-editor-handle, .dashboard-card-top-overlay, .stage4-edit-label, .stage4-edit-handle, .main-trade-hover-label, .main-trade-hover-handle, .history-entry-hover-label, .history-entry-hover-handle, .entry-outer-hover-label, .entry-outer-hover-handle, #dashboardLayoutToolbar, #dashboardLayoutSave, #dashboardLayoutReset, #dashboardLayoutToast, #dashboardStage4Toolbar, #dashboardStage4Toast, #mainTradeHoverToolbar, #historyEntryToolbar, #entryOuterToolbar").forEach(node => node.remove());
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
      if (el) applyBox(el, config);
    });
    const outer = resolveEntryOuter();
    if (outer) applyBox(outer, entryChecksOuter);
    applyHistoryLayout();
    removeEditorUi();
    installDetailsGuard();
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