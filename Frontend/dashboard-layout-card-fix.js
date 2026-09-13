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

    /* The performance strip physically overlaps the first pixels of these cards.
       Put the NORTH resize controls farther INSIDE the card so they are actually clickable. */
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="nw"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="nw"] {
      left: 8px !important;
      top: 32px !important;
      cursor: nwse-resize !important;
    }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="n"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="n"] {
      left: 50% !important;
      top: 32px !important;
      transform: translateX(-50%) !important;
      cursor: ns-resize !important;
    }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="ne"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="ne"] {
      right: 8px !important;
      top: 32px !important;
      cursor: nesw-resize !important;
    }

    #eurusd-card > .dashboard-layout-editor-handle[data-dir="e"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="e"] {
      right: -11px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      cursor: ew-resize !important;
    }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="se"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="se"] {
      right: -11px !important;
      bottom: -11px !important;
      cursor: nwse-resize !important;
    }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="s"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="s"] {
      left: 50% !important;
      bottom: -11px !important;
      transform: translateX(-50%) !important;
      cursor: ns-resize !important;
    }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="sw"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="sw"] {
      left: -11px !important;
      bottom: -11px !important;
      cursor: nesw-resize !important;
    }
    #eurusd-card > .dashboard-layout-editor-handle[data-dir="w"],
    #gold-card > .dashboard-layout-editor-handle[data-dir="w"] {
      left: -11px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      cursor: ew-resize !important;
    }

    /* Dedicated top-resize lane. It is intentionally ~30px below the real top border,
       but it resizes the REAL top edge. This avoids the overlapping performance strip. */
    #eurusd-card > .dashboard-card-top-resize-hit,
    #gold-card > .dashboard-card-top-resize-hit {
      position: absolute !important;
      left: 38px !important;
      right: 38px !important;
      top: 28px !important;
      height: 30px !important;
      z-index: 2147483646 !important;
      cursor: ns-resize !important;
      pointer-events: auto !important;
      touch-action: none !important;
      background: rgba(59,130,246,.06) !important;
      border-top: 2px dashed rgba(96,165,250,.95) !important;
      box-sizing: border-box !important;
    }
  `;
  document.head.appendChild(style);

  function ensureTopHit(card) {
    if (!card || card.querySelector(":scope > .dashboard-card-top-resize-hit")) return;
    const hit = document.createElement("span");
    hit.className = "dashboard-card-top-resize-hit";
    hit.title = "Drag here to resize the TOP edge";
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

    /* The blue dashed lane proxies directly to the north handle. */
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

    /* Drag the entire EURUSD/GOLD card from anywhere in the middle. */
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
