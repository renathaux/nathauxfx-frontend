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
      z-index: 2147483000 !important;
      isolation: isolate !important;
    }

    #eurusd-card > .dashboard-layout-editor-handle,
    #gold-card > .dashboard-layout-editor-handle {
      position: absolute !important;
      z-index: 2147483647 !important;
      width: 22px !important;
      height: 22px !important;
      border-radius: 6px !important;
      border: 2px solid #fff !important;
      background: #3b82f6 !important;
      box-shadow: 0 2px 10px rgba(0,0,0,.55) !important;
      pointer-events: auto !important;
      touch-action: none !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Keep the TOP handles fully inside the card so the performance strip above
       cannot steal Safari pointer events. */
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="nw"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="nw"] { left:3px!important; top:3px!important; cursor:nwse-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="n"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="n"] { left:50%!important; top:3px!important; transform:translateX(-50%)!important; cursor:ns-resize!important; }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="ne"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="ne"] { right:3px!important; top:3px!important; cursor:nesw-resize!important; }

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

    /* Large invisible hit zone across the top edge. */
    #eurusd-card > .dashboard-card-top-resize-hit,
    #gold-card > .dashboard-card-top-resize-hit {
      position:absolute!important;
      left:34px!important;
      right:34px!important;
      top:0!important;
      height:20px!important;
      z-index:2147483646!important;
      cursor:ns-resize!important;
      pointer-events:auto!important;
      touch-action:none!important;
      background:transparent!important;
    }
  `;
  document.head.appendChild(style);

  function ensureTopHit(card) {
    if (!card || card.querySelector(":scope > .dashboard-card-top-resize-hit")) return;
    const hit = document.createElement("span");
    hit.className = "dashboard-card-top-resize-hit";
    card.appendChild(hit);
  }

  function ensureCards() {
    [document.getElementById("eurusd-card"), document.getElementById("gold-card")].forEach(ensureTopHit);
  }
  ensureCards();
  window.addEventListener("load", ensureCards);
  const timer = window.setInterval(ensureCards, 200);
  window.setTimeout(() => window.clearInterval(timer), 10000);

  document.addEventListener("pointerdown", event => {
    const card = event.target.closest?.("#eurusd-card, #gold-card");
    if (!card || !card.classList.contains("dashboard-layout-editor-target")) return;

    /* Clicking anywhere along the top edge uses the north resize handle. */
    if (event.target.closest?.(".dashboard-card-top-resize-hit")) {
      const north = card.querySelector(":scope > .dashboard-layout-editor-handle[data-dir='n']");
      if (!north) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      north.dispatchEvent(new PointerEvent("pointerdown", {
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
      return;
    }

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
