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

  /* Exact approved values from the 393px-wide phone editor save (version 8). */
  const locked = [
    { key:'logo', selector:'.landing-logo', x:0, y:0, width:177, height:42 },
    { key:'navLinks', selector:'.landing-links', x:0, y:0, width:361, height:19 },
    { key:'navActions', selector:'.landing-nav-actions', x:0, y:0, width:361, height:44 },
    { key:'heroPill', selector:'.hero-pill', x:0, y:0, width:357, height:54 },
    { key:'heroTitleTop', selector:'.mobile-title-line-1', x:0, y:0, width:357, height:126, titleLine:true },
    { key:'heroTitleBottom', selector:'.mobile-title-line-2', x:0, y:0, width:357, height:126, titleLine:true },
    { key:'heroCopy', selector:'.hero-left > p', x:-3, y:-80, width:373, height:144 },
    { key:'heroActions', selector:'.hero-actions', x:-3, y:-159, width:369, height:118 },
    { key:'heroBadges', selector:'.hero-badges', x:-5, y:-501, width:352, height:124 }
  ];

  function applyBox(el, state){
    setImportant(el,'box-sizing','border-box');
    setImportant(el,'width',state.width+'px');
    setImportant(el,'height',state.height+'px');
    setImportant(el,'max-width','none');
    setImportant(el,'max-height','none');
    setImportant(el,'min-width','0');
    setImportant(el,'min-height','0');
    setImportant(el,'translate','0 0');
    setImportant(el,'transform','translate3d('+state.x+'px,'+state.y+'px,0)');
    setImportant(el,'position','relative');
    setImportant(el,'overflow','visible');
    setImportant(el,'flex','0 0 auto');
    setImportant(el,'justify-self','start');
    setImportant(el,'align-self','start');

    /* Keep the same structural behavior the phone editor had, without
       changing the approved font sizes, button text, or content spacing. */
    if (state.key === 'logo') {
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'white-space','nowrap');
    }

    if (state.key === 'navLinks') {
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'flex-wrap','nowrap');
      setImportant(el,'justify-content','flex-start');
    }

    if (state.key === 'navActions') {
      setImportant(el,'display','flex');
      setImportant(el,'flex-direction','row');
      setImportant(el,'flex-wrap','nowrap');
      setImportant(el,'align-items','stretch');
      setImportant(el,'gap','6px');
      const children = Array.from(el.children).filter(child =>
        child instanceof HTMLElement &&
        !child.classList.contains('mobile-layout-edit-label') &&
        !child.classList.contains('mobile-layout-edit-handle')
      );
      children.forEach((child,index)=>{
        setImportant(child,'height','100%');
        setImportant(child,'min-height','0');
        setImportant(child,'min-width','0');
        setImportant(child,'margin','0');
        setImportant(child,'box-sizing','border-box');
        if (index === 0) setImportant(child,'flex','0 0 58px');
        else if (index === 1) setImportant(child,'flex','0 0 80px');
        else if (index === 2) setImportant(child,'flex','1 1 88px');
        else setImportant(child,'flex','1.2 1 108px');
      });
    }

    if (state.key === 'heroPill') {
      setImportant(el,'display','flex');
      setImportant(el,'align-items','center');
      setImportant(el,'justify-content','center');
      setImportant(el,'text-align','center');
    }

    if (state.titleLine) {
      setImportant(el,'display','block');
      setImportant(el,'white-space','nowrap');
      setImportant(el,'z-index','60');
    }
  }

  function removeEditorAccess(el){
    el.classList.remove('mobile-layout-edit-target','mobile-layout-edit-active','mobile-layout-edit-selected');
    el.style.removeProperty('cursor');
    el.querySelectorAll(':scope > .mobile-layout-edit-label, :scope > .mobile-layout-edit-handle').forEach(node=>node.remove());
  }

  function apply(){
    prepareTitleLines();
    locked.forEach(item=>{
      const el = document.querySelector(item.selector);
      if (!el) return;
      applyBox(el,item);
      removeEditorAccess(el);
    });
  }

  apply();
  requestAnimationFrame(apply);
  window.addEventListener('load', apply, { once:true });
  setTimeout(apply,120);
})();
