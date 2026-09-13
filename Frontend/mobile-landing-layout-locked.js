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

  /* Approved 393px phone layout: lock only the area inside the red box. */
  const locked = [
    { key:'logo', selector:'.landing-logo', x:-15, y:25, width:188, height:59, scaleText:true, logo:true },
    { key:'navLinks', selector:'.landing-links', x:8, y:10, width:361, height:22, scaleText:true },
    { key:'navActions', selector:'.landing-nav-actions', x:36, y:4, width:337, height:44, navActions:true },
    { key:'heroPill', selector:'.hero-pill', x:-4, y:-92, width:317, height:54, scaleText:true },
    { key:'heroTitleTop', selector:'.mobile-title-line-1', x:0, y:-106, width:170, height:81, scaleText:true, titleLine:true },
    { key:'heroTitleBottom', selector:'.mobile-title-line-2', x:2, y:-146, width:133, height:65, scaleText:true, titleLine:true }
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
    editorProps.forEach(prop=>el.style.removeProperty(prop));

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
    if (state.scaleText) {
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

      /* Rebuild the same scale calculation used while the user was editing,
         instead of guessing a font size after the layout is locked. */
      stripEditorState(el,item);
      const naturalRect = el.getBoundingClientRect();
      const naturalCss = getComputedStyle(el);
      const state = {
        ...item,
        baseWidth: Math.max(1,naturalRect.width),
        baseHeight: Math.max(1,naturalRect.height),
        baseFont: parseFloat(naturalCss.fontSize) || 16
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
