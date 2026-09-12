(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('layoutEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_landing_layout_draft_v1';
  const targets = [
    ['logo', '.landing-logo'],
    ['navLinks', '.landing-links'],
    ['navActions', '.landing-nav-actions'],
    ['heroPill', '.hero-pill'],
    ['heroTitle', '.hero-left h1'],
    ['heroCopy', '.hero-left > p'],
    ['heroActions', '.hero-actions'],
    ['heroBadges', '.hero-badges'],
    ['heroImage', '.hero-dashboard-img'],
    ['trustCard', '.trust-card'],
    ['heroStats', '.hero-stats'],
    ['mobileFooter', '.mobile-footer']
  ];

  document.documentElement.classList.add('layout-editor-on');

  const style = document.createElement('style');
  style.textContent = `
    .layout-editor-on .layout-editable {
      outline: 1px dashed rgba(47,128,255,.72) !important;
      outline-offset: 3px !important;
      cursor: move !important;
      touch-action: none !important;
      user-select: none !important;
      position: relative !important;
      z-index: 50 !important;
    }
    .layout-editor-on .layout-editable:hover {
      outline: 2px solid rgba(47,128,255,.95) !important;
    }
    .layout-editor-on .layout-editable[data-layout-key="heroImage"] {
      max-width: none !important;
      border: 0 !important;
      box-shadow: none !important;
      transform: none !important;
      height: auto !important;
    }
    .layout-editor-handle {
      position: absolute !important;
      right: -8px !important;
      bottom: -8px !important;
      width: 18px !important;
      height: 18px !important;
      border-radius: 5px !important;
      border: 2px solid #fff !important;
      background: #2f80ff !important;
      box-shadow: 0 3px 12px rgba(0,0,0,.45) !important;
      cursor: nwse-resize !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
    }
    #landingLayoutToolbar {
      position: fixed !important;
      left: 50% !important;
      bottom: 18px !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 10px !important;
      border: 1px solid rgba(96,165,250,.5) !important;
      border-radius: 14px !important;
      background: rgba(5,12,23,.94) !important;
      box-shadow: 0 18px 50px rgba(0,0,0,.55) !important;
      backdrop-filter: blur(14px) !important;
    }
    #landingLayoutToolbar button {
      height: 42px !important;
      padding: 0 18px !important;
      border-radius: 10px !important;
      border: 1px solid #315d96 !important;
      background: #10213a !important;
      color: #fff !important;
      font: 800 13px/1 Arial,sans-serif !important;
      cursor: pointer !important;
    }
    #landingLayoutToolbar #landingLayoutSave {
      background: linear-gradient(135deg,#2f80ff,#1557ff) !important;
      border-color: #3b82f6 !important;
    }
    #landingLayoutToast {
      position: fixed !important;
      left: 50% !important;
      bottom: 78px !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      padding: 9px 14px !important;
      border-radius: 999px !important;
      background: rgba(11,22,38,.96) !important;
      color: #dbeafe !important;
      border: 1px solid #294d7d !important;
      font: 700 12px/1.2 Arial,sans-serif !important;
      opacity: 0;
      pointer-events: none;
      transition: opacity .18s ease;
    }
    #landingLayoutToast.show { opacity: 1; }
  `;
  document.head.appendChild(style);

  const state = {};
  const elements = new Map();

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function applyState(el, saved = {}) {
    const x = number(saved.x, 0);
    const y = number(saved.y, 0);
    el.dataset.layoutX = String(x);
    el.dataset.layoutY = String(y);
    el.style.translate = `${x}px ${y}px`;
    if (saved.width) {
      el.style.width = `${number(saved.width)}px`;
      el.style.maxWidth = 'none';
    }
    if (saved.height && el.dataset.layoutKey !== 'heroImage') {
      el.style.height = `${number(saved.height)}px`;
    }
  }

  let savedDraft = null;
  try {
    savedDraft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (_error) {}

  targets.forEach(([key, selector]) => {
    const el = document.querySelector(selector);
    if (!el) return;
    elements.set(key, el);
    el.classList.add('layout-editable');
    el.dataset.layoutKey = key;
    el.draggable = false;
    el.addEventListener('dragstart', event => event.preventDefault());

    const handle = document.createElement('span');
    handle.className = 'layout-editor-handle';
    handle.setAttribute('aria-hidden', 'true');
    el.appendChild(handle);

    applyState(el, savedDraft?.items?.[key]);

    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const rect = el.getBoundingClientRect();
      const startW = rect.width;
      const startH = rect.height;
      handle.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const width = Math.max(40, startW + dx);
        el.style.width = `${width}px`;
        el.style.maxWidth = 'none';
        if (key !== 'heroImage') {
          el.style.height = `${Math.max(24, startH + dy)}px`;
        }
      };
      const end = endEvent => {
        handle.releasePointerCapture?.(endEvent.pointerId);
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });

    el.addEventListener('pointerdown', event => {
      if (event.target.closest('.layout-editor-handle')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const baseX = number(el.dataset.layoutX, 0);
      const baseY = number(el.dataset.layoutY, 0);
      el.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        const x = baseX + moveEvent.clientX - startX;
        const y = baseY + moveEvent.clientY - startY;
        el.dataset.layoutX = String(Math.round(x));
        el.dataset.layoutY = String(Math.round(y));
        el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
      };
      const end = endEvent => {
        el.releasePointerCapture?.(endEvent.pointerId);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', end);
        el.removeEventListener('pointercancel', end);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#landingLayoutToolbar')) return;
    if (event.target.closest('.layout-editable')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const toolbar = document.createElement('div');
  toolbar.id = 'landingLayoutToolbar';
  toolbar.innerHTML = '<button id="landingLayoutSave" type="button">SAVE LAYOUT</button><button id="landingLayoutReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);

  const toast = document.createElement('div');
  toast.id = 'landingLayoutToast';
  document.body.appendChild(toast);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function capture() {
    const items = {};
    elements.forEach((el, key) => {
      const rect = el.getBoundingClientRect();
      items[key] = {
        x: Math.round(number(el.dataset.layoutX, 0)),
        y: Math.round(number(el.dataset.layoutY, 0)),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });
    return {
      version: 1,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items
    };
  }

  document.getElementById('landingLayoutSave').addEventListener('click', async () => {
    const payload = capture();
    const text = JSON.stringify(payload, null, 2);
    localStorage.setItem(STORAGE_KEY, text);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Saved. Layout JSON copied — paste it in ChatGPT.');
    } catch (_error) {
      window.prompt('Saved. Copy this layout JSON and paste it in ChatGPT:', text);
    }
  });

  document.getElementById('landingLayoutReset').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
})();
