(function(){
  'use strict';
  if (window.innerWidth > 700) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mobileEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v2';

  function px(value){
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function start(){
    const page = document.getElementById('landingPage');
    if (!page) return;

    /* Remove the old per-section CUT editor if an old cached script created it. */
    document.querySelectorAll('.mobile-page-cut-overlay').forEach(el=>el.remove());
    document.getElementById('mobilePageCutEditorStyle')?.remove();

    /* Restore normal card chrome if the previous cleanup script was cached. */
    ['.trust-card','.trust-points > .trust-point','.hero-stats','.hero-stats > div:not(.legal-links)'].forEach(selector=>{
      document.querySelectorAll(selector).forEach(el=>{
        ['background','background-image','border','box-shadow','outline'].forEach(prop=>el.style.removeProperty(prop));
      });
    });

    /* Undo the previous automatic page trim before measuring the real page. */
    ['height','min-height','max-height','overflow-y','overflow-x','margin-top'].forEach(prop=>page.style.removeProperty(prop));

    const hero = document.querySelector('.hero-section');
    if (hero) {
      hero.style.removeProperty('margin-top');
      hero.style.removeProperty('padding-top');
    }

    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_e) {}

    const computed = getComputedStyle(page);
    const baseMarginTop = px(computed.marginTop);
    const baseHeight = Math.max(window.innerHeight, page.scrollHeight, page.getBoundingClientRect().height);
    const restored = saved?.pageStretch || {};

    const state = {
      top: Number.isFinite(Number(restored.top)) ? Number(restored.top) : 0,
      bottom: Number.isFinite(Number(restored.bottom)) ? Number(restored.bottom) : 0,
      baseHeight,
      baseMarginTop,
      minHeight: 260
    };

    const style = document.createElement('style');
    style.id = 'mobilePageStretchEditorStyle';
    style.textContent = `
      #mobilePageStretchFrame{position:absolute!important;left:0!important;z-index:2147483490!important;pointer-events:none!important;border-top:2px dashed #49a4ff!important;border-bottom:2px dashed #49a4ff!important;box-sizing:border-box!important}
      .mobile-page-stretch-handle{position:absolute!important;left:50%!important;transform:translateX(-50%)!important;width:138px!important;height:28px!important;border:2px solid #fff!important;border-radius:8px!important;background:#2563eb!important;color:#fff!important;font:800 10px/24px Arial,sans-serif!important;text-align:center!important;box-sizing:border-box!important;pointer-events:auto!important;touch-action:none!important;user-select:none!important;-webkit-user-select:none!important;cursor:ns-resize!important;box-shadow:0 3px 12px rgba(0,0,0,.35)!important}
      .mobile-page-stretch-handle[data-edge="top"]{top:-14px!important}
      .mobile-page-stretch-handle[data-edge="bottom"]{bottom:-14px!important}
      .mobile-page-stretch-label{position:absolute!important;right:8px!important;top:8px!important;padding:4px 7px!important;border:1px solid #7cc0ff!important;border-radius:6px!important;background:#061425!important;color:#eaf4ff!important;font:700 10px/1.2 Arial,sans-serif!important;white-space:nowrap!important}
    `;
    document.head.appendChild(style);

    const frame = document.createElement('div');
    frame.id = 'mobilePageStretchFrame';
    frame.innerHTML = '<span class="mobile-page-stretch-handle" data-edge="top">STRETCH PAGE TOP</span><span class="mobile-page-stretch-label">PAGE</span><span class="mobile-page-stretch-handle" data-edge="bottom">STRETCH PAGE BOTTOM</span>';
    document.body.appendChild(frame);

    function finalHeight(){
      return Math.max(state.minHeight, state.baseHeight + state.bottom - state.top);
    }

    function apply(){
      page.style.setProperty('box-sizing','border-box','important');
      page.style.setProperty('margin-top',(state.baseMarginTop + state.top)+'px','important');
      page.style.setProperty('height',Math.round(finalHeight())+'px','important');
      page.style.setProperty('min-height','0','important');
      page.style.setProperty('max-height','none','important');
      page.style.setProperty('overflow-y','hidden','important');
      page.style.setProperty('overflow-x','visible','important');
    }

    function sync(){
      if (!page.isConnected || !frame.isConnected) return;
      const rect = page.getBoundingClientRect();
      frame.style.top = (window.scrollY + rect.top) + 'px';
      frame.style.width = Math.max(1,Math.min(window.innerWidth,rect.width)) + 'px';
      frame.style.height = Math.max(24,rect.height) + 'px';
      requestAnimationFrame(sync);
    }

    frame.querySelectorAll('.mobile-page-stretch-handle').forEach(handle=>{
      handle.addEventListener('pointerdown',event=>{
        event.preventDefault();
        event.stopPropagation();
        const edge = handle.dataset.edge;
        const sy = event.clientY;
        const startTop = state.top;
        const startBottom = state.bottom;

        const move = e=>{
          e.preventDefault();
          const dy = e.clientY - sy;
          if (edge === 'top') {
            const maxTop = state.baseHeight + startBottom - state.minHeight;
            state.top = Math.min(maxTop, startTop + dy);
          } else {
            const minBottom = state.top - state.baseHeight + state.minHeight;
            state.bottom = Math.max(minBottom, startBottom + dy);
          }
          apply();
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

    apply();
    requestAnimationFrame(sync);

    const saveButton = document.getElementById('mobileLandingSave');
    if (saveButton) {
      saveButton.addEventListener('click',()=>{
        setTimeout(async()=>{
          let payload = null;
          try { payload = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_e) {}
          if (!payload || typeof payload !== 'object') payload = {items:{}};
          payload.version = 11;
          payload.scope = 'mobile-only-text-and-page-stretch-editor';
          payload.pageStretch = {
            top: Math.round(state.top),
            bottom: Math.round(state.bottom),
            baseHeight: Math.round(state.baseHeight),
            finalHeight: Math.round(finalHeight())
          };
          delete payload.pageCuts;
          payload.savedAt = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
          const text = JSON.stringify(payload,null,2);
          try { await navigator.clipboard.writeText(text); } catch(_e) { window.prompt('Copy mobile layout:',text); }
        },70);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,160),{once:true});
  else setTimeout(start,160);
})();
