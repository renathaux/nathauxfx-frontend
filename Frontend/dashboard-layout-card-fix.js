(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutEdit") !== "1" || window.innerWidth < 701) return;

  const style = document.createElement("style");
  style.id = "dashboardLayoutCardFixStyle";
  style.textContent = `
    #eurusd-card.dashboard-layout-editor-target,
    #gold-card.dashboard-layout-editor-target {
      overflow: visible !important;
      cursor: move !important;
    }

    #eurusd-card > .dashboard-layout-editor-handle,
    #gold-card > .dashboard-layout-editor-handle {
      position: absolute !important;
      z-index: 2147483647 !important;
      width: 18px !important;
      height: 18px !important;
      border-radius: 5px !important;
      border: 2px solid #fff !important;
      background: #3b82f6 !important;
      box-shadow: 0 2px 10px rgba(0,0,0,.55) !important;
      pointer-events: auto !important;
      touch-action: none !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    #eurusd-card > .dashboard-layout-editor-handle[data-dir="nw"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="nw"] { left:-11px!important; top:-11px!important; cursor:nwse-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="n"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="n"] { left:50%!important; top:-11px!important; transform:translateX(-50%)!important; cursor:ns-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="ne"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="ne"] { right:-11px!important; top:-11px!important; cursor:nesw-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="e"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="e"] { right:-11px!important; top:50%!important; transform:translateY(-50%)!important; cursor:ew-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="se"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="se"] { right:-11px!important; bottom:-11px!important; cursor:nwse-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="s"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="s"] { left:50%!important; bottom:-11px!important; transform:translateX(-50%)!important; cursor:ns-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="sw"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="sw"] { left:-11px!important; bottom:-11px!important; cursor:nesw-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="w"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="w"] { left:-11px!important; top:50%!important; transform:translateY(-50%)!important; cursor:ew-resize!important; }
  `;
  document.head.appendChild(style);

  document.addEventListener("pointerdown", event => {
    const card = event.target.closest?.("#eurusd-card, #gold-card");
    if (!card || !card.classList.contains("dashboard-layout-editor-target")) return;
    if (event.target.closest?.(".dashboard-layout-editor-handle,.dashboard-layout-editor-label,button,input,select,textarea,a")) return;

    const label = Array.from(card.children).find(child => child.classList?.contains("dashboard-layout-editor-label"));
    if (!label) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    label.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId || 1,
      pointerType: event.pointerType || "mouse",
      isPrimary: true,
      buttons: 1,
      button: 0
    }));
  }, true);
})();
