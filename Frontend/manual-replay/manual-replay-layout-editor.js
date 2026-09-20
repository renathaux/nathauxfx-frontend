(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('layoutEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_manual_replay_layout_editor_v2';
  const dirs = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const states = new Map();
  let activeElement = null;
  let dragging = false;

  const targetSpecs = [
    { prefix: 'header', selector: '.topbar', minW: 520, minH: 72 },
    { prefix: 'brand', selector: '.brand', minW: 120, minH: 42 },
    { prefix: 'brandMark', selector: '.brand-mark', minW: 32, minH: 32 },
    { prefix: 'brandTitle', selector: '.brand strong', minW: 50, minH: 16 },
    { prefix: 'brandSubtitle', selector: '.brand small', minW: 50, minH: 14 },
    { prefix: 'headingBlock', selector: '.heading', minW: 220, minH: 70 },
    { prefix: 'headingEyebrow', selector: '.heading .eyebrow', minW: 70, minH: 14 },
    { prefix: 'headingTitle', selector: '.heading h1', minW: 120, minH: 28 },
    { prefix: 'headingText', selector: '.heading p', minW: 160, minH: 18 },
    { prefix: 'safeBadge', selector: '.safe-badge', minW: 120, minH: 32 },

    { prefix: 'notice', selector: '#notice', minW: 180, minH: 36 },

    { prefix: 'setupPanel', selector: '.setup-panel', minW: 560, minH: 120 },
    { prefix: 'setupTitleBlock', selector: '.setup-panel .panel-title > div:first-child', minW: 160, minH: 40 },
    { prefix: 'setupEyebrow', selector: '.setup-panel .eyebrow', minW: 70, minH: 14 },
    { prefix: 'setupTitle', selector: '.setup-panel h2', minW: 80, minH: 24 },
    { prefix: 'setupNav', selector: '.setup-panel .nav-actions', minW: 180, minH: 36 },
    { prefix: 'setupNavButton', selector: '.setup-panel .nav-actions .button', all: true, minW: 74, minH: 32 },
    { prefix: 'setupGrid', selector: '.setup-grid', minW: 500, minH: 70 },
    { prefix: 'setupField', selector: '.setup-grid label', all: true, minW: 90, minH: 54 },
    { prefix: 'setupFieldText', selector: '.setup-grid label > span', all: true, minW: 38, minH: 14 },
    { prefix: 'setupFieldControl', selector: '.setup-grid input, .setup-grid select', all: true, minW: 70, minH: 30 },
    { prefix: 'loadButton', selector: '#loadBtn', minW: 80, minH: 32 },

    { prefix: 'mainGrid', selector: '.main-grid', minW: 720, minH: 460 },
    { prefix: 'chartPanel', selector: '.chart-panel', minW: 560, minH: 420 },
    { prefix: 'chartToolbar', selector: '.chart-toolbar', minW: 500, minH: 62 },
    { prefix: 'chartTitleBlock', selector: '.chart-toolbar > div:first-child', minW: 180, minH: 56 },
    { prefix: 'chartEyebrow', selector: '.chart-toolbar .eyebrow', minW: 70, minH: 14 },
    { prefix: 'chartTitle', selector: '#chartTitle', minW: 100, minH: 24 },
    { prefix: 'chartMeta', selector: '#chartMeta', minW: 140, minH: 18 },
    { prefix: 'playback', selector: '.playback', minW: 260, minH: 40 },
    { prefix: 'playbackItem', selector: '.playback > *', all: true, minW: 26, minH: 26 },
    { prefix: 'positionTools', selector: '.position-tools', minW: 260, minH: 36 },
    { prefix: 'positionTool', selector: '.position-tools > *', all: true, minW: 80, minH: 30 },
    { prefix: 'chartWrap', selector: '.chart-wrap', minW: 420, minH: 260 },
    { prefix: 'candleStrip', selector: '.candle-strip', minW: 260, minH: 30 },
    { prefix: 'currentPrice', selector: '#currentPrice', minW: 54, minH: 20 },
    { prefix: 'currentTime', selector: '#currentTime', minW: 90, minH: 16 },
    { prefix: 'ohlc', selector: '#ohlc', minW: 160, minH: 16 },

    { prefix: 'tradePanel', selector: '.trade-panel', minW: 260, minH: 360 },
    { prefix: 'tradeEyebrow', selector: '.trade-panel > .eyebrow', minW: 80, minH: 14 },
    { prefix: 'tradeTitle', selector: '.trade-panel > h2', minW: 70, minH: 24 },
    { prefix: 'tradeIntro', selector: '.trade-panel > p', minW: 140, minH: 18 },
    { prefix: 'ticketGrid', selector: '.ticket-grid', minW: 200, minH: 250 },
    { prefix: 'ticketField', selector: '.ticket-grid label', all: true, minW: 120, minH: 54 },
    { prefix: 'ticketFieldText', selector: '.ticket-grid label > span', all: true, minW: 48, minH: 14 },
    { prefix: 'ticketFieldControl', selector: '.ticket-grid input, .ticket-grid select', all: true, minW: 80, minH: 30 },
    { prefix: 'draftMetrics', selector: '.draft-metrics', minW: 180, minH: 54 },
    { prefix: 'draftMetricCard', selector: '.draft-metrics > div', all: true, minW: 52, minH: 44 },
    { prefix: 'draftMetricLabel', selector: '.draft-metrics > div > span', all: true, minW: 28, minH: 12 },
    { prefix: 'draftMetricValue', selector: '.draft-metrics > div > strong', all: true, minW: 28, minH: 16 },
    { prefix: 'priceHint', selector: '#pricePickHint', minW: 160, minH: 34 },
    { prefix: 'sideButtons', selector: '.side-buttons', minW: 160, minH: 38 },
    { prefix: 'buyButton', selector: '#buyBtn', minW: 70, minH: 34 },
    { prefix: 'sellButton', selector: '#sellBtn', minW: 70, minH: 34 },
    { prefix: 'positionCard', selector: '#positionCard', minW: 180, minH: 160 },
    { prefix: 'positionHead', selector: '#positionCard .position-head', minW: 120, minH: 24 },
    { prefix: 'positionHeadItem', selector: '#positionCard .position-head > *', all: true, minW: 30, minH: 14 },
    { prefix: 'positionRow', selector: '#positionCard .position-row', all: true, minW: 120, minH: 24 },
    { prefix: 'positionRowItem', selector: '#positionCard .position-row > *', all: true, minW: 28, minH: 14 },
    { prefix: 'closeButton', selector: '#closeBtn', minW: 110, minH: 34 },
    { prefix: 'resetButton', selector: '#resetBtn', minW: 110, minH: 34 },

    { prefix: 'metricGrid', selector: '.metric-grid', minW: 520, minH: 84 },
    { prefix: 'metricCard', selector: '.metric-grid article', all: true, minW: 90, minH: 62 },
    { prefix: 'metricLabel', selector: '.metric-grid article span', all: true, minW: 40, minH: 12 },
    { prefix: 'metricValue', selector: '.metric-grid article strong', all: true, minW: 40, minH: 18 },

    { prefix: 'logPanel', selector: '.log-panel', minW: 560, minH: 180 },
    { prefix: 'logTitleBlock', selector: '.log-panel .panel-title > div', minW: 160, minH: 40 },
    { prefix: 'logEyebrow', selector: '.log-panel .eyebrow', minW: 70, minH: 14 },
    { prefix: 'logTitle', selector: '.log-panel h2', minW: 100, minH: 24 },
    { prefix: 'tableWrap', selector: '.log-panel .table-wrap', minW: 420, minH: 120 },
    { prefix: 'tradeTable', selector: '.log-panel table', minW: 520, minH: 100 },
    { prefix: 'tradeTableHeader', selector: '.log-panel th', all: true, minW: 36, minH: 24 },
    { prefix: 'tradeTableCell', selector: '.log-panel td', all: true, minW: 36, minH: 24 },
  ];

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (_error) {}

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, 'important');
  }

  function numeric(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function stableKey(prefix, el, index) {
    if (el.id) return `${prefix}#${el.id}`;
    return `${prefix}[${index}]`;
  }

  function registerElement(el, spec, index) {
    if (!el || states.has(el)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const key = stableKey(spec.prefix, el, index);
    const restored = saved?.items?.[key];
    const state = {
      key,
      minW: spec.minW || 20,
      minH: spec.minH || 14,
      x: numeric(restored?.x, 0),
      y: numeric(restored?.y, 0),
      width: numeric(restored?.width, rect.width),
      height: numeric(restored?.height, rect.height),
      touched: Boolean(restored),
      label: spec.prefix,
    };

    states.set(el, state);
    el.dataset.manualLayoutEditable = '1';
    el.dataset.manualLayoutKey = key;
    el.classList.add('manual-layout-editable');

    if (getComputedStyle(el).display === 'inline') {
      setImportant(el, 'display', 'inline-block');
    }

    if (restored) applyState(el, state);
  }

  function ensureTargets() {
    targetSpecs.forEach((spec) => {
      const elements = spec.all
        ? Array.from(document.querySelectorAll(spec.selector))
        : [document.querySelector(spec.selector)].filter(Boolean);
      elements.forEach((el, index) => registerElement(el, spec, index));
    });
  }

  function applyState(el, state) {
    setImportant(el, 'box-sizing', 'border-box');
    setImportant(el, 'width', `${Math.round(state.width)}px`);
    setImportant(el, 'height', `${Math.round(state.height)}px`);
    setImportant(el, 'max-width', 'none');
    setImportant(el, 'min-width', '0');
    setImportant(el, 'min-height', '0');
    setImportant(el, 'transform', `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`);
    state.touched = true;
    syncFrame();
  }

  function findEditableFromNode(node) {
    let current = node instanceof Element ? node : node?.parentElement;
    while (current && current !== document.body) {
      if (states.has(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function frameLabel(el) {
    const state = states.get(el);
    if (!state) return 'EDIT';
    const id = el.id ? ` #${el.id}` : '';
    return `${state.label}${id}`;
  }

  const frame = document.createElement('div');
  frame.id = 'manualLayoutHoverFrame';
  frame.innerHTML = `
    <div id="manualLayoutHoverLabel"></div>
    ${dirs.map((dir) => `<span class="manual-layout-hover-handle" data-dir="${dir}"></span>`).join('')}
  `;
  document.body.appendChild(frame);

  function setActive(el) {
    if (dragging) return;
    if (activeElement === el) {
      syncFrame();
      return;
    }
    activeElement = el || null;
    if (!activeElement) {
      frame.classList.remove('show');
      return;
    }
    document.getElementById('manualLayoutHoverLabel').textContent = frameLabel(activeElement);
    frame.classList.add('show');
    syncFrame();
  }

  function syncFrame() {
    if (!activeElement || !document.documentElement.contains(activeElement)) {
      if (!dragging) setActive(null);
      return;
    }
    const rect = activeElement.getBoundingClientRect();
    frame.style.left = `${Math.round(rect.left)}px`;
    frame.style.top = `${Math.round(rect.top)}px`;
    frame.style.width = `${Math.max(1, Math.round(rect.width))}px`;
    frame.style.height = `${Math.max(1, Math.round(rect.height))}px`;
  }

  function beginSession(onMove, el) {
    dragging = true;
    activeElement = el;
    frame.classList.add('show', 'active');
    syncFrame();

    const move = (event) => {
      event.preventDefault();
      onMove(event);
      syncFrame();
    };
    const end = () => {
      dragging = false;
      frame.classList.remove('active');
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      syncFrame();
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
  }

  function startMove(event, el) {
    const state = states.get(el);
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const rect = el.getBoundingClientRect();
    if (!state.touched) {
      state.width = rect.width;
      state.height = rect.height;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };

    beginSession((moveEvent) => {
      state.x = start.x + moveEvent.clientX - startX;
      state.y = start.y + moveEvent.clientY - startY;
      applyState(el, state);
    }, el);
  }

  function startResize(event, el, dir) {
    const state = states.get(el);
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const rect = el.getBoundingClientRect();
    if (!state.touched) {
      state.width = rect.width;
      state.height = rect.height;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...state };

    beginSession((moveEvent) => {
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
      applyState(el, state);
    }, el);
  }

  document.addEventListener('pointermove', (event) => {
    if (dragging) return;
    if (event.target.closest?.('#manualLayoutToolbar')) {
      setActive(null);
      return;
    }
    if (event.target.closest?.('#manualLayoutHoverFrame')) {
      syncFrame();
      return;
    }
    ensureTargets();
    setActive(findEditableFromNode(event.target));
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest?.('#manualLayoutToolbar')) return;

    const handle = event.target.closest?.('.manual-layout-hover-handle');
    if (handle && activeElement) {
      return startResize(event, activeElement, handle.dataset.dir || 'se');
    }

    ensureTargets();
    const el = findEditableFromNode(event.target);
    if (!el) return;

    // In layout-edit mode the middle of every editable item is a drag surface.
    // This intentionally overrides button/input/chart interaction until the
    // user exits the editor.
    setActive(el);
    startMove(event, el);
  }, true);

  // Layout edit mode must be completely non-interactive. Browsers can still
  // synthesize a click after pointerup even when pointerdown was used for drag,
  // so stop every normal page action at capture time. The editor toolbar is the
  // only interactive exception.
  function blockNormalEditorAction(event) {
    if (event.target.closest?.('#manualLayoutToolbar')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  ['click', 'auxclick', 'dblclick'].forEach((type) => {
    document.addEventListener(type, blockNormalEditorAction, true);
  });

  document.addEventListener('submit', blockNormalEditorAction, true);

  document.addEventListener('keydown', (event) => {
    if (event.target.closest?.('#manualLayoutToolbar')) return;
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'Spacebar'
    ) {
      blockNormalEditorAction(event);
    }
  }, true);

  window.addEventListener('scroll', syncFrame, true);
  window.addEventListener('resize', syncFrame);

  const observer = new MutationObserver(() => {
    ensureTargets();
    syncFrame();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  function layoutPayload() {
    const items = {};
    for (const [el, state] of states.entries()) {
      if (!state.touched) continue;
      items[state.key] = {
        x: Math.round(state.x),
        y: Math.round(state.y),
        width: Math.round(state.width),
        height: Math.round(state.height),
      };
    }
    return {
      version: 2,
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
    '<span class="manual-layout-help">Hover an item → handles appear. Drag from the middle to move it.</span>',
    '<button id="manualLayoutSave" type="button">SAVE LAYOUT</button>',
    '<button id="manualLayoutReset" type="button">RESET</button>',
    '<button id="manualLayoutExit" type="button">EXIT EDITOR</button>',
  ].join('');
  document.body.appendChild(toolbar);

  const toastNode = document.createElement('div');
  toastNode.id = 'manualLayoutToast';
  document.body.appendChild(toastNode);

  document.getElementById('manualLayoutSave')?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
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

  document.getElementById('manualLayoutReset')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  document.getElementById('manualLayoutExit')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    exitEditor();
  });

  document.documentElement.classList.add('manual-replay-layout-editing');
  ensureTargets();
  window.addEventListener('load', ensureTargets, { once: true });
})();