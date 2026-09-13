(function(){
  if (window.innerWidth > 700) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mobileEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v1';
  const dirs = ['nw','n','ne','e','se','s','sw','w'];
  const configs = [
    {key:'logo',label:'LOGO',selector:'.landing-logo',minW:90,minH:28,scaleContent:true},
    {key:'navLinks',label:'NAV LINKS',selector:'.landing-links',minW:120,minH:30},
    {key:'navActions',label:'NAV ACTIONS',selector:'.landing-nav-actions',minW:150,minH:36,scaleContent:true},
    {key:'heroPill',label:'LIVE PILL',selector:'.hero-pill',minW:180,minH:34},
    {key:'heroTitle',label:'HERO TITLE',selector:'.hero-left h1',minW:220,minH:120},
    {key:'heroCopy',label:'HERO TEXT',selector:'.hero-left > p',minW:220,minH:90},
    {key:'heroActions',label:'HERO BUTTONS',selector:'.hero-actions',minW:220,minH:50},
    {key:'heroBadges',label:'HERO BADGES',selector:'.hero-badges',minW:220,minH:40},
    {key:'heroImage',label:'HERO IMAGE',selector:'.hero-right',minW:220,minH:140},
    {key:'trustCard',label:'TRUST CARD',selector:'.trust-card',minW:240,minH:220},
    {key:'heroStats',label:'STATS / RISK',selector:'.hero-stats',minW:240,minH:220},
    {key:'footer',label:'MOBILE FOOTER',selector:'.mobile-footer',minW:220,minH:44}
  ];

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_e) {}
  const states = new Map();

  function setImportant(el,prop,val){ el.style.setProperty(prop,val,'important'); }
  function readTransform(el){
    const t = getComputedStyle(el).transform;
    if(!t || t==='none') return {x:0,y:0};
    try{ const m = new DOMMatrixReadOnly(t); return {x:m.m41||0,y:m.m42||0}; }catch(_e){ return {x:0,y:0}; }
  }
  function applySpecialContent(el,state){
    if(state.key==='logo'){
      const scale=Math.max(.55,Math.min(2.2,state.height/state.baseHeight));
      const font=Math.max(14,state.baseFont*scale);
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'font-size',font.toFixed(1)+'px');
      setImportant(el,'line-height','1');
      setImportant(el,'gap',Math.max(4,state.baseGap*scale).toFixed(1)+'px');
      const wave=el.querySelector('.logo-wave');
      if(wave){
        const waveFont=Math.max(18,state.baseWaveFont*scale);
        setImportant(wave,'font-size',waveFont.toFixed(1)+'px');
        setImportant(wave,'line-height','1');
      }
    }
    if(state.key==='navActions'){
      const scale=Math.max(.65,Math.min(1.8,state.height/state.baseHeight));
      setImportant(el,'display','grid');
      setImportant(el,'grid-template-columns','minmax(52px,.8fr) minmax(64px,1fr) minmax(82px,1.15fr)');
      setImportant(el,'align-items','stretch');
      setImportant(el,'gap',Math.max(4,state.baseGap*scale).toFixed(1)+'px');
      Array.from(el.children).forEach(child=>{
        if(!(child instanceof HTMLElement)) return;
        if(child.classList.contains('mobile-layout-edit-label')||child.classList.contains('mobile-layout-edit-handle')) return;
        setImportant(child,'height','100%');
        setImportant(child,'min-height','0');
        setImportant(child,'max-height','none');
        if(child.matches('button,select')) setImportant(child,'font-size',Math.max(10,state.baseChildFont*scale).toFixed(1)+'px');
      });
    }
  }
  function applyBox(el,state){
    setImportant(el,'box-sizing','border-box');
    setImportant(el,'width',Math.round(state.width)+'px');
    setImportant(el,'height',Math.round(state.height)+'px');
    setImportant(el,'max-width','none');
    setImportant(el,'min-width','0');
    setImportant(el,'min-height','0');
    setImportant(el,'translate','0 0');
    setImportant(el,'transform','translate3d('+Math.round(state.x)+'px,'+Math.round(state.y)+'px,0)');
    setImportant(el,'overflow','visible');
    setImportant(el,'position','relative');
    applySpecialContent(el,state);
  }

  const style=document.createElement('style');
  style.id='mobileLandingEditorStyle';
  style.textContent=`
    html.mobile-layout-editing,html.mobile-layout-editing body,#landingPage{overflow-x:visible!important}
    .mobile-layout-edit-target{touch-action:none!important;overflow:visible!important;outline:none!important;}
    .mobile-layout-edit-target::after{content:"";position:absolute!important;inset:-3px!important;border:2px dashed #49a4ff!important;border-radius:8px!important;opacity:0!important;pointer-events:none!important;z-index:2147483000!important;transition:opacity .12s ease!important;}
    .mobile-layout-edit-target:hover::after,.mobile-layout-edit-target.mobile-layout-edit-active::after{opacity:1!important;}
    .mobile-layout-edit-label,.mobile-layout-edit-handle{opacity:0!important;pointer-events:none!important;transition:opacity .12s ease!important;}
    .mobile-layout-edit-target:hover>.mobile-layout-edit-label,.mobile-layout-edit-target:hover>.mobile-layout-edit-handle,.mobile-layout-edit-target.mobile-layout-edit-active>.mobile-layout-edit-label,.mobile-layout-edit-target.mobile-layout-edit-active>.mobile-layout-edit-handle{opacity:1!important;pointer-events:auto!important;}
    .mobile-layout-edit-label{position:absolute!important;left:8px!important;top:8px!important;z-index:2147483645!important;padding:4px 7px!important;border:1px solid #7cc0ff!important;border-radius:6px!important;background:#061425!important;color:#eaf4ff!important;font:700 10px/1.2 Arial,sans-serif!important;cursor:move!important;user-select:none!important;touch-action:none!important}
    .mobile-layout-edit-handle{position:absolute!important;z-index:2147483646!important;width:18px!important;height:18px!important;border-radius:5px!important;border:2px solid #fff!important;background:#3b82f6!important;box-sizing:border-box!important;touch-action:none!important}
    .mobile-layout-edit-handle[data-dir="nw"]{left:-9px!important;top:-9px!important;cursor:nwse-resize!important}
    .mobile-layout-edit-handle[data-dir="n"]{left:50%!important;top:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .mobile-layout-edit-handle[data-dir="ne"]{right:-9px!important;top:-9px!important;cursor:nesw-resize!important}
    .mobile-layout-edit-handle[data-dir="e"]{right:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .mobile-layout-edit-handle[data-dir="se"]{right:-9px!important;bottom:-9px!important;cursor:nwse-resize!important}
    .mobile-layout-edit-handle[data-dir="s"]{left:50%!important;bottom:-9px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .mobile-layout-edit-handle[data-dir="sw"]{left:-9px!important;bottom:-9px!important;cursor:nesw-resize!important}
    .mobile-layout-edit-handle[data-dir="w"]{left:-9px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #mobileLandingEditorToolbar{position:fixed!important;right:12px!important;bottom:12px!important;z-index:2147483647!important;display:flex!important;gap:8px!important;padding:8px!important;border:1px solid #2d65a4!important;border-radius:12px!important;background:#061425!important;box-shadow:0 8px 28px rgba(0,0,0,.55)!important}
    #mobileLandingEditorToolbar button{padding:9px 12px!important;border-radius:8px!important;border:1px solid #3979bf!important;background:#0b2440!important;color:#fff!important;font-weight:800!important;font-size:11px!important}
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('mobile-layout-editing');

  function init(config){
    const el=document.querySelector(config.selector);
    if(!el || states.has(el)) return;
    const rect=el.getBoundingClientRect();
    const css=getComputedStyle(el);
    const current=readTransform(el);
    const restored=saved?.items?.[config.key];
    const firstControl=el.querySelector('button,select');
    const state={
      key:config.key,minW:config.minW,minH:config.minH,
      x:Number.isFinite(Number(restored?.x))?Number(restored.x):current.x,
      y:Number.isFinite(Number(restored?.y))?Number(restored.y):current.y,
      width:Number.isFinite(Number(restored?.width))?Number(restored.width):rect.width,
      height:Number.isFinite(Number(restored?.height))?Number(restored.height):rect.height,
      baseHeight:Math.max(1,rect.height),
      baseFont:parseFloat(css.fontSize)||28,
      baseGap:parseFloat(css.gap)||8,
      baseWaveFont:parseFloat(getComputedStyle(el.querySelector('.logo-wave')||el).fontSize)||30,
      baseChildFont:firstControl?(parseFloat(getComputedStyle(firstControl).fontSize)||14):14
    };
    states.set(el,state);
    el.classList.add('mobile-layout-edit-target');
    applyBox(el,state);
    const label=document.createElement('span');
    label.className='mobile-layout-edit-label';
    label.textContent=config.label;
    el.appendChild(label);
    dirs.forEach(dir=>{const h=document.createElement('span');h.className='mobile-layout-edit-handle';h.dataset.dir=dir;el.appendChild(h);});
  }
  configs.forEach(init);

  function beginSession(el,onMove){
    el.classList.add('mobile-layout-edit-active');
    const move=e=>{e.preventDefault();onMove(e)};
    const end=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);el.classList.remove('mobile-layout-edit-active')};
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
  }
  function moveStart(e,el,state){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const sx=e.clientX,sy=e.clientY,start={...state};
    beginSession(el,me=>{state.x=start.x+(me.clientX-sx);state.y=start.y+(me.clientY-sy);applyBox(el,state)});
  }
  function resizeStart(e,el,state,dir){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const sx=e.clientX,sy=e.clientY,start={...state};
    beginSession(el,me=>{
      const dx=me.clientX-sx,dy=me.clientY-sy;
      let x=start.x,y=start.y,w=start.width,h=start.height;
      if(dir.includes('e')) w=Math.max(state.minW,start.width+dx);
      if(dir.includes('s')) h=Math.max(state.minH,start.height+dy);
      if(dir.includes('w')){const nw=Math.max(state.minW,start.width-dx);x=start.x+(start.width-nw);w=nw;}
      if(dir.includes('n')){const nh=Math.max(state.minH,start.height-dy);y=start.y+(start.height-nh);h=nh;}
      Object.assign(state,{x,y,width:w,height:h});applyBox(el,state);
    });
  }

  document.addEventListener('pointerdown',e=>{
    const el=e.target.closest?.('.mobile-layout-edit-target');
    if(!el || !states.has(el)) return;
    const state=states.get(el);
    const h=e.target.closest?.('.mobile-layout-edit-handle');
    if(h) return resizeStart(e,el,state,h.dataset.dir||'se');
    if(e.target.closest?.('.mobile-layout-edit-label')) return moveStart(e,el,state);
    if(e.target.closest?.('button,input,select,textarea,a')) return;
    return moveStart(e,el,state);
  },true);

  const toolbar=document.createElement('div');
  toolbar.id='mobileLandingEditorToolbar';
  toolbar.innerHTML='<button id="mobileLandingSave" type="button">SAVE LAYOUT</button><button id="mobileLandingReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);
  document.getElementById('mobileLandingSave')?.addEventListener('click',async()=>{
    const items={};
    configs.forEach(c=>{const el=document.querySelector(c.selector);const s=el?states.get(el):null;if(s)items[c.key]={x:Math.round(s.x),y:Math.round(s.y),width:Math.round(s.width),height:Math.round(s.height)}});
    const payload={version:2,scope:'mobile-only',viewport:{width:window.innerWidth,height:window.innerHeight},savedAt:new Date().toISOString(),items};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
    const text=JSON.stringify(payload,null,2);
    try{await navigator.clipboard.writeText(text)}catch(_e){window.prompt('Copy mobile layout:',text)}
  });
  document.getElementById('mobileLandingReset')?.addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);location.reload()});
})();