(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('layoutEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_manual_replay_layout_editor_v1';
  const dirs = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const states = new Map();

  const targets = [
    { key: 'topbar', label: 'HEADER', selector: '.topbar', minW: 520, minH: 72 },
    { key: 'replaySetup', label: 'REPLAY SETUP', selector: '.setup-panel', minW: 560, minH: 120 },
    { key: 'chartPanel', label: 'CHART / REPLAY', selector: '.chart-panel', minW: 560, minH: 420 },
    { key: 'tradePanel', label: 'MANUAL ORDER TICKET', selector: '.trade-panel', minW: 260, minH: 360 },
    { key: 'metrics', label: 'PERFORMANCE METRICS', selector: '.metric-grid', minW: 520, minH: 84 },
    { key: 'tradeLog', label: 'MANUAL TRADE LOG', selector: '.log-panel', minW: 560, minH: 180 },
  ];

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (_error) {}

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, 'important');
  }

  function readTransform(el) {
    const matrix = getComputedStyle(el).transform;
    if (!matrix || matrix === 'none') return { x: 0, y: 0 };
    try {
      const parsed = new DOMMatrixReadOnly(matrix);
      return { x: parsed.m41 || 0, y: parsed.m42 || 0 };
    } catch (_error) {
      return { x: 0, y: 0 };
    }
  }

  function numeric(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function applyBox(el, state) {
    setImportant(el, 'box-sizing', 'border-box');
    setImportant(el, 'width', `${Math.round(state.width)}px`);
    setImportant(el, 'height', `${Math.round(state.height)}px`);
    setImportant(el, 'max-width', 'none');
    setImportant(el, 'min-width', '0');
    setImportant(el, 'min-height', '0');
    setImportant(el, 'transform', `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`);
  }

  function chrome(el, config) {
    el.classList.add('manual-layout-edit-target');

    const label = document.createElement('span');
    label.className = 'manual-layout-edit-label';
    label.textContent = config.label;
    el.appendChild(label);

    dirs.forEach((dir) => {
      const handle = document.createElement('span');
      handle.className = 'manual-layout-edit-handle';
      handle.dataset.dir = dir;
      el.appendChild(handle);
    });
  }

  function initTarget(config) {
    const el = document.querySelector(config.selector);
    if (!el || states.has(el)) return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return false;

    const current = readTransform(el);
    const restored = saved?.items?.[config.key];
    const state = {
      key: config.key,
      minW: config.minW,
      minH: config.minH,
      x: numeric(restored?.x, current.x),
      y: numeric(restored?.y, current.y),
      width: numeric(restored?.width, rect.width),
      height: numeric(restored?.height, rect.height),
    };

    states.set(el, state);
    chrome(el, config);
    applyBox(el, state);
    return true;
  }

  function ensureTargets() {
    targets.forEach(initTarget);
  }

  function session(onMove, activeElement) {
    activeElement?.classList.add('manual-layout-edit-active');
    const move = (event) => {
      event.preventDefault();
      onMove(event);
    };
    const end = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      activeElement?.classList.remove('manual-layout-edit-active');
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
  }

  function startMove(event, el, state) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };

    session((moveEvent) => {
      state.x = start.x + moveEvent.clientX - startX;
      state.y = start.y + moveEvent.clientY - startY;
      applyBox(el, state);
    }, el);
  }

  function startResize(event, el, state, dir) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };

    session((moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let x = start.x;
      let y = start.y;
      let width = start.width;
      let height = start.height;

      if (dir.includes('e')) width = Math.max(state.minW, start.width + dx);
      if (dir.includes('s')) height = Math.max(state.minH, start.height + dy);

      if (dir.includes('w')) {
        const next = Math.max(state.minW, start.width - dx);
        x = start.x + start.width - next;
        width = next;
      }

      if (dir.includes('n')) {
        const next = Math.max(state.minH, start.height - dy);
        y = start.y + start.height - next;
        height = next;
      }

      Object.assign(state, { x, y, width, height });
      applyBox(el, state);
    }, el);
  }

  document.addEventListener('pointerdown', (event) => {
    ensureTargets();
    const handle = event.target.closest?.('.manual-layout-edit-handle');
    const label = event.target.closest?.('.manual-layout-edit-label');
    const editTarget = (handle || label)?.closest?.('.manual-layout-edit-target');
    if (!editTarget || !states.has(editTarget)) return;

    const state = states.get(editTarget);
    if (handle) startResize(event, editTarget, state, handle.dataset.dir || 'se');
    else startMove(event, editTarget, state);
  }, true);

  function layoutPayload() {
    const items = {};
    targets.forEach((target) => {
      const el = document.querySelector(target.selector);
      const state = el ? states.get(el) : null;
      if (!state) return;
      items[target.key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(state.width),
        height: Math.round(state.height),
      };
    });
    return {
      version: 1,
      page: 'manual-replay',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      savedAt: new Date().toISOString(),
      items,
    };
  }

  function toast(message) {
    const node = document.getElementById('manualLayoutToast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    window.setTimeout(() => node.classList.remove('show'), 2600);
  }

  function exitEditor() {
    const url = new URL(window.location.href);
    url.searchParams.delete('layoutEdit');
    window.location.href = url.toString();
  }

  const toolbar = document.createElement('div');
  toolbar.id = 'manualLayoutToolbar';
  toolbar.innerHTML = [
    '<strong>MANUAL REPLAY LAYOUT EDITOR</strong>',
    '<button id="manualLayoutSave" type="button">SAVE LAYOUT</button>',
    '<button id="manualLayoutReset" type="button">RESET</button>',
    '<button id="manualLayoutExit" type="button">EXIT EDITOR</button>',
  ].join('');
  document.body.appendChild(toolbar);

  const toastNode = document.createElement('div');
  toastNode.id = 'manualLayoutToast';
  document.body.appendChild(toastNode);

  document.getElementById('manualLayoutSave')?.addEventListener('click', async () => {
    ensureTargets();
    const payload = layoutPayload();
    const serialized = JSON.stringify(payload, null, 2);
    localStorage.setItem(STORAGE_KEY, serialized);
    try {
      await navigator.clipboard.writeText(serialized);
      toast('Saved + copied. Paste the layout JSON into ChatGPT.');
    } catch (_error) {
      window.prompt('Copy this layout and paste it into ChatGPT:', serialized);
    }
  });

  document.getElementById('manualLayoutReset')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  document.getElementById('manualLayoutExit')?.addEventListener('click', exitEditor);

  document.documentElement.classList.add('manual-replay-layout-editing');
  ensureTargets();
  window.addEventListener('load', ensureTargets, { once: true });
})();
