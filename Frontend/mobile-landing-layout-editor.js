(function(){
  if (window.innerWidth > 700) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mobileEdit') !== '1') return;

  const STORAGE_KEY = 'nathauxfx_mobile_landing_layout_v2';
  const dirs = ['nw','n','ne','e','se','s','sw','w'];

  function prepareTitleLines(){
    const h1 = document.querySelector('.hero-left h1');
    if (!h1 || h1.querySelector('.mobile-title-line-1')) return;
    const second = h1.querySelector('span');
    const secondText = second?.textContent?.trim() || 'Stronger Trades.';
    h1.innerHTML = '';
    const firstLine = document.createElement('span');
    firstLine.className = 'mobile-title-line mobile-title-line-1';
    firstLine.textContent = 'Smarter Signals.';
    const secondLine = document.createElement('span');
    secondLine.className = 'mobile-title-line mobile-title-line-2';
    secondLine.textContent = secondText;
    h1.append(firstLine, secondLine);
  }
  prepareTitleLines();

  const configs = [
    {key:'logo',label:'NATHAUXFX',selector:'.landing-logo',minW:60,minH:26,scaleText:true,logo:true},
    {key:'navLinks',label:'CONTACT / SUPPORT / FACEBOOK',selector:'.landing-links',minW:90,minH:22,scaleText:true},
    {key:'navActions',label:'TOP BUTTONS',selector:'.landing-nav-actions',minW:110,minH:34,navActions:true},
    {key:'heroPill',label:'LIVE PILL',selector:'.hero-pill',minW:100,minH:24,scaleText:true},
    {key:'heroTitleTop',label:'SMARTER SIGNALS',selector:'.mobile-title-line-1',minW:90,minH:36,scaleText:true,titleLine:true},
    {key:'heroTitleBottom',label:'STRONGER TRADES',selector:'.mobile-title-line-2',minW:90,minH:36,scaleText:true,titleLine:true},
    {key:'heroCopy',label:'HERO TEXT',selector:'.hero-left > p',minW:100,minH:44,scaleText:true},
    {key:'heroActions',label:'HERO BUTTONS',selector:'.hero-actions',minW:100,minH:40},
    {key:'heroBadges',label:'HERO BADGES',selector:'.hero-badges',minW:100,minH:30,scaleText:true},
    {key:'heroImage',label:'MOCKUP',selector:'.hero-right',minW:80,minH:60,imageBox:true},

    /* Trust card: edit the text itself, not the whole card. */
    {key:'trustTitle',label:'TRUST TITLE',selector:'.trust-card > h2',minW:90,minH:28,scaleText:true,textBox:true},
    {key:'trustText1',label:'TRUST TEXT 1',selector:'.trust-card > p:nth-of-type(1)',minW:100,minH:36,scaleText:true,textBox:true},
    {key:'trustText2',label:'TRUST TEXT 2',selector:'.trust-card > p:nth-of-type(2)',minW:100,minH:36,scaleText:true,textBox:true},
    {key:'trustPoint1Title',label:'POINT 1 TITLE',selector:'.trust-points > .trust-point:nth-child(1) > strong',minW:70,minH:22,scaleText:true,textBox:true},
    {key:'trustPoint1Text',label:'POINT 1 TEXT',selector:'.trust-points > .trust-point:nth-child(1) > span',minW:70,minH:30,scaleText:true,textBox:true},
    {key:'trustPoint2Title',label:'POINT 2 TITLE',selector:'.trust-points > .trust-point:nth-child(2) > strong',minW:70,minH:22,scaleText:true,textBox:true},
    {key:'trustPoint2Text',label:'POINT 2 TEXT',selector:'.trust-points > .trust-point:nth-child(2) > span',minW:70,minH:30,scaleText:true,textBox:true},
    {key:'trustPoint3Title',label:'POINT 3 TITLE',selector:'.trust-points > .trust-point:nth-child(3) > strong',minW:70,minH:22,scaleText:true,textBox:true},
    {key:'trustPoint3Text',label:'POINT 3 TEXT',selector:'.trust-points > .trust-point:nth-child(3) > span',minW:70,minH:30,scaleText:true,textBox:true},
    {key:'trustPoint4Title',label:'POINT 4 TITLE',selector:'.trust-points > .trust-point:nth-child(4) > strong',minW:70,minH:22,scaleText:true,textBox:true},
    {key:'trustPoint4Text',label:'POINT 4 TEXT',selector:'.trust-points > .trust-point:nth-child(4) > span',minW:70,minH:30,scaleText:true,textBox:true},

    /* Stats/risk card: every text block is independent too. */
    {key:'stat1Title',label:'BROKER TITLE',selector:'.hero-stats > div:nth-of-type(1) > strong',minW:60,minH:22,scaleText:true,textBox:true},
    {key:'stat1Text',label:'BROKER TEXT',selector:'.hero-stats > div:nth-of-type(1) > span',minW:70,minH:28,scaleText:true,textBox:true},
    {key:'stat2Title',label:'CTRADER TITLE',selector:'.hero-stats > div:nth-of-type(2) > strong',minW:60,minH:22,scaleText:true,textBox:true},
    {key:'stat2Text',label:'CTRADER TEXT',selector:'.hero-stats > div:nth-of-type(2) > span',minW:70,minH:28,scaleText:true,textBox:true},
    {key:'stat3Title',label:'EMAIL TITLE',selector:'.hero-stats > div:nth-of-type(3) > strong',minW:60,minH:22,scaleText:true,textBox:true},
    {key:'stat3Text',label:'EMAIL TEXT',selector:'.hero-stats > div:nth-of-type(3) > span',minW:70,minH:28,scaleText:true,textBox:true},
    {key:'stat4Title',label:'RISK TITLE',selector:'.hero-stats > div:nth-of-type(4) > strong',minW:60,minH:22,scaleText:true,textBox:true},
    {key:'stat4Text',label:'RISK TEXT',selector:'.hero-stats > div:nth-of-type(4) > span',minW:70,minH:28,scaleText:true,textBox:true},
    {key:'riskNote',label:'RISK NOTE',selector:'.hero-stats > .risk-note',minW:100,minH:36,scaleText:true,textBox:true},
    {key:'legalLinks',label:'LEGAL LINKS',selector:'.hero-stats > .legal-links',minW:100,minH:28,scaleText:true,textBox:true},

    {key:'footer',label:'MOBILE FOOTER',selector:'.mobile-footer',minW:90,minH:28,scaleText:true}
  ];

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_e) {}
  const states = new Map();
  let selected = null;

  function setImportant(el, prop, val){ el.style.setProperty(prop, val, 'important'); }
  function readTransform(el){
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return {x:0,y:0};
    try { const m = new DOMMatrixReadOnly(t); return {x:m.m41||0,y:m.m42||0}; }
    catch(_e){ return {x:0,y:0}; }
  }

  function applySpecial(el,state){
    if (state.scaleText){
      const ratioW = state.width / state.baseWidth;
      const ratioH = state.height / state.baseHeight;
      const ratio = Math.max(.28, Math.min(2.8, Math.min(ratioW, ratioH)));
      setImportant(el,'font-size',Math.max(9,state.baseFont*ratio).toFixed(1)+'px');
      setImportant(el,'line-height', state.titleLine ? '.92' : '1.15');
      if (state.titleLine) {
        setImportant(el,'letter-spacing','-0.04em');
        setImportant(el,'display','block');
        setImportant(el,'white-space','nowrap');
        setImportant(el,'z-index','50');
      }
    }
    if (state.textBox){
      setImportant(el,'display','block');
      setImportant(el,'white-space','normal');
      setImportant(el,'z-index','60');
    }
    if (state.logo){
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'white-space','nowrap');
      const wave = el.querySelector('.logo-wave');
      if (wave) setImportant(wave,'font-size','1.05em');
    }
    if (state.navActions){
      setImportant(el,'display','flex');
      setImportant(el,'flex-direction','row');
      setImportant(el,'flex-wrap','nowrap');
      setImportant(el,'align-items','stretch');
      setImportant(el,'gap','6px');
      Array.from(el.children).forEach(child=>{
        if (!(child instanceof HTMLElement)) return;
        if (child.classList.contains('mobile-layout-edit-label') || child.classList.contains('mobile-layout-edit-handle')) return;
        setImportant(child,'height','100%');
        setImportant(child,'min-height','0');
        setImportant(child,'min-width','0');
        setImportant(child,'margin','0');
        setImportant(child,'flex','1 1 0');
      });
    }
    if (state.imageBox){
      const img = el.querySelector('.hero-dashboard-img');
      if (img){
        setImportant(el,'position','relative');
        setImportant(img,'display','block');
        setImportant(img,'position','absolute');
        setImportant(img,'inset','0');
        setImportant(img,'width','100%');
        setImportant(img,'height','100%');
        setImportant(img,'max-width','none');
        setImportant(img,'max-height','none');
        setImportant(img,'object-fit','contain');
        setImportant(img,'object-position','center');
        setImportant(img,'transform','none');
        setImportant(img,'margin','0');
        setImportant(img,'pointer-events','none');
      }
      setImportant(el,'z-index','20');
    }
  }

  function applyBox(el,state){
    setImportant(el,'box-sizing','border-box');
    setImportant(el,'width',Math.round(state.width)+'px');
    setImportant(el,'height',Math.round(state.height)+'px');
    setImportant(el,'max-width','none');
    setImportant(el,'max-height','none');
    setImportant(el,'min-width','0');
    setImportant(el,'min-height','0');
    setImportant(el,'flex','0 0 auto');
    setImportant(el,'justify-self','start');
    setImportant(el,'align-self','start');
    setImportant(el,'translate','0 0');
    setImportant(el,'transform','translate3d('+Math.round(state.x)+'px,'+Math.round(state.y)+'px,0)');
    setImportant(el,'transform-origin','top left');
    setImportant(el,'will-change','transform,width,height');
    setImportant(el,'overflow','visible');
    setImportant(el,'position','relative');
    applySpecial(el,state);
    void el.offsetWidth;
  }

  const style = document.createElement('style');
  style.id = 'mobileLandingEditorStyle';
  style.textContent = `
    html.mobile-layout-editing,html.mobile-layout-editing body,#landingPage{overflow-x:visible!important}
    html.mobile-layout-editing .landing-nav,html.mobile-layout-editing .hero-section,html.mobile-layout-editing .hero-left,html.mobile-layout-editing .hero-right{overflow:visible!important}
    html.mobile-layout-editing .hero-left{position:relative!important;z-index:30!important}
    html.mobile-layout-editing .hero-right{position:relative!important;z-index:20!important}
    html.mobile-layout-editing .hero-left h1{overflow:visible!important;position:relative!important;z-index:40!important}
    .mobile-title-line{position:relative!important;display:block!important}
    .mobile-title-line-1{color:inherit!important}
    .mobile-layout-edit-target{touch-action:none!important;overflow:visible!important;cursor:move!important;outline:2px dashed transparent!important;outline-offset:3px!important}
    .mobile-layout-edit-target *{user-select:none!important;-webkit-user-select:none!important}
    .mobile-layout-edit-target:hover,.mobile-layout-edit-target.mobile-layout-edit-active,.mobile-layout-edit-target.mobile-layout-edit-selected{outline-color:#49a4ff!important}
    .mobile-layout-edit-label,.mobile-layout-edit-handle{opacity:0!important;pointer-events:none!important}
    .mobile-layout-edit-target:hover>.mobile-layout-edit-label,.mobile-layout-edit-target:hover>.mobile-layout-edit-handle,.mobile-layout-edit-target.mobile-layout-edit-active>.mobile-layout-edit-label,.mobile-layout-edit-target.mobile-layout-edit-active>.mobile-layout-edit-handle,.mobile-layout-edit-target.mobile-layout-edit-selected>.mobile-layout-edit-label,.mobile-layout-edit-target.mobile-layout-edit-selected>.mobile-layout-edit-handle{opacity:1!important;pointer-events:auto!important}
    .mobile-layout-edit-label{position:absolute!important;left:7px!important;top:7px!important;z-index:2147483645!important;padding:4px 7px!important;border:1px solid #7cc0ff!important;border-radius:6px!important;background:#061425!important;color:#eaf4ff!important;font:700 10px/1.2 Arial,sans-serif!important;cursor:move!important;touch-action:none!important}
    .mobile-layout-edit-handle{position:absolute!important;z-index:2147483646!important;width:22px!important;height:22px!important;border-radius:6px!important;border:2px solid #fff!important;background:#3b82f6!important;box-sizing:border-box!important;touch-action:none!important}
    .mobile-layout-edit-handle[data-dir="nw"]{left:-11px!important;top:-11px!important;cursor:nwse-resize!important}
    .mobile-layout-edit-handle[data-dir="n"]{left:50%!important;top:-11px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .mobile-layout-edit-handle[data-dir="ne"]{right:-11px!important;top:-11px!important;cursor:nesw-resize!important}
    .mobile-layout-edit-handle[data-dir="e"]{right:-11px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    .mobile-layout-edit-handle[data-dir="se"]{right:-11px!important;bottom:-11px!important;cursor:nwse-resize!important}
    .mobile-layout-edit-handle[data-dir="s"]{left:50%!important;bottom:-11px!important;transform:translateX(-50%)!important;cursor:ns-resize!important}
    .mobile-layout-edit-handle[data-dir="sw"]{left:-11px!important;bottom:-11px!important;cursor:nesw-resize!important}
    .mobile-layout-edit-handle[data-dir="w"]{left:-11px!important;top:50%!important;transform:translateY(-50%)!important;cursor:ew-resize!important}
    #mobileLandingEditorToolbar{position:fixed!important;right:10px!important;bottom:10px!important;z-index:2147483647!important;display:flex!important;gap:7px!important;padding:7px!important;border:1px solid #2d65a4!important;border-radius:12px!important;background:#061425!important;box-shadow:0 8px 28px rgba(0,0,0,.55)!important}
    #mobileLandingEditorToolbar button{padding:9px 11px!important;border-radius:8px!important;border:1px solid #3979bf!important;background:#0b2440!important;color:#fff!important;font-weight:800!important;font-size:11px!important}
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('mobile-layout-editing');

  function selectTarget(el){
    if (selected && selected !== el) selected.classList.remove('mobile-layout-edit-selected');
    selected = el || null;
    if (selected) selected.classList.add('mobile-layout-edit-selected');
  }

  function init(config){
    const el = document.querySelector(config.selector);
    if (!el || states.has(el)) return;
    const rect = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    const current = readTransform(el);
    const restored = saved?.items?.[config.key];
    const useSaved = Number.isFinite(Number(restored?.width)) && Number(restored.width) > 0;
    const state = {
      key:config.key,minW:config.minW,minH:config.minH,
      scaleText:!!config.scaleText,logo:!!config.logo,navActions:!!config.navActions,titleLine:!!config.titleLine,imageBox:!!config.imageBox,textBox:!!config.textBox,
      x:useSaved?Number(restored.x||0):current.x,
      y:useSaved?Number(restored.y||0):current.y,
      width:useSaved?Number(restored.width):Math.max(1,rect.width),
      height:useSaved?Number(restored.height):Math.max(1,rect.height),
      baseWidth:Math.max(1,useSaved?Number(restored.width):rect.width),
      baseHeight:Math.max(1,useSaved?Number(restored.height):rect.height),
      baseFont:useSaved&&Number.isFinite(Number(restored?.fontSize))?Number(restored.fontSize):(parseFloat(css.fontSize)||16)
    };
    states.set(el,state);
    el.classList.add('mobile-layout-edit-target');
    applyBox(el,state);
    const label = document.createElement('span');
    label.className = 'mobile-layout-edit-label';
    label.textContent = config.label;
    el.appendChild(label);
    dirs.forEach(dir=>{
      const h = document.createElement('span');
      h.className = 'mobile-layout-edit-handle';
      h.dataset.dir = dir;
      el.appendChild(h);
    });
  }
  configs.forEach(init);

  function beginSession(el,onMove){
    selectTarget(el);
    el.classList.add('mobile-layout-edit-active');
    const move = e=>{ e.preventDefault(); onMove(e); };
    const end = ()=>{
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',end,true);
      window.removeEventListener('pointercancel',end,true);
      el.classList.remove('mobile-layout-edit-active');
      void el.offsetWidth;
    };
    window.addEventListener('pointermove',move,true);
    window.addEventListener('pointerup',end,true);
    window.addEventListener('pointercancel',end,true);
  }
  function moveStart(e,el,state){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const sx=e.clientX,sy=e.clientY,start={...state};
    beginSession(el,me=>{
      state.x=start.x+(me.clientX-sx);
      state.y=start.y+(me.clientY-sy);
      applyBox(el,state);
    });
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
      Object.assign(state,{x,y,width:w,height:h});
      applyBox(el,state);
    });
  }

  document.addEventListener('pointerdown',e=>{
    if (e.target.closest?.('#mobileLandingEditorToolbar')) return;
    const h = e.target.closest?.('.mobile-layout-edit-handle');
    const el = e.target.closest?.('.mobile-layout-edit-target');
    if (!el || !states.has(el)) { selectTarget(null); return; }
    const state = states.get(el);
    selectTarget(el);
    if (h) return resizeStart(e,el,state,h.dataset.dir||'se');
    return moveStart(e,el,state);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.mobile-layout-edit-target')&&!e.target.closest?.('#mobileLandingEditorToolbar')){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    }
  },true);

  const toolbar = document.createElement('div');
  toolbar.id = 'mobileLandingEditorToolbar';
  toolbar.innerHTML = '<button id="mobileLandingSave" type="button">SAVE LAYOUT</button><button id="mobileLandingReset" type="button">RESET</button>';
  document.body.appendChild(toolbar);

  document.getElementById('mobileLandingSave')?.addEventListener('click',async()=>{
    const items={};
    configs.forEach(c=>{
      const el=document.querySelector(c.selector);
      const s=el?states.get(el):null;
      if(!s) return;
      const css=getComputedStyle(el);
      items[c.key]={
        x:Math.round(s.x),
        y:Math.round(s.y),
        width:Math.round(s.width),
        height:Math.round(s.height)
      };
      if(c.scaleText){
        items[c.key].fontSize=parseFloat(css.fontSize)||s.baseFont;
        items[c.key].lineHeight=css.lineHeight;
        items[c.key].letterSpacing=css.letterSpacing;
        items[c.key].whiteSpace=css.whiteSpace;
      }
    });
    const payload={version:9,scope:'mobile-only-text-editor',viewport:{width:window.innerWidth,height:window.innerHeight},savedAt:new Date().toISOString(),items};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
    const text=JSON.stringify(payload,null,2);
    try{await navigator.clipboard.writeText(text)}catch(_e){window.prompt('Copy mobile layout:',text)}
  });

  document.getElementById('mobileLandingReset')?.addEventListener('click',()=>{
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
})();