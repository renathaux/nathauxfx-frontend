(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('layoutEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_mobile_manual_replay_layout_editor_v1';
  const dirs = ['nw','n','ne','e','se','s','sw','w'];
  const states = new Map();
  let active = null;
  let dragging = false;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/manual-replay/manual-replay-layout-editor.css?v=1';
  document.head.appendChild(style);

  const mobileEditorStyle = document.createElement('style');
  mobileEditorStyle.textContent = `
    #manualLayoutToolbar{
      left:auto!important;
      right:8px!important;
      bottom:8px!important;
      max-width:calc(100vw - 16px)!important;
      padding:7px!important;
      gap:6px!important;
      flex-wrap:nowrap!important;
      border-radius:10px!important;
    }
    #manualLayoutToolbar strong{
      font-size:9px!important;
      white-space:nowrap!important;
      width:auto!important;
      margin-right:0!important;
    }
    #manualLayoutToolbar .manual-layout-help{display:none!important}
    #manualLayoutToolbar button{
      min-height:32px!important;
      padding:6px 9px!important;
      font-size:11px!important;
      white-space:nowrap!important;
    }
    #manualLayoutToolbar.mobile-layout-toolbar-hidden{display:none!important}
    #mobileLayoutLauncher{
      position:fixed!important;
      right:8px!important;
      bottom:8px!important;
      z-index:2147483647!important;
      height:36px!important;
      min-width:48px!important;
      padding:0 10px!important;
      border:1px solid #3979bf!important;
      border-radius:9px!important;
      background:#07192c!important;
      color:#e7f1ff!important;
      font:800 11px/1 Arial,sans-serif!important;
      box-shadow:0 6px 20px rgba(0,0,0,.5)!important;
    }
    #mobileLayoutLauncher.hidden{display:none!important}
    @media(max-width:520px){
      #manualLayoutToolbar strong{display:none!important}
      #manualLayoutToolbar{right:6px!important;bottom:6px!important;gap:4px!important;padding:5px!important}
      #manualLayoutToolbar button{min-height:30px!important;padding:5px 7px!important;font-size:10px!important}
      #mobileLayoutLauncher{right:6px!important;bottom:6px!important;height:32px!important;min-width:44px!important}
    }
  `;
  document.head.appendChild(mobileEditorStyle);

  const specs = [
    {name:'topbar', selector:'.topbar', minW:260, minH:34},
    {name:'topIcon', selector:'.top-icon', all:true, minW:28, minH:28},
    {name:'brand', selector:'.brand', minW:120, minH:30},
    {name:'brandMark', selector:'.brand-mark', minW:22, minH:22},
    {name:'brandName', selector:'.brand-name', minW:80, minH:20},
    {name:'marketbar', selector:'.marketbar', minW:260, minH:36},
    {name:'marketName', selector:'#marketName', minW:90, minH:14},
    {name:'symbolBox', selector:'.bare-select', minW:110, minH:28},
    {name:'tfBox', selector:'.tf-select', minW:56, minH:28},
    {name:'replayIndicator', selector:'.replay-indicator', minW:80, minH:20},
    {name:'chartShell', selector:'.chart-shell', minW:280, minH:240},
    {name:'ohlc', selector:'.ohlc', minW:150, minH:16},
    {name:'replayControls', selector:'.replay-controls', minW:260, minH:30},
    {name:'replayControl', selector:'.replay-controls > *', all:true, minW:28, minH:26},
    {name:'tradeStrip', selector:'.trade-strip', minW:280, minH:42},
    {name:'positionButton', selector:'.position-btn', all:true, minW:90, minH:42},
    {name:'lotControl', selector:'.lot-control', minW:86, minH:42},
    {name:'lotButton', selector:'.lot-control button', all:true, minW:22, minH:22},
    {name:'lotInput', selector:'.lot-control input', minW:36, minH:22},
    {name:'bottomNav', selector:'.bottom-nav', minW:280, minH:44},
    {name:'navButton', selector:'.bottom-nav button', all:true, minW:56, minH:40},
    {name:'edgeHandle', selector:'.edge-handle', all:true, minW:18, minH:34}
  ];

  let saved = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch (_) {}

  function keyFor(spec, el, index) {
    if (el.id) return spec.name + '#' + el.id;
    return spec.name + '[' + index + ']';
  }

  function register() {
    specs.forEach(spec => {
      const els = spec.all ? [...document.querySelectorAll(spec.selector)] : [document.querySelector(spec.selector)].filter(Boolean);
      els.forEach((el,index) => {
        if (states.has(el)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;
        const key = keyFor(spec,el,index);
        const restored = saved?.items?.[key];
        const state = {
          key,
          label: spec.name,
          minW: spec.minW || 20,
          minH: spec.minH || 20,
          x: Number(restored?.x || 0),
          y: Number(restored?.y || 0),
          width: Number(restored?.width || rect.width),
          height: Number(restored?.height || rect.height),
          touched: Boolean(restored)
        };
        states.set(el,state);
        el.dataset.mobileLayoutEditable = '1';
        if (restored) apply(el,state);
      });
    });
  }

  function apply(el,state) {
    el.style.setProperty('box-sizing','border-box','important');
    el.style.setProperty('width',Math.round(state.width)+'px','important');
    el.style.setProperty('height',Math.round(state.height)+'px','important');
    el.style.setProperty('min-width','0','important');
    el.style.setProperty('min-height','0','important');
    el.style.setProperty('max-width','none','important');
    el.style.setProperty('transform',`translate3d(${Math.round(state.x)}px,${Math.round(state.y)}px,0)`,'important');
    state.touched = true;
  }

  const frame = document.createElement('div');
  frame.id = 'manualLayoutHoverFrame';
  frame.innerHTML = `
    <div id="manualLayoutHoverLabel"></div>
    ${dirs.map(dir => `<span class="manual-layout-hover-handle" data-dir="${dir}"></span>`).join('')}
  `;
  document.body.appendChild(frame);

  function syncFrame() {
    if (!active || !document.documentElement.contains(active)) {
      frame.classList.remove('show','active');
      return;
    }
    const rect = active.getBoundingClientRect();
    frame.style.left = Math.round(rect.left)+'px';
    frame.style.top = Math.round(rect.top)+'px';
    frame.style.width = Math.max(1,Math.round(rect.width))+'px';
    frame.style.height = Math.max(1,Math.round(rect.height))+'px';
  }

  function select(el) {
    active = el || null;
    if (!active) {
      frame.classList.remove('show');
      return;
    }
    const state = states.get(active);
    document.getElementById('manualLayoutHoverLabel').textContent = state?.label || 'EDIT';
    frame.classList.add('show');
    syncFrame();
  }

  function targetFrom(node) {
    let el = node instanceof Element ? node : node?.parentElement;
    while (el && el !== document.body) {
      if (states.has(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function begin(pointerEvent, el, mode, dir='se') {
    const state = states.get(el);
    if (!state) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    pointerEvent.stopImmediatePropagation();

    dragging = true;
    select(el);
    frame.classList.add('active');

    const startX = pointerEvent.clientX;
    const startY = pointerEvent.clientY;
    const start = {...state};

    const move = event => {
      event.preventDefault();
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (mode === 'move') {
        state.x = start.x + dx;
        state.y = start.y + dy;
      } else {
        let x = start.x;
        let y = start.y;
        let width = start.width;
        let height = start.height;

        if (dir.includes('e')) width = Math.max(state.minW,start.width + dx);
        if (dir.includes('s')) height = Math.max(state.minH,start.height + dy);

        if (dir.includes('w')) {
          const next = Math.max(state.minW,start.width - dx);
          x = start.x + start.width - next;
          width = next;
        }
        if (dir.includes('n')) {
          const next = Math.max(state.minH,start.height - dy);
          y = start.y + start.height - next;
          height = next;
        }
        Object.assign(state,{x,y,width,height});
      }

      apply(el,state);
      syncFrame();
    };

    const end = () => {
      dragging = false;
      frame.classList.remove('active');
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',end,true);
      window.removeEventListener('pointercancel',end,true);
      syncFrame();
    };

    window.addEventListener('pointermove',move,true);
    window.addEventListener('pointerup',end,true);
    window.addEventListener('pointercancel',end,true);
  }

  document.addEventListener('pointerdown', event => {
    if (event.target.closest?.('#manualLayoutToolbar')) return;
    if (event.target.closest?.('#mobileLayoutLauncher')) return;

    const handle = event.target.closest?.('.manual-layout-hover-handle');
    if (handle && active) {
      begin(event,active,'resize',handle.dataset.dir || 'se');
      return;
    }

    register();
    const el = targetFrom(event.target);
    if (!el) {
      select(null);
      return;
    }
    begin(event,el,'move');
  },true);

  function block(event) {
    if (event.target.closest?.('#manualLayoutToolbar')) return;
    if (event.target.closest?.('#mobileLayoutLauncher')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  ['click','dblclick','auxclick','submit'].forEach(type => document.addEventListener(type,block,true));
  window.addEventListener('scroll',syncFrame,true);
  window.addEventListener('resize',syncFrame);

  function payload() {
    const items = {};
    for (const [,state] of states) {
      if (!state.touched) continue;
      items[state.key] = {
        x:Math.round(state.x),
        y:Math.round(state.y),
        width:Math.round(state.width),
        height:Math.round(state.height)
      };
    }
    return {
      version:1,
      page:'mobile-manual-replay',
      viewport:{width:window.innerWidth,height:window.innerHeight},
      savedAt:new Date().toISOString(),
      items
    };
  }

  function toast(message) {
    let node = document.getElementById('manualLayoutToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'manualLayoutToast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'),2200);
  }

  const toolbar = document.createElement('div');
  toolbar.id = 'manualLayoutToolbar';
  toolbar.innerHTML = [
    '<strong>MOBILE UI EDITOR</strong>',
    '<span class="manual-layout-help">Touch/drag any box to move it. Use the blue handles to resize it.</span>',
    '<button id="mobileLayoutSave" type="button">SAVE + COPY</button>',
    '<button id="mobileLayoutReset" type="button">RESET</button>',
    '<button id="mobileLayoutHide" type="button">HIDE</button>',
    '<button id="mobileLayoutExit" type="button">EXIT</button>'
  ].join('');
  document.body.appendChild(toolbar);

  const launcher = document.createElement('button');
  launcher.id = 'mobileLayoutLauncher';
  launcher.type = 'button';
  launcher.textContent = 'EDIT';
  document.body.appendChild(launcher);

  function setToolbarOpen(open) {
    toolbar.classList.toggle('mobile-layout-toolbar-hidden', !open);
    launcher.classList.toggle('hidden', open);
  }

  // Keep the page clear for editing by default. The small EDIT button
  // reopens Save / Reset / Exit only when needed.
  setToolbarOpen(false);

  document.getElementById('mobileLayoutSave').onclick = async event => {
    event.preventDefault();
    event.stopPropagation();
    register();
    const data = JSON.stringify(payload(),null,2);
    localStorage.setItem(STORAGE_KEY,data);
    try {
      await navigator.clipboard.writeText(data);
      toast('Saved + copied. Paste the JSON into ChatGPT.');
    } catch (_) {
      window.prompt('Copy this layout and paste it into ChatGPT:',data);
    }
  };

  document.getElementById('mobileLayoutReset').onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  document.getElementById('mobileLayoutHide').onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    setToolbarOpen(false);
  };

  launcher.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    setToolbarOpen(true);
  };

  document.getElementById('mobileLayoutExit').onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.delete('layoutEdit');
    window.location.href = url.toString();
  };

  document.documentElement.classList.add('manual-replay-layout-editing');
  register();
  requestAnimationFrame(register);
})();