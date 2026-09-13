(function(){
  if (window.innerWidth > 700) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mobileEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v2';
  const cuts = [
    { key:'heroArea', label:'HERO AREA', selector:'.hero-section', minH:140 },
    { key:'trustArea', label:'TRUST AREA', selector:'.trust-section', minH:70 },
    { key:'trustCardArea', label:'TRUST CARD', selector:'.trust-card', minH:70 },
    { key:'statsArea', label:'STATS AREA', selector:'.hero-stats', minH:70 }
  ];

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_e) {}

  const states = new Map();

  const style = document.createElement('style');
  style.id = 'mobilePageCutEditorStyle';
  style.textContent = `
    .mobile-page-cut-overlay{
      position:fixed!important;
      z-index:2147483500!important;
      pointer-events:none!important;
      border-top:2px dashed rgba(73,164,255,.85)!important;
      border-bottom:2px dashed rgba(73,164,255,.85)!important;
      box-sizing:border-box!important;
    }
    .mobile-page-cut-tag{
      position:absolute!important;
      right:8px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      padding:4px 7px!important;
      border:1px solid #7cc0ff!important;
      border-radius:6px!important;
      background:#061425!important;
      color:#eaf4ff!important;
      font:700 10px/1.2 Arial,sans-serif!important;
      white-space:nowrap!important;
      pointer-events:none!important;
    }
    .mobile-page-cut-handle{
      position:absolute!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      width:112px!important;
      height:24px!important;
      border:2px solid #fff!important;
      border-radius:7px!important;
      background:#2563eb!important;
      color:#fff!important;
      font:800 10px/20px Arial,sans-serif!important;
      text-align:center!important;
      box-sizing:border-box!important;
      pointer-events:auto!important;
      touch-action:none!important;
      user-select:none!important;
      -webkit-user-select:none!important;
      cursor:ns-resize!important;
      box-shadow:0 3px 12px rgba(0,0,0,.35)!important;
    }
    .mobile-page-cut-handle[data-edge="top"]{top:-12px!important}
    .mobile-page-cut-handle[data-edge="bottom"]{bottom:-12px!important}
  `;
  document.head.appendChild(style);

  function px(value){
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function applyState(state){
    const el = state.el;
    const topCut = Math.max(0, state.topCut);
    const bottomCut = Math.max(0, state.bottomCut);
    const height = Math.max(state.minH, state.baseHeight - bottomCut);

    el.style.setProperty('box-sizing','border-box','important');
    el.style.setProperty('height',Math.round(height)+'px','important');
    el.style.setProperty('min-height','0','important');
    el.style.setProperty('max-height','none','important');
    el.style.setProperty('margin-top',(state.baseMarginTop - topCut)+'px','important');
    el.style.setProperty('padding-top',(state.basePaddingTop + topCut)+'px','important');
    el.style.setProperty('overflow','visible','important');
  }

  function makeOverlay(state){
    const overlay = document.createElement('div');
    overlay.className = 'mobile-page-cut-overlay';
    overlay.innerHTML = `
      <span class="mobile-page-cut-handle" data-edge="top">CUT TOP</span>
      <span class="mobile-page-cut-tag">${state.label}</span>
      <span class="mobile-page-cut-handle" data-edge="bottom">CUT BOTTOM</span>
    `;
    document.body.appendChild(overlay);
    state.overlay = overlay;

    overlay.querySelectorAll('.mobile-page-cut-handle').forEach(handle=>{
      handle.addEventListener('pointerdown',event=>{
        event.preventDefault();
        event.stopPropagation();
        const edge = handle.dataset.edge;
        const sy = event.clientY;
        const startTop = state.topCut;
        const startBottom = state.bottomCut;

        const move = e=>{
          e.preventDefault();
          const dy = e.clientY - sy;
          if (edge === 'top') {
            state.topCut = Math.max(0, startTop + dy);
          } else {
            state.bottomCut = Math.max(0, startBottom - dy);
          }
          const maxBottom = Math.max(0, state.baseHeight - state.minH);
          state.bottomCut = Math.min(maxBottom, state.bottomCut);
          applyState(state);
        };
        const end = ()=>{
          window.removeEventListener('pointermove',move,true);
          window.removeEventListener('pointerup',end,true);
          window.removeEventListener('pointercancel',end,true);
        };
        window.addEventListener('pointermove',move,true);
        window.addEventListener('pointerup',end,true);
        window.addEventListener('pointercancel',end,true);
      },true);
    });
  }

  cuts.forEach(config=>{
    const el = document.querySelector(config.selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    const restored = saved?.pageCuts?.[config.key] || {};
    const state = {
      ...config,
      el,
      baseHeight: Math.max(config.minH, rect.height),
      baseMarginTop: px(css.marginTop),
      basePaddingTop: px(css.paddingTop),
      topCut: Math.max(0, Number(restored.topCut) || 0),
      bottomCut: Math.max(0, Number(restored.bottomCut) || 0),
      overlay: null
    };
    states.set(config.key,state);
    applyState(state);
    makeOverlay(state);
  });

  function sync(){
    states.forEach(state=>{
      if (!state.el.isConnected || !state.overlay) return;
      const rect = state.el.getBoundingClientRect();
      state.overlay.style.left = Math.max(4,rect.left) + 'px';
      state.overlay.style.top = rect.top + 'px';
      state.overlay.style.width = Math.max(80,Math.min(window.innerWidth-8,rect.width)) + 'px';
      state.overlay.style.height = Math.max(24,rect.height) + 'px';
      state.overlay.style.display = rect.bottom < -40 || rect.top > window.innerHeight + 40 ? 'none' : 'block';
    });
    requestAnimationFrame(sync);
  }
  requestAnimationFrame(sync);

  const saveButton = document.getElementById('mobileLandingSave');
  if (saveButton) {
    saveButton.addEventListener('click',()=>{
      setTimeout(async()=>{
        let payload = null;
        try { payload = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_e) {}
        if (!payload || typeof payload !== 'object') payload = {items:{}};
        const pageCuts = {};
        states.forEach((state,key)=>{
          pageCuts[key] = {
            topCut: Math.round(state.topCut),
            bottomCut: Math.round(state.bottomCut),
            baseHeight: Math.round(state.baseHeight),
            finalHeight: Math.round(Math.max(state.minH,state.baseHeight-state.bottomCut))
          };
        });
        payload.version = 10;
        payload.scope = 'mobile-only-text-and-page-cut-editor';
        payload.pageCuts = pageCuts;
        payload.savedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
        const text = JSON.stringify(payload,null,2);
        try { await navigator.clipboard.writeText(text); } catch(_e) { window.prompt('Copy mobile layout:',text); }
      },60);
    });
  }
})();
