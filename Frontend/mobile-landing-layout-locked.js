(function(){
  if (window.innerWidth > 700) return;

  function setImportant(el, prop, value){ el.style.setProperty(prop, value, 'important'); }

  function prepareTitleLines(){
    const h1 = document.querySelector('.hero-left h1');
    if (!h1) return;
    if (!h1.querySelector('.mobile-title-line-1')) {
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
  }

  prepareTitleLines();

  const locked = [
    { key:'logo', selector:'.landing-logo', x:-15, y:25, width:188, height:59, scaleText:true, logo:true },
    { key:'navLinks', selector:'.landing-links', x:8, y:10, width:361, height:22, scaleText:true },
    { key:'navActions', selector:'.landing-nav-actions', x:36, y:4, width:337, height:44, navActions:true },
    { key:'heroPill', selector:'.hero-pill', x:-4, y:-92, width:317, height:54, scaleText:true },
    { key:'heroTitleTop', selector:'.mobile-title-line-1', x:0, y:-106, width:170, height:81, scaleText:true, titleLine:true },
    { key:'heroTitleBottom', selector:'.mobile-title-line-2', x:2, y:-146, width:133, height:65, scaleText:true, titleLine:true },

    { key:'heroCopy', selector:'.hero-left > p', x:-3, y:-105, width:381, height:130, scaleText:true, baseWidth:381, baseHeight:130, baseFont:16 },
    { key:'heroActions', selector:'.hero-actions', x:-8, y:-166, width:369, height:118 },
    { key:'heroBadges', selector:'.hero-badges', x:-6, y:-505, width:372, height:105, scaleText:true, baseWidth:372, baseHeight:105, baseFont:16 },
    { key:'heroImage', selector:'.hero-right', x:113, y:-719, width:256, height:180, imageBox:true },

    /* Approved card text layout from version 9 save / 500px viewport. */
    { key:'trustTitle', selector:'.trust-card > h2', x:-30, y:-599, width:304, height:42, exactText:true, fontSize:18.2, lineHeight:'20.93px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustText1', selector:'.trust-card > p:nth-of-type(1)', x:-71, y:-625, width:378, height:111, exactText:true, fontSize:13.5, lineHeight:'15.525px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustText2', selector:'.trust-card > p:nth-of-type(2)', x:-71, y:-677, width:373, height:120, exactText:true, fontSize:14.5, lineHeight:'16.675px', letterSpacing:'normal', whiteSpace:'normal' },

    { key:'trustPoint1Title', selector:'.trust-points > .trust-point:nth-child(1) > strong', x:-132, y:-729, width:270, height:22, exactText:true, fontSize:13, lineHeight:'14.95px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint1Text', selector:'.trust-points > .trust-point:nth-child(1) > span', x:-80, y:-733, width:150, height:32, exactText:true, fontSize:9, lineHeight:'10.35px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint2Title', selector:'.trust-points > .trust-point:nth-child(2) > strong', x:78, y:-833, width:259, height:43, exactText:true, fontSize:12.5, lineHeight:'14.375px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint2Text', selector:'.trust-points > .trust-point:nth-child(2) > span', x:87, y:-861, width:205, height:32, exactText:true, fontSize:10.4, lineHeight:'11.96px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint3Title', selector:'.trust-points > .trust-point:nth-child(3) > strong', x:-131, y:-903, width:261, height:22, exactText:true, fontSize:12.6, lineHeight:'14.49px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint3Text', selector:'.trust-points > .trust-point:nth-child(3) > span', x:-96, y:-909, width:181, height:30, exactText:true, fontSize:9, lineHeight:'10.35px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint4Title', selector:'.trust-points > .trust-point:nth-child(4) > strong', x:66, y:-1006, width:280, height:22, exactText:true, fontSize:13.5, lineHeight:'15.525px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'trustPoint4Text', selector:'.trust-points > .trust-point:nth-child(4) > span', x:92, y:-1010, width:197, height:30, exactText:true, fontSize:9, lineHeight:'10.35px', letterSpacing:'normal', whiteSpace:'normal' },

    { key:'stat1Title', selector:'.hero-stats > div:nth-of-type(1) > strong', x:-70, y:-1078, width:156, height:27, exactText:true, fontSize:23.4, lineHeight:'26.91px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat1Text', selector:'.hero-stats > div:nth-of-type(1) > span', x:-80, y:-1083, width:184, height:28, exactText:true, fontSize:11, lineHeight:'12.65px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat2Title', selector:'.hero-stats > div:nth-of-type(2) > strong', x:193, y:-1166, width:104, height:48, exactText:true, fontSize:28.8, lineHeight:'33.12px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat2Text', selector:'.hero-stats > div:nth-of-type(2) > span', x:137, y:-1182, width:164, height:28, exactText:true, fontSize:11.5, lineHeight:'13.225px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat3Title', selector:'.hero-stats > div:nth-of-type(3) > strong', x:-59, y:-1192, width:82, height:49, exactText:true, fontSize:30.8, lineHeight:'35.42px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat3Text', selector:'.hero-stats > div:nth-of-type(3) > span', x:-64, y:-1210, width:153, height:29, exactText:true, fontSize:13.9, lineHeight:'15.985px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat4Title', selector:'.hero-stats > div:nth-of-type(4) > strong', x:195, y:-1288, width:93, height:40, exactText:true, fontSize:34.2, lineHeight:'39.33px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'stat4Text', selector:'.hero-stats > div:nth-of-type(4) > span', x:135, y:-1295, width:176, height:28, exactText:true, fontSize:12.4, lineHeight:'14.26px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'riskNote', selector:'.hero-stats > .risk-note', x:-67, y:-1315, width:420, height:110, exactText:true, fontSize:14.6, lineHeight:'16.79px', letterSpacing:'normal', whiteSpace:'normal' },
    { key:'legalLinks', selector:'.hero-stats > .legal-links', x:-63, y:-1350, width:364, height:37, exactText:true, fontSize:11.1, lineHeight:'12.765px', letterSpacing:'normal', whiteSpace:'normal' }
  ];

  const editorProps = [
    'box-sizing','width','height','max-width','max-height','min-width','min-height',
    'flex','justify-self','align-self','translate','transform','transform-origin',
    'will-change','overflow','position','font-size','line-height','letter-spacing',
    'display','white-space','z-index','align-items','justify-content','text-align',
    'flex-direction','flex-wrap','gap','margin'
  ];

  function stripEditorState(el, state){
    el.classList.remove('mobile-layout-edit-target','mobile-layout-edit-active','mobile-layout-edit-selected');
    el.querySelectorAll(':scope > .mobile-layout-edit-label, :scope > .mobile-layout-edit-handle').forEach(node=>node.remove());
    editorProps.forEach(prop=>{
      if (state.exactText && prop === 'margin') return;
      el.style.removeProperty(prop);
    });

    if (state.logo) {
      const wave = el.querySelector('.logo-wave');
      if (wave) wave.style.removeProperty('font-size');
    }

    if (state.navActions) {
      Array.from(el.children).forEach(child=>{
        if (!(child instanceof HTMLElement)) return;
        ['height','min-height','min-width','margin','flex','box-sizing'].forEach(prop=>child.style.removeProperty(prop));
      });
    }

    if (state.titleLine) {
      setImportant(el,'display','block');
      setImportant(el,'position','relative');
    }
  }

  function applySpecial(el,state){
    if (state.exactText) {
      setImportant(el,'font-size',state.fontSize+'px');
      setImportant(el,'line-height',state.lineHeight);
      setImportant(el,'letter-spacing',state.letterSpacing);
      setImportant(el,'white-space',state.whiteSpace);
      setImportant(el,'display','block');
      setImportant(el,'z-index','60');
    } else if (state.scaleText) {
      const ratioW = state.width / state.baseWidth;
      const ratioH = state.height / state.baseHeight;
      const ratio = Math.max(.28, Math.min(2.8, Math.min(ratioW, ratioH)));
      setImportant(el,'font-size',Math.max(9,state.baseFont*ratio).toFixed(1)+'px');
      setImportant(el,'line-height',state.titleLine ? '.92' : '1.15');
      if (state.titleLine) {
        setImportant(el,'letter-spacing','-0.04em');
        setImportant(el,'display','block');
        setImportant(el,'white-space','nowrap');
        setImportant(el,'z-index','50');
      }
    }

    if (state.logo) {
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'white-space','nowrap');
      const wave = el.querySelector('.logo-wave');
      if (wave) setImportant(wave,'font-size','1.05em');
    }

    if (state.navActions) {
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

    if (state.key === 'heroPill') {
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'justify-content','center');
      setImportant(el,'text-align','center');
    }

    if (state.imageBox) {
      const img = el.querySelector('.hero-dashboard-img');
      setImportant(el,'z-index','20');
      if (img) {
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
    setImportant(el,'overflow','visible');
    setImportant(el,'position','relative');
    applySpecial(el,state);
  }

  function apply(){
    prepareTitleLines();
    locked.forEach(item=>{
      const el = document.querySelector(item.selector);
      if (!el) return;

      stripEditorState(el,item);
      const naturalRect = el.getBoundingClientRect();
      const naturalCss = getComputedStyle(el);
      const state = {
        ...item,
        baseWidth: Number.isFinite(Number(item.baseWidth)) ? Number(item.baseWidth) : Math.max(1,naturalRect.width),
        baseHeight: Number.isFinite(Number(item.baseHeight)) ? Number(item.baseHeight) : Math.max(1,naturalRect.height),
        baseFont: Number.isFinite(Number(item.baseFont)) ? Number(item.baseFont) : (parseFloat(naturalCss.fontSize) || 16)
      };
      applyBox(el,state);
      el.style.removeProperty('cursor');
    });
  }

  apply();
  requestAnimationFrame(apply);
  window.addEventListener('load', apply, { once:true });
  setTimeout(apply,120);
})();