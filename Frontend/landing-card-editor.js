(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('layoutEdit') !== '1') return;
  if (window.innerWidth < 900) return;

  const STORAGE_KEY = 'nathauxfx_landing_card_editor_v2';
  const page = document.getElementById('landingPage');
  const targets = [
    ['trustCard', document.querySelector('.trust-card')],
    ['heroStats', document.querySelector('.hero-stats')]
  ].filter(([, el]) => el);

  document.documentElement.classList.add('landing-card-editor-on');

  const css = document.createElement('style');
  css.textContent = `
    .landing-card-editor-on .card-editor-target {
      position: relative !important;
      z-index: 1000 !important;
      outline: 2px dashed rgba(56,189,248,.9) !important;
      outline-offset: 3px !important;
      cursor: move !important;
      touch-action: none !important;
      user-select: none !important;
    }
    .landing-card-editor-on .card-editor-target:hover {
      outline-style: solid !important;
    }
    .card-editor-label {
      position: absolute !important;
      left: 8px !important;
      top: -31px !important;
      z-index: 2147483646 !important;
      padding: 5px 9px !important;
      border-radius: 7px !important;
      background: #0b1b32 !important;
      border: 1px solid #2f80ff !important;
      color: #dbeafe !important;
      font: 800 11px/1 Arial,sans-serif !important;
      pointer-events: none !important;
      white-space: nowrap !important;
    }
    .card-editor-handle {
      position: absolute !important;
      z-index: 2147483647 !important;
      width: 14px !important;
      height: 14px !important;
      border-radius: 3px !important;
      border: 2px solid #fff !important;
      background: #2f80ff !important;
      box-shadow: 0 2px 8px rgba(0,0,0,.55) !important;
      pointer-events: auto !important;
    }
    .card-editor-handle[data-dir="nw"]{left:-9px!important;top:-9px!important;cursor:nwse-resize!important}
    .card-editor-handle[data-dir="n"]{left:50%!important;top:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .card-editor-handle[data-dir="ne"]{right:-9px!important;top:-9px!important;cursor:nesw-resize!important}
    .card-editor-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .card-editor-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}
    .card-editor-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .card-editor-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}
    .card-editor-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}

    #landingPageHeightGuide {
      position: fixed !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      height: 20px !important;
      z-index: 2147483645 !important;
      cursor: ns-resize !important;
      touch-action: none !important;
      background: linear-gradient(to bottom, transparent 0 7px, rgba(168,85,247,.95) 7px 10px, transparent 10px) !important;
    }
    #landingPageHeightGuide::after {
      content: '↕ PAGE BOTTOM — drag up / down';
      position: absolute !important;
      left: 50% !important;
      bottom: 12px !important;
      transform: translateX(-50%) !important;
      padding: 6px 10px !important;
      border-radius: 8px !important;
      background: #24103d !important;
      border: 1px solid #a855f7 !important;
      color: #f3e8ff !important;
      font: 800 11px/1 Arial,sans-serif !important;
      white-space: nowrap !important;
    }

    #landingCardEditorToolbar {
      position: fixed !important;
      left: 50% !important;
      bottom: 28px !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      gap: 9px !important;
      padding: 9px !important;
      border-radius: 13px !important;
      border: 1px solid #315d96 !important;
      background: rgba(4,12,24,.96) !important;
      box-shadow: 0 18px 55px rgba(0,0,0,.6) !important;
      backdrop-filter: blur(12px) !important;
    }
    #landingCardEditorToolbar button {
      height: 40px !important;
      padding: 0 16px !important;
      border-radius: 9px !important;
      border: 1px solid #315d96 !important;
      background: #10213a !important;
      color: #fff !important;
      font: 800 12px/1 Arial,sans-serif !important;
      cursor: pointer !important;
    }
    #landingCardEditorToolbar #cardEditorSave {
      background: linear-gradient(135deg,#2f80ff,#1557ff) !important;
      border-color: #3b82f6 !important;
    }
    #cardEditorToast {
      position: fixed !important;
      left: 50% !important;
      bottom: 82px !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      padding: 8px 13px !important;
      border-radius: 999px !important;
      background: #0a1728 !important;
      border: 1px solid #315d96 !important;
      color: #dbeafe !important;
      font: 700 12px/1.2 Arial,sans-serif !important;
      opacity: 0;
      transition: opacity .18s ease;
      pointer-events: none !important;
    }
    #cardEditorToast.show{opacity:1}
  `;
  document.head.appendChild(css);

  const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  function parseTranslate(el) {
    const value = getComputedStyle(el).translate;
    if (!value || value === 'none') return { x: 0, y: 0 };
    const parts = value.split(/\s+/);
    return {
      x: parseFloat(parts[0]) || 0,
      y: parseFloat(parts[1] || '0') || 0
    };
  }

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_error) {}

  const states = new Map();
  const dirs = ['nw','n','ne','e','se','s','sw','w'];

  function applyState(el, state) {
    el.style.width = `${Math.round(state.width)}px`;
    el.style.height = `${Math.round(state.height)}px`;
    el.style.maxWidth = 'none';
    el.style.minHeight = '0';
    el.style.translate = `${Math.round(state.x)}px ${Math.round(state.y)}px`;
  }

  targets.forEach(([key, el]) => {
    const rect = el.getBoundingClientRect();
    const base = parseTranslate(el);
    const restored = saved?.items?.[key];
    const state = {
      x: toNumber(restored?.x, base.x),
      y: toNumber(restored?.y, base.y),
      width: toNumber(restored?.width, rect.width),
      height: toNumber(restored?.height, rect.height)
    };
    states.set(key, state);
    el.dataset.cardEditorKey = key;
    el.classList.add('card-editor-target');
    applyState(el, state);

    const label = document.createElement('span');
    label.className = 'card-editor-label';
    label.textContent = key === 'trustCard' ? 'TRADING SOFTWARE CARD' : 'BROKER / CTRADER / EMAIL / RISK CARD';
    el.appendChild(label);

    dirs.forEach(dir => {
      const handle = document.createElement('span');
      handle.className = 'card-editor-handle';
      handle.dataset.dir = dir;
      handle.setAttribute('aria-hidden','true');
      el.appendChild(handle);

      handle.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const start = { ...state };
        const minW = 280;
        const minH = 90;

        const move = moveEvent => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          let x = start.x;
          let y = start.y;
          let width = start.width;
          let height = start.height;

          if (dir.includes('e')) width = Math.max(minW, start.width + dx);
          if (dir.includes('s')) height = Math.max(minH, start.height + dy);
          if (dir.includes('w')) {
            const proposed = Math.max(minW, start.width - dx);
            x = start.x + (start.width - proposed);
            width = proposed;
          }
          if (dir.includes('n')) {
            const proposed = Math.max(minH, start.height - dy);
            y = start.y + (start.height - proposed);
            height = proposed;
          }

          Object.assign(state, { x, y, width, height });
          applyState(el, state);
        };

        const end = endEvent => {
          try { handle.releasePointerCapture(endEvent.pointerId); } catch (_error) {}
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
      });
    });

    el.addEventListener('pointerdown', event => {
      if (event.target.closest('.card-editor-handle')) return;
      if (event.target.closest('a,button,input,select,textarea')) return;
      event.preventDefault();
      el.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const baseX = state.x;
      const baseY = state.y;

      const move = moveEvent => {
        state.x = Math.round(baseX + moveEvent.clientX - startX);
        state.y = Math.round(baseY + moveEvent.clientY - startY);
        applyState(el, state);
      };
      const end = endEvent => {
        try { el.releasePointerCapture(endEvent.pointerId); } catch (_error) {}
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', end);
        el.removeEventListener('pointercancel', end);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  });

  const pageGuide = document.createElement('div');
  pageGuide.id = 'landingPageHeightGuide';
  document.body.appendChild(pageGuide);

  const initialPageHeight = Math.max(page?.getBoundingClientRect().height || 0, document.documentElement.clientHeight);
  let pageHeight = toNumber(saved?.pageHeight, initialPageHeight);
  if (page) {
    page.style.height = `${Math.round(pageHeight)}px`;
    page.style.minHeight = `${Math.round(pageHeight)}px`;
  }

  pageGuide.addEventListener('pointerdown', event => {
    event.preventDefault();
    pageGuide.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = pageHeight;
    const move = moveEvent => {
      pageHeight = Math.max(500, startHeight + (moveEvent.clientY - startY));
      if (page) {
        page.style.height = `${Math.round(pageHeight)}px`;
        page.style.minHeight = `${Math.round(pageHeight)}px`;
      }
    };
    const end = endEvent => {
      try { pageGuide.releasePointerCapture(endEvent.pointerId); } catch (_error) {}
      pageGuide.removeEventListener('pointermove', move);
      pageGuide.removeEventListener('pointerup', end);
      pageGuide.removeEventListener('pointercancel', end);
    };
    pageGuide.addEventListener('pointermove', move);
    pageGuide.addEventListener('pointerup', end);
    pageGuide.addEventListener('pointercancel', end);
  });

  const toolbar = document.createElement('div');
  toolbar.id = 'landingCardEditorToolbar';
  toolbar.innerHTML = '<button id="cardEditorSave" type="button">SAVE LAYOUT</button><button id="cardEditorReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);

  const toast = document.createElement('div');
  toast.id = 'cardEditorToast';
  document.body.appendChild(toast);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function capture() {
    const items = {};
    states.forEach((state, key) => {
      items[key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(state.width),
        height: Math.round(state.height)
      };
    });
    return {
      version: 2,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageHeight: Math.round(pageHeight),
      savedAt: new Date().toISOString(),
      items
    };
  }

  document.getElementById('cardEditorSave').addEventListener('click', async () => {
    const payload = capture();
    const text = JSON.stringify(payload, null, 2);
    localStorage.setItem(STORAGE_KEY, text);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Saved and copied. Paste the JSON in ChatGPT.');
    } catch (_error) {
      window.prompt('Copy this layout JSON and paste it in ChatGPT:', text);
    }
  });

  document.getElementById('cardEditorReset').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
})();
